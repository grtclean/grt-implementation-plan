import React from "react";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Users,
  Settings,
  Activity,
  Database,
  Lock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  BarChart3,
  FolderKanban,
} from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { currentUserRole, permissions } = useUserProfile();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  // Real backend data — OKR dashboard
  const okrQuery = trpc.okr.dashboard.useQuery(undefined, { retry: false });
  // Real backend data — AI performance KPIs
  const perfQuery = trpc.aiPerformance.dashboard.useQuery(undefined, { retry: false });
  // Real backend data — pending budget approvals
  const budgetQuery = trpc.budgetOverrunApproval.getPendingApprovals.useQuery(undefined, { retry: false });

  if (currentUserRole !== "admin") {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Lock className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">{t("admin.accessRestricted")}</h1>
          <p className="text-muted-foreground text-center max-w-md">
            {t("admin.accessRestrictedDesc")}
          </p>
          <Button onClick={() => setLocation("/")} variant="outline">
            {t("admin.backToHome")}
          </Button>
        </div>
    );
  }

  const okrData = okrQuery.data ?? { totalObjectives: 0, avgProgress: 0, onTrack: 0, atRisk: 0, behind: 0, companyLevel: 0, buLevel: 0, deptLevel: 0, teamLevel: 0 };
  const perfData = perfQuery.data ?? { avgMeetingScore: 0, actionItemCompletionRate: 0, employeesEvaluated: 0, topPerformer: null };
  const pendingBudgets = budgetQuery.data ?? [];

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Shield}
          title={t("admin.dashboard")}
          description={t("admin.dashboardDesc")}
          actions={
            <Badge variant="destructive" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {t("admin.adminPermission")}
            </Badge>
          }
        />

        {/* KPI Overview Cards — real data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("admin.okrTotalObjectives")}</p>
                  <p className="text-2xl font-bold">{okrData.totalObjectives}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-green-500">{okrData.onTrack} {t("admin.onTrack")}</span>
                <span className="text-yellow-500">{okrData.atRisk} {t("admin.atRisk")}</span>
                <span className="text-red-500">{okrData.behind} {t("admin.behind")}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("admin.okrAvgProgress")}</p>
                  <p className="text-2xl font-bold">{okrData.avgProgress}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, okrData.avgProgress)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("admin.perfEvaluated")}</p>
                  <p className="text-2xl font-bold">{perfData.employeesEvaluated}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("admin.avgScore")}: {perfData.avgMeetingScore} | {t("admin.completionRate")}: {perfData.actionItemCompletionRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("admin.pendingBudgetApproval")}</p>
                  <p className="text-2xl font-bold">{pendingBudgets.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              {pendingBudgets.length > 0 && (
                <div className="mt-2 text-xs text-yellow-600">
                  {t("admin.latest")}: {(pendingBudgets[0] as any)?.projectName ?? "—"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* OKR Level Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                {t("admin.okrLevelDistribution")}
              </CardTitle>
              <CardDescription>{t("admin.okrLevelDistributionDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("admin.companyLevel")}</p>
                  <p className="text-xl font-bold">{okrData.companyLevel}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("admin.buLevel")}</p>
                  <p className="text-xl font-bold text-blue-500">{okrData.buLevel}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("admin.deptLevel")}</p>
                  <p className="text-xl font-bold text-green-500">{okrData.deptLevel}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("admin.personalLevel")}</p>
                  <p className="text-xl font-bold text-primary">{okrData.teamLevel}</p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setLocation("/strategy")}>
                {t("admin.viewOkrDetails")}
              </Button>
            </CardContent>
          </Card>

          {/* Top Performer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t("admin.perfOverview")}
              </CardTitle>
              <CardDescription>{t("admin.perfOverviewDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {perfData.topPerformer ? (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("admin.topPerformerMonth")}</p>
                  <p className="text-lg font-bold">{perfData.topPerformer.name}</p>
                  <p className="text-sm text-green-600">{t("admin.score")}: {perfData.topPerformer.score}</p>
                </div>
              ) : (
                <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                  {t("admin.noPerfData")}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("admin.avgScore")}</p>
                  <p className="font-bold">{perfData.avgMeetingScore}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("admin.actionCompletionRate")}</p>
                  <p className="font-bold">{perfData.actionItemCompletionRate}%</p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setLocation("/meeting-executive")}>
                {t("admin.viewPerfDetails")}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t("admin.quickActions")}
              </CardTitle>
              <CardDescription>{t("admin.quickActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/employee-management")}>
                <Users className="w-4 h-4 mr-2" />
                {t("admin.userManagement")}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/cost")}>
                <Database className="w-4 h-4 mr-2" />
                {t("admin.costCenter")}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/report-center")}>
                <Activity className="w-4 h-4 mr-2" />
                {t("admin.reportCenter")}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/strategy")}>
                <TrendingUp className="w-4 h-4 mr-2" />
                {t("admin.strategyGoals")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Permission Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.currentPermissions")}</CardTitle>
            <CardDescription>{t("admin.currentPermissionsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(permissions).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    value ? "bg-green-500/10 border-green-500/20" : "bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {value ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {key.replace("canAccess", "").replace("can", "")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
