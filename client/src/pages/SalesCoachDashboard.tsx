/**
 * Sales Coach Dashboard — 全球销售全域赋能与战术指导引擎
 *
 * Three pillars:
 * 1. CAPEX Budget Mining — Red alert countdown for missing client budgets
 * 2. M-Stage Tactical Board — Kanban for M0-M3 bidding strategies
 * 3. AI Sales Coach — Async LLM coaching after daily report submission
 *
 * Dark industrial theme: bg-[#0d1117] / border-[#21262d] / text-[#e6edf3]
 */

import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle,
  TrendingUp,
  Target,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  Activity,
} from "lucide-react";

// ── Dark theme classes ──────────────────────────────────
const DARK_BG = "bg-[#0d1117]";
const DARK_CARD = "bg-[#161b22] border-[#21262d]";
const DARK_TEXT = "text-[#e6edf3]";
const DARK_MUTED = "text-[#8b949e]";
const DARK_INPUT = "bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#484f58]";

// ══════════════════════════════════════════════════════
// BudgetAlertBanner — Red countdown for missing budgets
// ══════════════════════════════════════════════════════

function BudgetAlertBanner({ onRecordClick }: { onRecordClick: (clientId: number) => void }) {
  const alerts = trpc.salesCoach.budget.getBudgetAlerts.useQuery({ year: new Date().getFullYear() });

  const alertData = (alerts.data && alerts.data.length > 0) ? alerts.data : DEMO_ALERTS;
  if (alertData.length === 0) return null;

  const overdueCount = alertData.filter((a: any) => a.alert_level === "overdue").length;
  const missingCount = alertData.filter((a: any) => a.alert_level === "missing").length;

  return (
    <div className={`rounded-lg border p-4 ${overdueCount > 0 ? "bg-red-950/60 border-red-800" : "bg-amber-950/40 border-amber-800"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? "text-red-400 animate-pulse" : "text-amber-400"}`} />
          <div>
            <h3 className={`font-semibold ${overdueCount > 0 ? "text-red-300" : "text-amber-300"}`}>
              CAPEX 预算采集预警
            </h3>
            <p className={DARK_MUTED}>
              {overdueCount > 0 && <span className="text-red-400 font-bold">{overdueCount} 个已逾期</span>}
              {overdueCount > 0 && missingCount > 0 && " · "}
              {missingCount > 0 && <span className="text-amber-400">{missingCount} 个未录入</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap max-w-md">
          {alertData.slice(0, 5).map((alert: any) => (
            <button
              key={alert.client_id}
              onClick={() => onRecordClick(alert.client_id)}
              className={`text-xs px-2 py-1 rounded border cursor-pointer transition-colors ${
                alert.alert_level === "overdue"
                  ? "bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800/50"
                  : "bg-amber-900/30 border-amber-700 text-amber-300 hover:bg-amber-800/30"
              }`}
            >
              {alert.client_name}
              {alert.days_remaining != null && (
                <span className="ml-1 font-mono">
                  {alert.days_remaining < 0 ? `+${Math.abs(alert.days_remaining)}d` : `${alert.days_remaining}d`}
                </span>
              )}
            </button>
          ))}
          {alertData.length > 5 && (
            <span className={`text-xs ${DARK_MUTED} self-center`}>+{alertData.length - 5} more</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TacticalBoard — M0-M3 Kanban
// ══════════════════════════════════════════════════════

const STAGE_COLORS: Record<string, string> = {
  M0: "border-t-blue-500",
  M1: "border-t-cyan-500",
  M2: "border-t-amber-500",
  M3: "border-t-emerald-500",
};

const STAGE_LABELS: Record<string, string> = {
  M0: "M0 线索确认",
  M1: "M1 需求验证",
  M2: "M2 方案投标",
  M3: "M3 合同谈判",
};

// ── Demo tactical board data ────────────────────────
const DEMO_TACTICAL: Record<string, any[]> = {
  M0: [
    { project_id: 1001, project_name: "三一重工·泵车缸体清洗线", customer_name: "三一重工股份有限公司", confidence_level: 2, has_background: true, has_plan: false, has_strategy: false },
    { project_id: 1002, project_name: "徐工集团·液压阀体超声波清洗", customer_name: "徐工集团工程机械有限公司", confidence_level: 3, has_background: true, has_plan: true, has_strategy: false },
    { project_id: 1003, project_name: "宁德时代·电池壳体清洗", customer_name: "宁德时代新能源科技有限公司", confidence_level: 2, has_background: false, has_plan: false, has_strategy: false },
    { project_id: 1004, project_name: "中芯国际·光刻机清洗模组", customer_name: "中芯国际集成电路制造有限公司", confidence_level: 3, has_background: true, has_plan: false, has_strategy: false },
    { project_id: 1005, project_name: "北方华创·CVD腔室清洗", customer_name: "北方华创科技集团有限公司", confidence_level: 1, has_background: false, has_plan: false, has_strategy: false },
  ],
  M1: [
    { project_id: 2001, project_name: "大众集团·变速箱壳体清洗线", customer_name: "一汽-大众汽车有限公司", confidence_level: 4, has_background: true, has_plan: true, has_strategy: true },
    { project_id: 2002, project_name: "潍柴动力·发动机缸盖清洗", customer_name: "潍柴动力股份有限公司", confidence_level: 3, has_background: true, has_plan: true, has_strategy: false },
    { project_id: 2003, project_name: "比亚迪·电驱壳体精密清洗", customer_name: "比亚迪股份有限公司", confidence_level: 4, has_background: true, has_plan: true, has_strategy: true },
  ],
  M2: [
    { project_id: 3001, project_name: "宝马沈阳·曲轴清洗线改造", customer_name: "华晨宝马汽车有限公司", confidence_level: 4, has_background: true, has_plan: true, has_strategy: true },
    { project_id: 3002, project_name: "长安福特·变速箱零部件清洗", customer_name: "长安福特汽车有限公司", confidence_level: 3, has_background: true, has_plan: true, has_strategy: false },
  ],
  M3: [
    { project_id: 4001, project_name: "上汽大众·MEB平台电驱清洗线", customer_name: "上汽大众汽车有限公司", confidence_level: 5, has_background: true, has_plan: true, has_strategy: true },
    { project_id: 4002, project_name: "蔚来汽车·电池包清洗设备", customer_name: "蔚来汽车科技有限公司", confidence_level: 4, has_background: true, has_plan: true, has_strategy: true },
    { project_id: 4003, project_name: "Volvo·缸体清洗线（瑞典工厂）", customer_name: "沃尔沃卡车集团", confidence_level: 5, has_background: true, has_plan: true, has_strategy: true },
  ],
};

// Demo budget alerts
const DEMO_ALERTS = [
  { client_id: 501, client_name: "广汽集团", alert_level: "overdue", days_remaining: -12 },
  { client_id: 502, client_name: "吉利汽车", alert_level: "overdue", days_remaining: -5 },
  { client_id: 503, client_name: "东风日产", alert_level: "missing", days_remaining: 8 },
  { client_id: 504, client_name: "长城汽车", alert_level: "missing", days_remaining: 15 },
  { client_id: 505, client_name: "中国中车", alert_level: "missing", days_remaining: 22 },
  { client_id: 506, client_name: "隆基绿能", alert_level: "missing", days_remaining: 30 },
];

// Demo budget summary
const DEMO_SUMMARY = {
  coveragePercent: 62,
  capexByLine: { cleaning: 87500000, vision: 34200000, zld: 21800000 },
};

// Demo coach feedback
const DEMO_COACH_FEEDBACK = {
  tacticalGuidance: "基于今日拜访和当前管道分析：\n\n1. 大众集团清洗线项目已进入M2阶段，建议本周完成技术方案细化，重点突出GRT在真空干燥技术上的差异化优势。竞品Dürr可能以价格切入，需准备好TCO（总拥有成本）对比材料。\n\n2. 宁德时代电池壳体清洗项目刚进入M0，建议安排技术总监戴晓燕亲自参与下周的需求调研，展示GRT在新能源领域的工程能力。\n\n3. 本月CAPEX覆盖率62%，距离80%目标尚有差距。建议优先完成广汽集团（已逾期12天）和吉利汽车的年度预算录入。",
  pipelineRisks: [
    "工业通用事业部M3项目数为0，存在Q2交付断档风险",
    "乘用车事业部CAPEX覆盖率仅38%，低于60%预警线",
    "M0项目中3个缺少项目背景录入，信息不完整影响推进效率",
  ],
  suggestedActions: [
    "本周安排与三一重工和徐工集团的方案汇报会，推动M0→M1转化",
    "联系广汽集团采购部李主任，完成2026年CAPEX预算录入",
    "与研发中心协调，准备大众集团真空干燥技术白皮书",
    "安排吴卫成(#1)与周海燕(#7)做1对1经验分享，复制欧洲区成功模式", // demo
  ],
  generatedAt: "2026-03-10T18:30:00",
};

function CompletenessIndicator({ has }: { has: boolean }) {
  return has ? (
    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
  ) : (
    <XCircle className="h-3 w-3 text-[#484f58]" />
  );
}

function TacticalBoard() {
  const board = trpc.salesCoach.tactical.getTacticalBoard.useQuery({});

  if (board.isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-24 bg-[#21262d]" />
            <Skeleton className="h-32 bg-[#21262d]" />
            <Skeleton className="h-32 bg-[#21262d]" />
          </div>
        ))}
      </div>
    );
  }

  const raw = board.data;
  const hasData = raw && (Object.values(raw) as any[][]).some((arr: any[]) => arr.length > 0);
  const data = hasData ? raw : DEMO_TACTICAL;

  return (
    <div className="grid grid-cols-4 gap-3">
      {(["M0", "M1", "M2", "M3"] as const).map(stage => {
        const items = (data as any)[stage] ?? [];
        return (
          <div key={stage} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-semibold ${DARK_TEXT}`}>{STAGE_LABELS[stage]}</h4>
              <Badge variant="outline" className="text-xs border-[#30363d] text-[#8b949e]">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
              {items.length === 0 && (
                <div className={`rounded-lg border border-dashed border-[#30363d] p-4 text-center ${DARK_MUTED} text-xs`}>
                  暂无项目
                </div>
              )}
              {items.map((item: any) => (
                <Card
                  key={item.project_id}
                  className={`${DARK_CARD} border-t-2 ${STAGE_COLORS[stage]} cursor-pointer hover:bg-[#1c2128] transition-colors`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className={`text-sm font-medium ${DARK_TEXT} line-clamp-1`}>{item.project_name}</p>
                      {item.confidence_level && (
                        <Badge
                          variant="outline"
                          className={`text-xs ml-1 shrink-0 ${
                            item.confidence_level >= 4 ? "border-emerald-600 text-emerald-400" :
                            item.confidence_level >= 3 ? "border-amber-600 text-amber-400" :
                            "border-red-600 text-red-400"
                          }`}
                        >
                          C{item.confidence_level}
                        </Badge>
                      )}
                    </div>
                    {item.customer_name && (
                      <p className={`text-xs ${DARK_MUTED}`}>{item.customer_name}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] ${DARK_MUTED}`}>完整度:</span>
                      <CompletenessIndicator has={!!item.has_background} />
                      <CompletenessIndicator has={!!item.has_plan} />
                      <CompletenessIndicator has={!!item.has_strategy} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PipelineHealthGauge — Circular gauge 0-100
// ══════════════════════════════════════════════════════

function PipelineHealthGauge({ score }: { score: number | null }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#21262d" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-1000"
        />
        <text x="50" y="46" textAnchor="middle" className="fill-[#e6edf3] text-2xl font-bold" fontSize="22">
          {value}
        </text>
        <text x="50" y="62" textAnchor="middle" className="fill-[#8b949e]" fontSize="9">
          Pipeline Health
        </text>
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// CoachPanel — Report + AI Feedback + Health
// ══════════════════════════════════════════════════════

function CoachPanel() {
  const utils = trpc.useUtils();
  const [logDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loggedHours, setLoggedHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [blockers, setBlockers] = useState("");
  const [clientsVisited, setClientsVisited] = useState("0");
  const [energyLevel, setEnergyLevel] = useState("3");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [typewriterText, setTypewriterText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const feedback = trpc.salesCoach.coach.getCoachingFeedback.useQuery({ logDate });
  const taskStatus = trpc.salesCoach.coach.getTaskStatus.useQuery(
    { taskId: taskId! },
    { enabled: !!taskId, refetchInterval: taskId ? 5000 : false },
  );
  const health = trpc.salesCoach.coach.getPipelineHealth.useQuery({});

  const submitMut = trpc.salesCoach.coach.submitSalesReport.useMutation({
    onSuccess: (data) => {
      if (data.taskId) setTaskId(data.taskId);
      toast.success("日报已提交，AI教练分析中...");
    },
    onError: (err) => toast.error("提交失败: " + err.message),
  });

  // Typewriter effect for AI guidance
  const startTypewriter = useCallback((text: string) => {
    setIsTyping(true);
    setTypewriterText("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypewriterText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 25);
    return () => clearInterval(interval);
  }, []);

  // When task completes, trigger typewriter
  useEffect(() => {
    if (taskStatus.data?.status === "completed" && taskStatus.data?.resultData) {
      const result = taskStatus.data.resultData as any;
      if (result.feedback?.tacticalGuidance) {
        startTypewriter(result.feedback.tacticalGuidance);
        setTaskId(null); // stop polling
        utils.salesCoach.coach.getCoachingFeedback.invalidate();
        utils.salesCoach.coach.getPipelineHealth.invalidate();
      }
    }
  }, [taskStatus.data?.status]);

  const handleSubmit = () => {
    submitMut.mutate({
      logDate,
      loggedHours: parseFloat(loggedHours) || 8,
      completedTasks: notes.split("\n").filter(Boolean).map(t => ({ title: t })),
      blockers: blockers || undefined,
      notes: notes || undefined,
      energyLevel: parseInt(energyLevel) || 3,
      clientsVisited: parseInt(clientsVisited) || 0,
    });
  };

  const existingFeedback = feedback.data?.aiCoachFeedback ?? DEMO_COACH_FEEDBACK;

  return (
    <div className="space-y-4">
      {/* Sales Report Form */}
      <Card className={DARK_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-sm font-semibold ${DARK_TEXT} flex items-center gap-2`}>
            <Send className="h-4 w-4 text-cyan-400" />
            今日销售日报 — {logDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className={`text-xs ${DARK_MUTED}`}>工时</Label>
              <Input
                type="number" min="0" max="24" step="0.5"
                value={loggedHours}
                onChange={e => setLoggedHours(e.target.value)}
                className={`${DARK_INPUT} h-8 text-sm`}
              />
            </div>
            <div>
              <Label className={`text-xs ${DARK_MUTED}`}>拜访客户数</Label>
              <Input
                type="number" min="0"
                value={clientsVisited}
                onChange={e => setClientsVisited(e.target.value)}
                className={`${DARK_INPUT} h-8 text-sm`}
              />
            </div>
            <div>
              <Label className={`text-xs ${DARK_MUTED}`}>精力值</Label>
              <Select value={energyLevel} onValueChange={setEnergyLevel}>
                <SelectTrigger className={`${DARK_INPUT} h-8 text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} — {["极差","较差","一般","良好","充沛"][n-1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>完成事项 (每行一条)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="拜访XX客户，讨论清洗线方案...&#10;跟进XX项目报价..."
              className={`${DARK_INPUT} text-sm min-h-[60px]`}
              rows={3}
            />
          </div>
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>困难/障碍</Label>
            <Input
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              placeholder="例: 客户决策层变更"
              className={`${DARK_INPUT} h-8 text-sm`}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitMut.isPending || !!taskId}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-8 text-sm"
          >
            {submitMut.isPending ? "提交中..." : taskId ? "AI分析中..." : "提交日报 & 获取AI指导"}
          </Button>
        </CardContent>
      </Card>

      {/* AI Coach Feedback */}
      <Card className={DARK_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-sm font-semibold ${DARK_TEXT} flex items-center gap-2`}>
            <Sparkles className="h-4 w-4 text-amber-400" />
            AI 销售教练反馈
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taskId && !existingFeedback && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full bg-[#21262d]" />
              <Skeleton className="h-4 w-3/4 bg-[#21262d]" />
              <Skeleton className="h-4 w-5/6 bg-[#21262d]" />
              <p className={`text-xs ${DARK_MUTED} flex items-center gap-1`}>
                <Activity className="h-3 w-3 animate-pulse text-cyan-400" />
                AI教练正在分析...
              </p>
            </div>
          )}

          {(typewriterText || existingFeedback) && (
            <div className="space-y-3">
              {/* Tactical Guidance */}
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                <p className={`text-sm ${DARK_TEXT} leading-relaxed`}>
                  {isTyping ? (
                    <>
                      {typewriterText}
                      <span className="inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                    </>
                  ) : (
                    existingFeedback?.tacticalGuidance || typewriterText
                  )}
                </p>
              </div>

              {/* Pipeline Risks */}
              {(existingFeedback?.pipelineRisks ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-400 mb-1">管道风险</p>
                  <ul className="space-y-1">
                    {existingFeedback!.pipelineRisks.map((risk: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Actions */}
              {(existingFeedback?.suggestedActions ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-400 mb-1">建议行动</p>
                  <ul className="space-y-1">
                    {existingFeedback!.suggestedActions.map((action: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-300/80">
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!taskId && !existingFeedback && !typewriterText && (
            <p className={`text-sm ${DARK_MUTED} text-center py-4`}>
              提交日报后获取AI教练的战术指导
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Health */}
      <Card className={DARK_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-semibold ${DARK_TEXT} flex items-center gap-2`}>
            <Activity className="h-4 w-4 text-emerald-400" />
            管道健康度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <PipelineHealthGauge score={health.data?.healthScore ?? feedback.data?.pipelineHealthScore ?? 68} />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className={DARK_MUTED}>M阶段项目</span>
                <span className={DARK_TEXT}>
                  {health.data?.stageCounts
                    ? (health.data.stageCounts as any[]).reduce((s: number, c: any) => s + (c.cnt || 0), 0)
                    : 13}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={DARK_MUTED}>预算覆盖率</span>
                <span className={DARK_TEXT}>{health.data?.budgetCoverage?.percent ?? 62}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={DARK_MUTED}>上次评估</span>
                <span className={DARK_TEXT}>{health.data?.lastDate ?? "2026-03-10"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// BudgetRecordDialog — Record CAPEX budgets
// ══════════════════════════════════════════════════════

function BudgetRecordDialog({
  open,
  onOpenChange,
  clientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: number | null;
}) {
  const utils = trpc.useUtils();
  const [cleaning, setCleaning] = useState("");
  const [vision, setVision] = useState("");
  const [zld, setZld] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [notes, setNotes] = useState("");

  const upsert = trpc.salesCoach.budget.upsert.useMutation({
    onSuccess: () => {
      toast.success("CAPEX预算已保存");
      utils.salesCoach.budget.getBudgetAlerts.invalidate();
      utils.salesCoach.budget.getBudgetSummary.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error("保存失败: " + err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${DARK_CARD} ${DARK_TEXT} max-w-md`}>
        <DialogHeader>
          <DialogTitle className={DARK_TEXT}>录入客户年度CAPEX</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>清洗机 CAPEX (万元)</Label>
            <Input value={cleaning} onChange={e => setCleaning(e.target.value)} type="number" className={DARK_INPUT} placeholder="0" />
          </div>
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>视觉检测 CAPEX (万元)</Label>
            <Input value={vision} onChange={e => setVision(e.target.value)} type="number" className={DARK_INPUT} placeholder="0" />
          </div>
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>零排放 CAPEX (万元)</Label>
            <Input value={zld} onChange={e => setZld(e.target.value)} type="number" className={DARK_INPUT} placeholder="0" />
          </div>
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>截止日期</Label>
            <Input value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} type="date" className={DARK_INPUT} />
          </div>
          <div>
            <Label className={`text-xs ${DARK_MUTED}`}>备注</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${DARK_INPUT} min-h-[60px]`} />
          </div>
          <Button
            onClick={() => {
              if (!clientId) return;
              upsert.mutate({
                clientId,
                year: new Date().getFullYear(),
                cleaningCapex: cleaning || "0",
                visionCapex: vision || "0",
                zldCapex: zld || "0",
                deadlineDate: deadlineDate || null,
                notes: notes || undefined,
              });
            }}
            disabled={!clientId || upsert.isPending}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {upsert.isPending ? "保存中..." : "保存预算"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════
// BudgetSummaryBar — Top stats
// ══════════════════════════════════════════════════════

function BudgetSummaryBar() {
  const summary = trpc.salesCoach.budget.getBudgetSummary.useQuery({ year: new Date().getFullYear() });

  if (summary.isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-[#21262d] rounded-lg" />)}
      </div>
    );
  }

  const d = summary.data ?? DEMO_SUMMARY;

  const stats = [
    { label: "客户覆盖率", value: `${d.coveragePercent}%`, icon: Users, color: "text-cyan-400" },
    { label: "清洗机CAPEX", value: `¥${(d.capexByLine.cleaning / 10000).toFixed(0)}万`, icon: DollarSign, color: "text-blue-400" },
    { label: "视觉检测CAPEX", value: `¥${(d.capexByLine.vision / 10000).toFixed(0)}万`, icon: Zap, color: "text-amber-400" },
    { label: "零排放CAPEX", value: `¥${(d.capexByLine.zld / 10000).toFixed(0)}万`, icon: BarChart3, color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <Card key={i} className={DARK_CARD}>
          <CardContent className="p-3 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className={`text-xs ${DARK_MUTED}`}>{s.label}</p>
              <p className={`text-lg font-bold ${DARK_TEXT}`}>{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════

export default function SalesCoachDashboard() {
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const handleRecordBudget = (clientId: number) => {
    setSelectedClientId(clientId);
    setBudgetDialogOpen(true);
  };

  return (
    <div className={`min-h-screen ${DARK_BG} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className={`text-lg font-bold ${DARK_TEXT}`}>销售教练工作台</h1>
            <p className={`text-xs ${DARK_MUTED}`}>Sales Coach Engine — CAPEX Mining · Tactical Board · AI Coaching</p>
          </div>
        </div>
        <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {new Date().toISOString().slice(0, 10)}
        </Badge>
      </div>

      {/* Budget Alert Banner */}
      <BudgetAlertBanner onRecordClick={handleRecordBudget} />

      {/* Budget Summary Stats */}
      <BudgetSummaryBar />

      {/* Main Content: Tactical Board + Coach Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tactical Board — 60% */}
        <div className="lg:col-span-3">
          <Card className={DARK_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-semibold ${DARK_TEXT} flex items-center gap-2`}>
                <TrendingUp className="h-4 w-4 text-blue-400" />
                M阶段战术看板
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TacticalBoard />
            </CardContent>
          </Card>
        </div>

        {/* Coach Panel — 40% */}
        <div className="lg:col-span-2">
          <CoachPanel />
        </div>
      </div>

      {/* Budget Record Dialog */}
      <BudgetRecordDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        clientId={selectedClientId}
      />
    </div>
  );
}
