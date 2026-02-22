/**
 * AI Agent Fleet Dashboard — AI军团管理工作台
 *
 * 4 Tabs:
 *   1. 我的AI军团 — L1-L5 Agent卡片
 *   2. 任务执行   — 提交任务 + 结果列表 + 人审
 *   3. G-Token账本 — 余额 + 交易流水
 *   4. 配置中心   — Agent参数调整
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Users, Bot, Cpu, Coins, Settings, Zap,
  Play, Pause, CheckCircle2, XCircle, Send,
  TrendingUp, Award, Clock, BarChart3,
  Loader2, RefreshCw, Shield, Star,
  FileText, Search, AlertTriangle, Brain,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

const TASK_TYPES = [
  { value: "document_draft", label: "文档起草", icon: FileText },
  { value: "data_analysis", label: "数据分析", icon: BarChart3 },
  { value: "code_review", label: "代码审查", icon: Search },
  { value: "report_generation", label: "报告生成", icon: FileText },
  { value: "meeting_summary", label: "会议纪要", icon: Users },
  { value: "email_draft", label: "邮件草拟", icon: Send },
  { value: "risk_assessment", label: "风险评估", icon: AlertTriangle },
  { value: "quality_inspection", label: "质量检查", icon: Shield },
] as const;

const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; badge: string; solid: string }> = {
  1: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-200 text-gray-800", solid: "bg-gray-500" },
  2: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-200 text-blue-800", solid: "bg-blue-500" },
  3: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", badge: "bg-green-200 text-green-800", solid: "bg-green-500" },
  4: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", badge: "bg-purple-200 text-purple-800", solid: "bg-purple-500" },
  5: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", badge: "bg-amber-200 text-amber-800", solid: "bg-amber-500" },
};

const LEVEL_LABELS: Record<number, string> = {
  1: "初级助理", 2: "标准助理", 3: "高级助理", 4: "资深助理", 5: "专家助理",
};

const AUTONOMY_LABELS: Record<string, string> = {
  supervised: "受监督", semi_autonomous: "半自主", autonomous: "全自主",
};

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  task_reward: { label: "任务奖励", color: "text-green-600" },
  task_expense: { label: "任务消费", color: "text-red-600" },
  royalty_income: { label: "版税收入", color: "text-green-600" },
  penalty: { label: "处罚", color: "text-red-600" },
  bonus: { label: "奖金", color: "text-green-600" },
  transfer_in: { label: "转入", color: "text-blue-600" },
  transfer_out: { label: "转出", color: "text-orange-600" },
};

// ─── Helpers ────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try { return new Date(d).toISOString().slice(0, 16).replace("T", " "); } catch { return "-"; }
}

function fmtNum(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "0";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "0";
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─── Sub Components ─────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = "text-gray-800" }: {
  label: string; value: string | number; icon: any; color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#edebe9] p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} bg-opacity-10`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-[#605e5c]">{label}</div>
        <div className={`text-lg font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 1: 我的AI军团
// ═══════════════════════════════════════════════════════════

function MyFleetTab() {
  const fleet = trpc.aiAgentFleet.getMyFleet.useQuery();
  const provision = trpc.aiAgentFleet.provisionMyFleet.useMutation({
    onSuccess: (d) => {
      if (d.success) {
        toast.success(`军团部署完成：创建${d.created}个Agent，跳过${d.skipped}个`);
        fleet.refetch();
      } else {
        toast.error(d.error || "部署失败");
      }
    },
    onError: () => toast.error("部署失败"),
  });
  const activate = trpc.aiAgentFleet.activateAgent.useMutation({
    onSuccess: (d) => { if (d.success) { toast.success("Agent已激活"); fleet.refetch(); } },
  });
  const deactivate = trpc.aiAgentFleet.deactivateAgent.useMutation({
    onSuccess: (d) => { if (d.success) { toast.success("Agent已暂停"); fleet.refetch(); } },
  });

  const agents = fleet.data?.agents || [];
  const summary = fleet.data?.summary;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Agent总数" value={summary?.totalAgents || 0} icon={Bot} color="text-[#0078d4]" />
        <StatCard label="活跃Agent" value={summary?.activeCount || 0} icon={Zap} color="text-green-600" />
        <StatCard label="G-Token总额" value={fmtNum(summary?.totalBalance)} icon={Coins} color="text-amber-600" />
        <StatCard label="完成任务" value={summary?.totalTasks || 0} icon={CheckCircle2} color="text-purple-600" />
      </div>

      {/* Deploy Button */}
      {agents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-[#edebe9]">
          <Bot className="w-16 h-16 mx-auto text-[#0078d4] mb-4" />
          <h3 className="text-lg font-semibold text-[#323130] mb-2">尚未部署AI军团</h3>
          <p className="text-sm text-[#605e5c] mb-4">点击下方按钮为您创建L1-L5五个等级的AI助理军团</p>
          <button
            className="px-6 py-2.5 bg-[#0078d4] text-white rounded-md hover:bg-[#106ebe] transition-colors inline-flex items-center gap-2"
            onClick={() => provision.mutate()}
            disabled={provision.isPending}
          >
            {provision.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            部署AI军团
          </button>
        </div>
      )}

      {/* Agent Cards Grid */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {agents.map((agent: any) => {
            const lvl = agent.level || 1;
            const colors = LEVEL_COLORS[lvl] || LEVEL_COLORS[1];
            const isActive = agent.status === "active";

            return (
              <div
                key={agent.id}
                className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 transition-all hover:shadow-md relative`}
              >
                {/* Level Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                    L{lvl}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {isActive ? "活跃" : agent.status === "paused" ? "暂停" : "未激活"}
                  </span>
                </div>

                {/* Name */}
                <h4 className={`font-semibold text-sm ${colors.text} mb-1 truncate`}>{agent.agentName}</h4>
                <p className="text-[10px] text-[#605e5c] mb-3 font-mono">{agent.agentCode}</p>

                {/* Stats */}
                <div className="space-y-1.5 text-xs text-[#605e5c]">
                  <div className="flex justify-between">
                    <span>等级</span>
                    <span className="font-medium">{LEVEL_LABELS[lvl]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>自主度</span>
                    <span>{AUTONOMY_LABELS[agent.autonomyLevel] || agent.autonomyLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>信誉分</span>
                    <span className="font-medium">{fmtNum(agent.reputationScore)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>G-Token</span>
                    <span className="font-bold text-amber-600">{fmtNum(agent.gTokenBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>完成任务</span>
                    <span>{agent.taskCompletionCount || 0}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  {isActive ? (
                    <button
                      className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 inline-flex items-center justify-center gap-1"
                      onClick={() => deactivate.mutate({ agentId: agent.id })}
                      disabled={deactivate.isPending}
                    >
                      <Pause className="w-3 h-3" /> 暂停
                    </button>
                  ) : (
                    <button
                      className={`flex-1 py-1.5 text-xs text-white rounded hover:opacity-90 inline-flex items-center justify-center gap-1 ${colors.solid}`}
                      onClick={() => activate.mutate({ agentId: agent.id })}
                      disabled={activate.isPending}
                    >
                      <Play className="w-3 h-3" /> 激活
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 2: 任务执行
// ═══════════════════════════════════════════════════════════

function TaskExecutionTab() {
  const fleet = trpc.aiAgentFleet.getMyFleet.useQuery();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [taskType, setTaskType] = useState("document_draft");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [showResult, setShowResult] = useState<any>(null);

  const execute = trpc.aiAgentFleet.executeTask.useMutation({
    onSuccess: (d) => {
      if (d.success) {
        toast.success("任务执行完成");
        setShowResult(d);
        taskHistory.refetch();
      } else {
        toast.error(d.error || "执行失败");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const review = trpc.aiAgentFleet.reviewTaskOutput.useMutation({
    onSuccess: (d: any) => {
      if (d.success) {
        toast.success(d.approved ? "已通过审核，G-Token已发放" : "审核未通过");
        taskHistory.refetch();
      }
    },
  });

  const taskHistory = trpc.aiAgentFleet.getAgentTaskHistory.useQuery(
    { agentId: selectedAgent || 0 },
    { enabled: !!selectedAgent },
  );

  const activeAgents = (fleet.data?.agents || []).filter((a: any) => a.status === "active");

  return (
    <div className="space-y-6">
      {/* Task Submission Form */}
      <div className="bg-white rounded-lg border border-[#edebe9] p-6">
        <h3 className="text-base font-semibold text-[#323130] mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#0078d4]" /> 提交任务
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Agent Select */}
          <div>
            <label className="block text-xs font-medium text-[#605e5c] mb-1">选择Agent</label>
            <select
              className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm focus:border-[#0078d4] focus:outline-none"
              value={selectedAgent || ""}
              onChange={(e) => setSelectedAgent(Number(e.target.value) || null)}
            >
              <option value="">-- 请选择 --</option>
              {activeAgents.map((a: any) => (
                <option key={a.id} value={a.id}>
                  L{a.level} {a.agentName}
                </option>
              ))}
              {activeAgents.length === 0 && <option disabled>无活跃Agent，请先激活</option>}
            </select>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-xs font-medium text-[#605e5c] mb-1">任务类型</label>
            <select
              className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm focus:border-[#0078d4] focus:outline-none"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-medium text-[#605e5c] mb-1">任务标题</label>
            <input
              className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm focus:border-[#0078d4] focus:outline-none"
              placeholder="例如：生成本周项目周报"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Task Content */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#605e5c] mb-1">任务描述 / 输入内容</label>
          <textarea
            className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm focus:border-[#0078d4] focus:outline-none resize-none"
            rows={4}
            placeholder="请提供任务的详细描述或需要处理的内容..."
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
          />
        </div>

        <button
          className="px-5 py-2 bg-[#0078d4] text-white rounded hover:bg-[#106ebe] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          onClick={() => {
            if (!selectedAgent) return toast.error("请选择Agent");
            if (!taskTitle.trim()) return toast.error("请填写任务标题");
            execute.mutate({
              agentId: selectedAgent,
              taskType: taskType as any,
              taskTitle,
              taskInput: { content: taskContent, complexity: 1 },
            });
          }}
          disabled={execute.isPending || !selectedAgent}
        >
          {execute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          执行任务
        </button>
      </div>

      {/* Result Display */}
      {showResult && showResult.output && (
        <div className="bg-white rounded-lg border border-[#edebe9] p-6">
          <h3 className="text-base font-semibold text-[#323130] mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> 执行结果
          </h3>
          <div className="flex gap-4 text-xs text-[#605e5c] mb-3">
            <span>质量分: <b>{showResult.qualityScore?.toFixed(1)}</b></span>
            <span>耗时: <b>{showResult.durationMs}ms</b></span>
            <span>需人审: {showResult.reviewRequired ? "是" : "否"}</span>
          </div>
          <div className="bg-[#faf9f8] rounded p-4 text-sm text-[#323130] whitespace-pre-wrap max-h-80 overflow-y-auto">
            {showResult.output}
          </div>
        </div>
      )}

      {/* Task History */}
      {selectedAgent && (
        <div className="bg-white rounded-lg border border-[#edebe9] p-6">
          <h3 className="text-base font-semibold text-[#323130] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#605e5c]" /> 任务历史
          </h3>

          {taskHistory.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#f3f2f1] animate-pulse rounded" />
            ))}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#edebe9] text-left text-xs text-[#605e5c]">
                    <th className="py-2 pr-3">任务</th>
                    <th className="py-2 pr-3">类型</th>
                    <th className="py-2 pr-3">状态</th>
                    <th className="py-2 pr-3">质量分</th>
                    <th className="py-2 pr-3">G-Token</th>
                    <th className="py-2 pr-3">人审</th>
                    <th className="py-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(taskHistory.data || []).map((t: any) => (
                    <tr key={t.id} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
                      <td className="py-2 pr-3 max-w-[200px] truncate">{t.taskTitle}</td>
                      <td className="py-2 pr-3">{TASK_TYPES.find((tt) => tt.value === t.taskType)?.label || t.taskType}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          t.status === "completed" ? "bg-green-100 text-green-700" :
                          t.status === "failed" ? "bg-red-100 text-red-700" :
                          t.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-2 pr-3">{fmtNum(t.qualityScore)}</td>
                      <td className="py-2 pr-3 text-amber-600 font-medium">{fmtNum(t.gTokenReward)}</td>
                      <td className="py-2 pr-3">
                        {t.humanReviewRequired && t.humanApproved === null ? (
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              onClick={() => review.mutate({ executionId: t.id, approved: true, qualityScore: 80 })}
                            >通过</button>
                            <button
                              className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              onClick={() => review.mutate({ executionId: t.id, approved: false, qualityScore: 30 })}
                            >拒绝</button>
                          </div>
                        ) : t.humanApproved === true ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : t.humanApproved === false ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <span className="text-xs text-[#a19f9d]">自动</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-[#605e5c]">{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
                  {(!taskHistory.data || taskHistory.data.length === 0) && (
                    <tr><td colSpan={7} className="py-8 text-center text-[#a19f9d]">暂无任务记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 3: G-Token账本
// ═══════════════════════════════════════════════════════════

function GTokenLedgerTab() {
  const fleet = trpc.aiAgentFleet.getMyFleet.useQuery();
  const summary = trpc.aiAgentFleet.getGTokenSummary.useQuery();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const history = trpc.aiAgentFleet.getGTokenHistory.useQuery(
    { agentId: selectedAgent || undefined, limit: 50 },
  );

  const agents = fleet.data?.agents || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="系统总余额" value={fmtNum(summary.data?.totalBalance)} icon={Coins} color="text-amber-600" />
        <StatCard label="总收入" value={fmtNum(summary.data?.totalEarned)} icon={TrendingUp} color="text-green-600" />
        <StatCard label="总支出" value={fmtNum(summary.data?.totalSpent)} icon={BarChart3} color="text-red-500" />
        <StatCard label="Agent总数" value={summary.data?.totalAgents || 0} icon={Bot} color="text-[#0078d4]" />
        <StatCard label="活跃Agent" value={summary.data?.activeAgents || 0} icon={Zap} color="text-green-600" />
        <StatCard label="总任务" value={summary.data?.totalTasks || 0} icon={CheckCircle2} color="text-purple-600" />
      </div>

      {/* Per-Agent Balance Cards */}
      {agents.length > 0 && (
        <div className="bg-white rounded-lg border border-[#edebe9] p-4">
          <h3 className="text-sm font-semibold text-[#323130] mb-3">各Agent余额</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {agents.map((a: any) => {
              const colors = LEVEL_COLORS[a.level] || LEVEL_COLORS[1];
              return (
                <button
                  key={a.id}
                  className={`p-3 rounded-lg border ${selectedAgent === a.id ? colors.border + " border-2" : "border-[#edebe9]"} ${colors.bg} text-left transition-all hover:shadow`}
                  onClick={() => setSelectedAgent(a.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${colors.badge} px-1.5 py-0.5 rounded`}>L{a.level}</span>
                    <span className="text-xs text-[#605e5c] truncate">{a.agentName}</span>
                  </div>
                  <div className="text-lg font-bold text-amber-600">{fmtNum(a.gTokenBalance)}</div>
                  <div className="text-[10px] text-[#a19f9d]">收入 {fmtNum(a.totalEarned)} / 支出 {fmtNum(a.totalSpent)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-lg border border-[#edebe9] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" /> 交易流水
          </h3>
          <button onClick={() => history.refetch()} className="p-1.5 hover:bg-[#f3f2f1] rounded">
            <RefreshCw className="w-4 h-4 text-[#605e5c]" />
          </button>
        </div>

        {history.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#f3f2f1] animate-pulse rounded" />
          ))}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#edebe9] text-left text-xs text-[#605e5c]">
                  <th className="py-2 pr-3">时间</th>
                  <th className="py-2 pr-3">Agent</th>
                  <th className="py-2 pr-3">类型</th>
                  <th className="py-2 pr-3">金额</th>
                  <th className="py-2 pr-3">余额</th>
                  <th className="py-2">说明</th>
                </tr>
              </thead>
              <tbody>
                {(history.data || []).map((tx: any) => {
                  const txInfo = TX_TYPE_LABELS[tx.txType] || { label: tx.txType, color: "text-gray-600" };
                  const amount = parseFloat(tx.amount || "0");
                  return (
                    <tr key={tx.id} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
                      <td className="py-2 pr-3 text-xs text-[#605e5c] whitespace-nowrap">{fmtDate(tx.createdAt)}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{tx.agentCode || "-"}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-medium ${txInfo.color}`}>{txInfo.label}</span>
                      </td>
                      <td className={`py-2 pr-3 font-medium ${amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {amount >= 0 ? "+" : ""}{fmtNum(amount)}
                      </td>
                      <td className="py-2 pr-3 text-amber-600">{fmtNum(tx.balanceAfter)}</td>
                      <td className="py-2 text-xs text-[#605e5c] max-w-[200px] truncate">{tx.description || "-"}</td>
                    </tr>
                  );
                })}
                {(!history.data || history.data.length === 0) && (
                  <tr><td colSpan={6} className="py-8 text-center text-[#a19f9d]">暂无交易记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 4: 配置中心
// ═══════════════════════════════════════════════════════════

function ConfigTab() {
  const fleet = trpc.aiAgentFleet.getMyFleet.useQuery();
  const updateConfig = trpc.aiAgentFleet.updateAgentConfig.useMutation({
    onSuccess: (d) => {
      if (d.success) { toast.success("配置已更新"); fleet.refetch(); }
      else toast.error(d.error || "更新失败");
    },
  });

  const agents = fleet.data?.agents || [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-[#edebe9] p-6">
        <h3 className="text-base font-semibold text-[#323130] mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#605e5c]" /> Agent配置
        </h3>

        {agents.length === 0 ? (
          <p className="text-sm text-[#a19f9d] py-8 text-center">暂无Agent，请先部署军团</p>
        ) : (
          <div className="space-y-4">
            {agents.map((agent: any) => {
              const colors = LEVEL_COLORS[agent.level] || LEVEL_COLORS[1];
              return (
                <div key={agent.id} className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge}`}>L{agent.level}</span>
                    <span className="font-medium text-sm text-[#323130]">{agent.agentName}</span>
                    <span className="text-xs text-[#605e5c] font-mono">{agent.agentCode}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* Bidding Toggle */}
                    <div>
                      <label className="block text-xs text-[#605e5c] mb-1">竞标开关</label>
                      <button
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          agent.canBidTasks
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        onClick={() => updateConfig.mutate({ agentId: agent.id, canBidTasks: !agent.canBidTasks })}
                      >
                        {agent.canBidTasks ? "已开启" : "已关闭"}
                      </button>
                    </div>

                    {/* Max Concurrent Tasks */}
                    <div>
                      <label className="block text-xs text-[#605e5c] mb-1">最大并发</label>
                      <select
                        className="w-full px-2 py-1.5 border border-[#8a8886] rounded text-xs"
                        value={agent.maxConcurrentTasks}
                        onChange={(e) => updateConfig.mutate({ agentId: agent.id, maxConcurrentTasks: Number(e.target.value) })}
                      >
                        {[1, 2, 3, 5, 8, 10].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-xs text-[#605e5c] mb-1">最低竞标价</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 border border-[#8a8886] rounded text-xs"
                        defaultValue={parseFloat(agent.bidPriceRangeLow || "0")}
                        onBlur={(e) => updateConfig.mutate({ agentId: agent.id, bidPriceRangeLow: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#605e5c] mb-1">最高竞标价</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 border border-[#8a8886] rounded text-xs"
                        defaultValue={parseFloat(agent.bidPriceRangeHigh || "0")}
                        onBlur={(e) => updateConfig.mutate({ agentId: agent.id, bidPriceRangeHigh: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Read-only info */}
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-[#605e5c]">
                    <div>自主度: <span className="font-medium">{AUTONOMY_LABELS[agent.autonomyLevel]}</span></div>
                    <div>最大复杂度: <span className="font-medium">{agent.maxTaskComplexity}</span></div>
                    <div>数据范围: <span className="font-medium">{agent.dataScope}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fleet Analytics (admin view) */}
      <FleetAnalyticsPanel />
    </div>
  );
}

function FleetAnalyticsPanel() {
  const analytics = trpc.aiAgentFleet.getFleetAnalytics.useQuery();

  if (!analytics.data) return null;

  const { levelStats, summary } = analytics.data;

  return (
    <div className="bg-white rounded-lg border border-[#edebe9] p-6">
      <h3 className="text-base font-semibold text-[#323130] mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-[#0078d4]" /> 全公司军团分析
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="总Agent" value={summary.totalAgents || 0} icon={Bot} color="text-[#0078d4]" />
        <StatCard label="活跃Agent" value={summary.activeAgents || 0} icon={Zap} color="text-green-600" />
        <StatCard label="G-Token总量" value={fmtNum(summary.totalBalance)} icon={Coins} color="text-amber-600" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#edebe9] text-left text-xs text-[#605e5c]">
              <th className="py-2 pr-3">等级</th>
              <th className="py-2 pr-3">总数</th>
              <th className="py-2 pr-3">活跃</th>
              <th className="py-2 pr-3">完成任务</th>
              <th className="py-2 pr-3">平均信誉</th>
              <th className="py-2">G-Token余额</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(levelStats) ? levelStats : []).map((ls: any) => {
              const colors = LEVEL_COLORS[ls.level] || LEVEL_COLORS[1];
              return (
                <tr key={ls.level} className="border-b border-[#f3f2f1]">
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>L{ls.level}</span>
                  </td>
                  <td className="py-2 pr-3">{ls.count}</td>
                  <td className="py-2 pr-3 text-green-600">{ls.activeCount}</td>
                  <td className="py-2 pr-3">{ls.totalTasks}</td>
                  <td className="py-2 pr-3">{fmtNum(ls.avgReputation)}</td>
                  <td className="py-2 text-amber-600 font-medium">{fmtNum(ls.totalBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Main Dashboard
// ═══════════════════════════════════════════════════════════

const TABS = [
  { id: "fleet", label: "我的AI军团", icon: Users },
  { id: "tasks", label: "任务执行", icon: Brain },
  { id: "ledger", label: "G-Token账本", icon: Coins },
  { id: "config", label: "配置中心", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AIAgentFleetDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("fleet");

  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[#323130]">AI军团管理</h1>
          <span className="text-xs text-[#605e5c] bg-[#f3f2f1] px-2 py-0.5 rounded">L1-L5 Multi-Agent Fleet</span>
        </div>
        <p className="text-xs text-[#a19f9d] ml-11">管理您的AI助理军团、分配任务、追踪G-Token收支</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-[#edebe9] px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#0078d4] text-[#0078d4]"
                    : "border-transparent text-[#605e5c] hover:text-[#323130] hover:border-[#c8c6c4]"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 max-w-[1400px] mx-auto">
        {activeTab === "fleet" && <MyFleetTab />}
        {activeTab === "tasks" && <TaskExecutionTab />}
        {activeTab === "ledger" && <GTokenLedgerTab />}
        {activeTab === "config" && <ConfigTab />}
      </div>
    </div>
  );
}
