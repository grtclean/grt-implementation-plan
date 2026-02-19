/**
 * 我的岗位看板 — My Position Dashboard
 * Shows the gap between "the standard" (what's expected) and "the reality" (where you are)
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  Target,
  Scroll,
  BrainCircuit,
  Swords,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Star,
  ClipboardList,
  Award,
  User,
} from "lucide-react";
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

// ── Configurable mock user (replace with real auth later) ──
const MOCK_USER_ID = 1;
const CURRENT_YEAR = 2026;

// ── Status color maps ──
const signatureColorMap = createStatusColorMap({
  pending: "yellow",
  signed: "green",
  witnessed: "emerald",
  voided: "red",
});

const reviewStatusColorMap = createStatusColorMap({
  draft: "slate",
  submitted: "blue",
  reviewed: "purple",
  finalized: "green",
});

// ── Helper: format large numbers ──
function formatNumber(n: number | string | undefined): string {
  if (n === undefined || n === null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return String(n);
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  return num.toLocaleString("zh-CN");
}

// ── Helper: completion percentage color ──
function completionColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-blue-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function completionTextColor(pct: number): string {
  if (pct >= 100) return "text-green-600";
  if (pct >= 75) return "text-blue-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

// ── Skeleton components ──
function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-sm" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main component ──
export default function MyPerformance() {
  const { roleConfig } = useUserProfile();

  // ── Data fetching ──
  const { data: positionsData, isLoading: posLoading } =
    trpc.kpiPerformance.positions.list.useQuery({ status: "active", limit: 100 });

  const { data: militaryData, isLoading: milLoading } =
    trpc.kpiPerformance.militaryOrders.list.useQuery({
      userId: MOCK_USER_ID,
      year: CURRENT_YEAR,
    });

  const { data: skillsData, isLoading: skillLoading } =
    trpc.kpiPerformance.skills.list.useQuery({ userId: MOCK_USER_ID });

  const { data: targetsData, isLoading: targetsLoading } =
    trpc.kpiPerformance.targets.list.useQuery({ year: CURRENT_YEAR, limit: 100 });

  const { data: libraryData, isLoading: libLoading } =
    trpc.kpiPerformance.library.list.useQuery({ limit: 200 });

  const { data: reviewsData, isLoading: revLoading } =
    trpc.kpiPerformance.reviews.list.useQuery({ userId: MOCK_USER_ID });

  const anyLoading = posLoading || milLoading || skillLoading || targetsLoading || libLoading || revLoading;

  // ── Derived data ──
  const militaryOrder = militaryData?.items?.[0] ?? null;

  const position = useMemo(() => {
    if (!positionsData?.items?.length) return null;
    // Try to match by the military order's positionId, else first active position
    if (militaryOrder?.positionId) {
      return positionsData.items.find((p: any) => p.id === militaryOrder.positionId) ?? positionsData.items[0];
    }
    return positionsData.items[0];
  }, [positionsData, militaryOrder]);

  // KPI library lookup
  const kpiLookup = useMemo(() => {
    const map = new Map<number, any>();
    libraryData?.items?.forEach((k: any) => map.set(k.id, k));
    return map;
  }, [libraryData]);

  // Targets for the matched position
  const positionTargets = useMemo(() => {
    if (!position || !targetsData?.items) return [];
    return targetsData.items.filter((t: any) => t.positionId === position.id);
  }, [position, targetsData]);

  // Skill radar data
  const radarData = useMemo(() => {
    if (!skillsData?.items?.length) return [];
    return skillsData.items.map((s: any) => ({
      skill: s.skillName,
      current: Number(s.currentLevel) || 0,
      target: Number(s.targetLevel) || 0,
    }));
  }, [skillsData]);

  // Monthly reviews sorted
  const sortedReviews = useMemo(() => {
    if (!reviewsData?.items) return [];
    return [...reviewsData.items].sort((a: any, b: any) =>
      (a.monthDate ?? "").localeCompare(b.monthDate ?? ""),
    );
  }, [reviewsData]);

  // Summary stats
  const stats = useMemo(() => {
    const reviews = sortedReviews;
    const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
    const avgScore =
      reviews.length > 0
        ? reviews.reduce((s: number, r: any) => s + (Number(r.overallKpiScore) || 0), 0) / reviews.length
        : 0;
    const signed = militaryOrder?.signatureStatus === "signed" || militaryOrder?.signatureStatus === "witnessed";
    const totalTargets = positionTargets.length;
    const skills = skillsData?.items ?? [];
    const skillGap =
      skills.length > 0
        ? skills.filter((s: any) => Number(s.currentLevel) < Number(s.targetLevel)).length
        : 0;

    return {
      overallScore: latestReview ? Number(latestReview.overallKpiScore).toFixed(1) : "—",
      bonusCoeff: latestReview ? `${Number(latestReview.bonusCoefficient).toFixed(2)}x` : "—",
      pledgeSigned: signed ? "已签署" : "待签署",
      targetCount: totalTargets,
      reviewCount: reviews.length,
      skillGap,
    };
  }, [sortedReviews, militaryOrder, positionTargets, skillsData]);

  // Commitment targets from military order
  const commitmentTargets: Array<{ kpiName: string; targetValue: string; unit: string }> = useMemo(() => {
    if (!militaryOrder?.targetSummaryJson) return [];
    try {
      const parsed =
        typeof militaryOrder.targetSummaryJson === "string"
          ? JSON.parse(militaryOrder.targetSummaryJson)
          : militaryOrder.targetSummaryJson;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [militaryOrder]);

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ────── Header ────── */}
      <PageHeader
        icon={Star}
        title="我的岗位看板"
        description={`岗位标准 vs 当前现实 · ${roleConfig.label}`}
      />

      {/* ────── Stat cards ────── */}
      {anyLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Award}
            label="最新KPI得分"
            value={stats.overallScore}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <StatCard
            icon={TrendingUp}
            label="奖金系数"
            value={stats.bonusCoeff}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
          />
          <StatCard
            icon={Scroll}
            label="军令状"
            value={stats.pledgeSigned}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
          />
          <StatCard
            icon={BrainCircuit}
            label="能力差距项"
            value={stats.skillGap}
            subtitle={`共 ${skillsData?.items?.length ?? 0} 项能力`}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
          />
        </div>
      )}

      {/* ────── Military Order Card ────── */}
      {milLoading ? (
        <CardSkeleton lines={3} />
      ) : militaryOrder ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Swords className="h-5 w-5" />
              {CURRENT_YEAR}年度军令状
              <StatusBadge
                color={
                  signatureColorMap[
                    militaryOrder.signatureStatus as keyof typeof signatureColorMap
                  ] ?? "gray"
                }
              >
                {militaryOrder.signatureStatus === "signed"
                  ? "已签署"
                  : militaryOrder.signatureStatus === "witnessed"
                    ? "已见证"
                    : militaryOrder.signatureStatus === "voided"
                      ? "已作废"
                      : "待签署"}
              </StatusBadge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{militaryOrder.commitmentText}</p>

            {commitmentTargets.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">承诺目标:</p>
                <div className="flex flex-wrap gap-2">
                  {commitmentTargets.map((ct, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {ct.kpiName}: {ct.targetValue} {ct.unit}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(militaryOrder.rewardText || militaryOrder.consequenceText) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-500/20">
                {militaryOrder.rewardText && (
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-1">达成奖励</p>
                    <p className="text-sm">{militaryOrder.rewardText}</p>
                  </div>
                )}
                {militaryOrder.consequenceText && (
                  <div>
                    <p className="text-xs text-red-600 font-medium mb-1">未达后果</p>
                    <p className="text-sm">{militaryOrder.consequenceText}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Swords className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>暂无{CURRENT_YEAR}年度军令状</p>
            <p className="text-xs mt-1">请联系上级或HR创建您的年度承诺目标</p>
          </CardContent>
        </Card>
      )}

      {/* ────── Two-column layout: Standard vs Reality ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: The Standard (岗位标准) ── */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            岗位标准
          </h2>

          {posLoading ? (
            <>
              <CardSkeleton lines={5} />
              <CardSkeleton lines={3} />
            </>
          ) : position ? (
            <>
              {/* Position info header */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    {position.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {position.department && <Badge variant="secondary">{position.department}</Badge>}
                    {position.buCode && <Badge variant="outline">{position.buCode}</Badge>}
                    {position.headcount && (
                      <span>编制: {position.headcount}人</span>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Responsibilities & SOP */}
              {position.responsibilities && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                      岗位职责 & SOP
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {position.responsibilities
                        .split(/[\n;；]/)
                        .filter((line: string) => line.trim())
                        .map((line: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{line.trim()}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Core Competency */}
              {position.coreCompetency && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-purple-500" />
                      核心能力要求
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{position.coreCompetency}</p>
                  </CardContent>
                </Card>
              )}

              {/* Hiring Requirements */}
              {position.hiringRequirements && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      任职标准
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{position.hiringRequirements}</p>
                  </CardContent>
                </Card>
              )}

              {/* If no text fields populated, show placeholder */}
              {!position.responsibilities && !position.coreCompetency && !position.hiringRequirements && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>岗位标准尚未录入</p>
                    <p className="text-xs mt-1">请联系HR完善岗位职责与能力要求</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>暂无匹配岗位</p>
                <p className="text-xs mt-1">岗位数据尚未在KPI系统中录入</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT: The Reality (当前现实) ── */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            当前现实
          </h2>

          {/* Skill Radar Chart */}
          {skillLoading ? (
            <CardSkeleton lines={8} />
          ) : radarData.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-blue-500" />
                  能力雷达图
                  <span className="text-xs font-normal text-muted-foreground ml-auto">
                    蓝色=当前 / 橙色=目标 (1-5级)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                      tickLine={false}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 5]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickCount={6}
                      axisLine={false}
                    />
                    <Radar
                      name="当前水平"
                      dataKey="current"
                      stroke="hsl(217 91% 60%)"
                      fill="hsl(217 91% 60%)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(217 91% 60%)" }}
                    />
                    <Radar
                      name="目标水平"
                      dataKey="target"
                      stroke="hsl(25 95% 53%)"
                      fill="hsl(25 95% 53%)"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: "hsl(25 95% 53%)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>

                {/* Skill gap breakdown */}
                <div className="mt-3 space-y-2">
                  {radarData.map((s) => {
                    const gap = s.target - s.current;
                    return (
                      <div key={s.skill} className="flex items-center gap-2 text-xs">
                        <span className="w-24 truncate font-medium">{s.skill}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(s.current / 5) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-muted-foreground">
                          {s.current}/{s.target}
                        </span>
                        {gap > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            -{gap}
                          </Badge>
                        )}
                        {gap <= 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 text-green-600">
                            OK
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>暂无能力评估数据</p>
                <p className="text-xs mt-1">能力矩阵尚未录入，请联系上级填写</p>
              </CardContent>
            </Card>
          )}

          {/* KPI Progress Bars */}
          {targetsLoading || libLoading ? (
            <CardSkeleton lines={6} />
          ) : positionTargets.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  KPI目标进度 ({CURRENT_YEAR})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {positionTargets.map((t: any) => {
                  const kpi = kpiLookup.get(t.kpiId);
                  const kpiName = kpi?.name ?? `KPI #${t.kpiId}`;
                  const unit = kpi?.unit ?? "";
                  const targetVal = Number(t.targetValue) || 0;
                  const weight = Number(t.weight) || 0;

                  // Actual value would come from reviews; for now show target info
                  const latestReview = sortedReviews.length > 0 ? sortedReviews[sortedReviews.length - 1] : null;
                  let actual = 0;
                  if (latestReview?.kpiDetailsJson) {
                    try {
                      const details =
                        typeof latestReview.kpiDetailsJson === "string"
                          ? JSON.parse(latestReview.kpiDetailsJson)
                          : latestReview.kpiDetailsJson;
                      const match = Array.isArray(details)
                        ? details.find((d: any) => d.kpiId === t.kpiId)
                        : null;
                      if (match) actual = Number(match.actual) || 0;
                    } catch {
                      // ignore parse errors
                    }
                  }

                  const pct = targetVal > 0 ? Math.round((actual / targetVal) * 100) : 0;

                  const unitLabel =
                    unit === "currency"
                      ? "元"
                      : unit === "percent"
                        ? "%"
                        : unit === "count"
                          ? "个"
                          : unit === "days"
                            ? "天"
                            : unit === "score"
                              ? "分"
                              : unit === "ratio"
                                ? ""
                                : unit;

                  return (
                    <div key={t.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{kpiName}</span>
                          <span className="text-xs text-muted-foreground">
                            权重 {(weight * 100).toFixed(0)}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(actual)} / {formatNumber(targetVal)} {unitLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${completionColor(pct)}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium w-10 text-right ${completionTextColor(pct)}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>暂无KPI目标设定</p>
                <p className="text-xs mt-1">请在KPI绩效管理中为岗位配置KPI指标</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ────── Bottom: Monthly Reviews ────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          月度执行
        </h2>

        {revLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} lines={4} />
            ))}
          </div>
        ) : sortedReviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedReviews.map((review: any) => {
              const score = Number(review.overallKpiScore) || 0;
              const coeff = Number(review.bonusCoefficient) || 0;
              const status = review.status ?? "draft";
              const month = review.monthDate ?? "—";

              return (
                <Card key={review.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {month}
                      </span>
                      <StatusBadge
                        color={reviewStatusColorMap[status as keyof typeof reviewStatusColorMap] ?? "gray"}
                      >
                        {status === "draft"
                          ? "草稿"
                          : status === "submitted"
                            ? "已提交"
                            : status === "reviewed"
                              ? "已评审"
                              : status === "finalized"
                                ? "已定稿"
                                : status}
                      </StatusBadge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">KPI得分</p>
                        <p className={`text-lg font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          {score.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">奖金系数</p>
                        <p className="text-lg font-bold">{coeff.toFixed(2)}x</p>
                      </div>
                    </div>

                    {review.gapsText && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">差距分析</p>
                        <p className="text-xs line-clamp-2">{review.gapsText}</p>
                      </div>
                    )}

                    {review.improvementPlanText && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">改进计划</p>
                        <p className="text-xs line-clamp-2">{review.improvementPlanText}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>暂无月度考核记录</p>
              <p className="text-xs mt-1">月度绩效考核记录将在每月评审后自动展示</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
