/**
 * My 360 Profile — Employee capability radar with target vs actual overlay
 *
 * M365 Light Theme — Recharts RadarChart showing:
 *   - Target polygon (role-based criteria) in blue outline
 *   - Actual polygon (Feb 2026 assessment) in green fill
 *   - Gap analysis table with AI improvement tips
 */

import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import {
  User,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  Loader2,
  Award,
  Wrench,
  Users,
  Lightbulb,
  MessageSquare,
  BookOpen,
  Crown,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Icon Resolver ───────────────────────────────────────────────────

const PILLAR_ICONS: Record<string, LucideIcon> = {
  T: Wrench, S: Users, D: Lightbulb, C: MessageSquare, K: BookOpen, L: Crown,
};

// ─── Grade Colors ────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-100 text-green-800";
  if (grade.startsWith("B")) return "bg-blue-100 text-blue-800";
  if (grade.startsWith("C")) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function gapColor(gap: number): string {
  if (gap <= 0) return "text-green-600";
  if (gap <= 10) return "text-amber-600";
  return "text-red-600";
}

function priorityBadge(priority: string) {
  if (priority === "high") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">紧急</Badge>;
  if (priority === "medium") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">一般</Badge>;
  return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">达标</Badge>;
}

// ─── Custom Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{d.name} ({d.code})</p>
      <div className="mt-1.5 space-y-1">
        <p className="text-blue-600">目标: <strong>{d.target}</strong></p>
        <p className="text-emerald-600">实际: <strong>{d.actual}</strong></p>
        <p className={gapColor(d.target - d.actual)}>
          差距: <strong>{d.target - d.actual > 0 ? `+${d.target - d.actual}` : d.target - d.actual}</strong>
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function My360Profile() {
  const { currentUserRole } = useUserProfile();
  const [showTips, setShowTips] = useState(false);

  // Fetch data
  const { data: assessment } = trpc.capabilitySystem.getMyAssessment.useQuery({ employeeId: 1017 });
  const { data: criteria } = trpc.capabilitySystem.getRoleCriteria.useQuery({ role: currentUserRole });
  const { data: dictionary } = trpc.capabilitySystem.getDictionary.useQuery();

  // AI tips
  const tipsMutation = trpc.capabilitySystem.aiImprovementTips.useMutation();

  const handleGetTips = () => {
    if (!assessment) return;
    tipsMutation.mutate({
      employeeId: assessment.employeeId,
      role: assessment.role,
    });
    setShowTips(true);
  };

  if (!assessment || !criteria || !dictionary) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Build radar chart data
  const chartData = dictionary.map(pillar => ({
    code: pillar.code,
    name: pillar.name,
    nameEn: pillar.nameEn,
    target: criteria.targets[pillar.code] || 60,
    actual: assessment.scores[pillar.code] || 0,
  }));

  const overallTarget = Math.round(
    Object.values(criteria.targets).reduce((a, b) => a + b, 0) / 6
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Page Header ─── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">我的 360 画像</h1>
              <p className="text-sm text-gray-500">My 360 Profile — TSDCKL Capability Radar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-violet-200 text-violet-700 bg-violet-50 px-3 py-1">
              Feb 2026 Assessment
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ─── Employee Info Banner ─── */}
        <div className="bg-white rounded-xl border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">{assessment.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{assessment.name} ({assessment.nameEn})</h2>
              <p className="text-sm text-gray-500">
                {assessment.department} &nbsp;|&nbsp; {assessment.roleName} &nbsp;|&nbsp; 评估周期: {assessment.assessedAt}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{assessment.overallScore}</p>
              <p className="text-xs text-gray-500">综合得分</p>
            </div>
            <Badge className={`px-4 py-2 text-base font-bold ${gradeColor(assessment.overallGrade)}`}>
              {assessment.overallGrade}
            </Badge>
            <div className="text-center">
              <p className="text-xl font-semibold text-blue-600">{overallTarget}</p>
              <p className="text-xs text-gray-500">岗位目标</p>
            </div>
          </div>
        </div>

        {/* ─── Radar Chart + Score Table ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-2 border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-violet-600" />
                能力雷达图
                <span className="text-xs text-gray-400 font-normal ml-1">Target vs Actual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="code"
                    tick={({ x, y, payload }: any) => {
                      const item = chartData.find(d => d.code === payload.value);
                      return (
                        <g>
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                            className="fill-gray-700 text-xs font-semibold">
                            {payload.value}
                          </text>
                          <text x={x} y={y + 14} textAnchor="middle" dominantBaseline="central"
                            className="fill-gray-400 text-[10px]">
                            {item?.name || ""}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickCount={5} />
                  {/* Target polygon — blue dashed outline */}
                  <Radar
                    name="岗位目标"
                    dataKey="target"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                  {/* Actual polygon — green solid fill */}
                  <Radar
                    name="实际得分"
                    dataKey="actual"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="line"
                    wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Breakdown Table */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-2 border-b bg-gray-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-5 h-5 text-amber-600" />
                  六大能力得分明细
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleGetTips}
                  disabled={tipsMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                >
                  {tipsMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  AI 提升建议
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {chartData.map(item => {
                  const gap = item.target - item.actual;
                  const PIcon = PILLAR_ICONS[item.code] || Award;
                  const pct = Math.min(100, (item.actual / item.target) * 100);
                  return (
                    <div key={item.code} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          <PIcon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{item.code} — {item.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{item.actual}</span>
                              <span className="text-xs text-gray-400">/</span>
                              <span className="text-xs text-blue-600">{item.target}</span>
                              {gap > 0 ? (
                                <span className={`text-xs font-medium flex items-center gap-0.5 ${gapColor(gap)}`}>
                                  <TrendingDown className="w-3 h-3" /> -{gap}
                                </span>
                              ) : gap < 0 ? (
                                <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                                  <TrendingUp className="w-3 h-3" /> +{Math.abs(gap)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <Minus className="w-3 h-3" /> 0
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-10">
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-gray-400 mt-1">{item.nameEn} — {Math.round(pct)}% of target</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── AI Improvement Tips ─── */}
        {showTips && tipsMutation.data && (
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-50 to-blue-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="w-5 h-5 text-violet-600" />
                AI 个性化提升建议
                <span className="text-xs text-gray-400 font-normal ml-1">
                  Generated {new Date(tipsMutation.data.generatedAt).toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {tipsMutation.data.tips.map(tip => {
                  const PIcon = PILLAR_ICONS[tip.code] || Award;
                  return (
                    <div key={tip.code} className={`px-5 py-4 ${tip.priority === "high" ? "bg-red-50/50" : tip.priority === "medium" ? "bg-amber-50/30" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          tip.priority === "high" ? "bg-red-100" :
                          tip.priority === "medium" ? "bg-amber-100" : "bg-green-100"
                        }`}>
                          <PIcon className={`w-4 h-4 ${
                            tip.priority === "high" ? "text-red-600" :
                            tip.priority === "medium" ? "text-amber-600" : "text-green-600"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{tip.code} — {tip.name}</span>
                            {priorityBadge(tip.priority)}
                            <span className="text-xs text-gray-400">
                              实际 {tip.actual} / 目标 {tip.target} (差距 {tip.gap > 0 ? `+${tip.gap}` : tip.gap})
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{tip.tip}</p>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg">
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium">行动建议:</span> {tip.action}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
