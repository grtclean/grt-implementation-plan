/**
 * SecurityDashboard — 总裁办安全态势仪表板
 *
 * 企业信息安全态势感知大屏:
 *   - 今日审计统计卡片 (总事件/高危/未授权/非工时/下载量)
 *   - 高危行为实时列表 (红色高亮)
 *   - 承诺书签署率进度条
 *   - 举报箱入口 + 待处理举报数
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  AlertTriangle,
  FileWarning,
  Download,
  Users,
  Clock,
  Ban,
  Eye,
  Inbox,
  Activity,
  TrendingUp,
  Lock,
} from "lucide-react";

const Q = { retry: false, refetchOnWindowFocus: false } as const;

// ═══════════════════════════════════════════════════════════
// Stat Card
// ═══════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isLoading,
}: {
  icon: typeof Shield;
  label: string;
  value: number;
  color: string;
  isLoading: boolean;
}) {
  const bgMap: Record<string, string> = {
    red: "from-red-500/10 to-red-600/5 border-red-500/30",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/30",
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/30",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/30",
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/30",
    slate: "from-slate-500/10 to-slate-600/5 border-slate-500/30",
  };
  const textMap: Record<string, string> = {
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    purple: "text-purple-600 dark:text-purple-400",
    slate: "text-slate-600 dark:text-slate-400",
  };

  return (
    <Card className={`bg-gradient-to-br ${bgMap[color] ?? bgMap.slate} border transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className={`text-3xl font-bold mt-1 ${textMap[color] ?? textMap.slate}`}>
                {value}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl bg-background/80 shadow-sm ${textMap[color] ?? textMap.slate}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// Risk Event Row
// ═══════════════════════════════════════════════════════════

function RiskEventRow({ event }: { event: Record<string, unknown> }) {
  const isHigh = event.riskLevel === "high";
  const actionLabels: Record<string, string> = {
    UNAUTHORIZED_ACCESS: "未授权访问",
    AFTER_HOURS_ACCESS: "非工时访问",
    PERMISSION_ESCALATION: "权限提升",
    DATA_DELETE: "数据删除",
    DOWNLOAD_CAD: "下载CAD",
    DOWNLOAD_BOM: "下载BOM",
    DOWNLOAD_PDF: "下载PDF",
    EXPORT_DATA: "数据导出",
    BULK_QUERY: "批量查询",
    API_KEY_ACCESS: "API密钥访问",
    SENSITIVE_VIEW: "敏感数据查看",
    CONFIG_CHANGE: "配置变更",
  };

  const time = event.createdAt
    ? new Date(event.createdAt as string).toLocaleTimeString()
    : "";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      isHigh
        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
    }`}>
      <div className={`p-1.5 rounded-full ${isHigh ? "bg-red-100 dark:bg-red-900" : "bg-amber-100 dark:bg-amber-900"}`}>
        {isHigh
          ? <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          : <FileWarning className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {(event.userName as string) || `User #${event.userId}`}
          </span>
          <Badge variant={isHigh ? "destructive" : "outline"} className="text-[10px] px-1.5 py-0">
            {isHigh ? "HIGH" : "MED"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {actionLabels[event.actionType as string] ?? String(event.actionType)}
          {event.resourceName ? ` — ${String(event.resourceName)}` : ""}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {time}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════

export default function SecurityDashboard() {
  const { language, t } = useLanguage();
  const isZh = language === "zh";

  // ── Queries ─────────────────────────────────────────────
  const statsQuery = trpc.securityCompliance.getAuditStats.useQuery(undefined, {
    ...Q,
    refetchInterval: 30_000, // live refresh every 30s
  });

  const highRiskQuery = trpc.securityCompliance.getTodayHighRiskEvents.useQuery(
    { limit: 15 },
    { ...Q, refetchInterval: 30_000 },
  );

  const commitmentStats = trpc.securityCompliance.getCommitmentStats.useQuery(undefined, Q);
  const reportsQuery = trpc.securityCompliance.getReports.useQuery(
    { status: "PENDING", limit: 5 },
    Q,
  );

  const stats = statsQuery.data;
  const highRiskEvents = (highRiskQuery.data ?? []) as Record<string, unknown>[];
  const pendingReports = (reportsQuery.data ?? []) as Record<string, unknown>[];

  // Commitment rate
  const commitmentRate = useMemo(() => {
    if (!commitmentStats.data) return 0;
    const { totalSigned, agreedCount } = commitmentStats.data;
    if (totalSigned === 0) return 0;
    return Math.round((agreedCount / totalSigned) * 100);
  }, [commitmentStats.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title={isZh ? "安全态势仪表板" : "Security Posture Dashboard"}
        description={isZh
          ? "总裁办信息安全监控中枢 — 审计日志 · 违规预警 · 承诺书合规 · 举报箱"
          : "Executive Security Command Center — Audit Logs · Risk Alerts · Compliance · Whistleblower"}
      />

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Activity}
          label={isZh ? "今日事件" : "Today Events"}
          value={stats?.totalEvents ?? 0}
          color="blue"
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label={isZh ? "高危" : "High Risk"}
          value={stats?.highRiskCount ?? 0}
          color="red"
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          icon={Ban}
          label={isZh ? "未授权" : "Unauthorized"}
          value={stats?.unauthorizedCount ?? 0}
          color="red"
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          icon={Eye}
          label={isZh ? "非工时" : "After Hours"}
          value={stats?.afterHoursCount ?? 0}
          color="amber"
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          icon={Download}
          label={isZh ? "下载量" : "Downloads"}
          value={stats?.downloadCount ?? 0}
          color="purple"
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          icon={Users}
          label={isZh ? "活跃用户" : "Active Users"}
          value={stats?.uniqueUsers ?? 0}
          color="emerald"
          isLoading={statsQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── High Risk Events ──────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  {isZh ? "今日高危行为实时监控" : "Today's High-Risk Events (Live)"}
                </CardTitle>
                <Badge variant="outline" className="text-xs animate-pulse">
                  {isZh ? "实时刷新" : "Live"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {highRiskQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : highRiskEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">{isZh ? "今日暂无高危事件" : "No high-risk events today"}</p>
                  <p className="text-xs mt-1">{isZh ? "系统运行正常" : "Systems operating normally"}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {highRiskEvents.map((event, i) => (
                    <RiskEventRow key={(event.id as number) ?? i} event={event} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ──────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Commitment Rate */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                {isZh ? "月度承诺书签署" : "Monthly Commitment"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commitmentStats.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {commitmentStats.data?.period ?? ""}
                    </span>
                    <span className="font-bold text-emerald-600">{commitmentRate}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${commitmentRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {commitmentStats.data?.agreedCount ?? 0} / {commitmentStats.data?.totalSigned ?? 0}
                    {isZh ? " 已签署" : " signed"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Whistleblower Reports */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-amber-600" />
                  {isZh ? "举报箱" : "Whistleblower Inbox"}
                </CardTitle>
                {pendingReports.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {pendingReports.length} {isZh ? "待处理" : "pending"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {reportsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : pendingReports.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Inbox className="h-6 w-6 mb-2 opacity-30" />
                  <p className="text-xs">{isZh ? "暂无待处理举报" : "No pending reports"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReports.map((r) => (
                    <div key={r.id as number} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm">
                      <Badge variant="outline" className="text-[10px]">{r.category as string}</Badge>
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {r.targetName ? `→ ${r.targetName}` : (isZh ? "匿名举报" : "Anonymous")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt as string).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Score */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                {isZh ? "安全态势评分" : "Security Posture Score"}
              </p>
              <p className="text-4xl font-bold text-emerald-400">
                {stats ? Math.max(0, 100 - (stats.highRiskCount * 5) - (stats.unauthorizedCount * 10)) : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1">/ 100</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
