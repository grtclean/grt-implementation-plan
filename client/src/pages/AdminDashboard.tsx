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
          <h1 className="text-2xl font-bold">访问受限</h1>
          <p className="text-muted-foreground text-center max-w-md">
            此页面仅限管理员访问。请切换到管理员角色或联系系统管理员获取权限。
          </p>
          <Button onClick={() => setLocation("/")} variant="outline">
            返回首页
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
          title="管理员控制台"
          description="系统管理、用户权限和安全监控"
          actions={
            <Badge variant="destructive" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              管理员权限
            </Badge>
          }
        />

        {/* KPI Overview Cards — real data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">OKR 目标总数</p>
                  <p className="text-2xl font-bold">{okrData.totalObjectives}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-green-500">{okrData.onTrack} 正常</span>
                <span className="text-yellow-500">{okrData.atRisk} 风险</span>
                <span className="text-red-500">{okrData.behind} 滞后</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">OKR 平均进度</p>
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
                  <p className="text-sm text-muted-foreground">绩效评估人数</p>
                  <p className="text-2xl font-bold">{perfData.employeesEvaluated}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                平均分: {perfData.avgMeetingScore} | 完成率: {perfData.actionItemCompletionRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">待审批超预算</p>
                  <p className="text-2xl font-bold">{pendingBudgets.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              {pendingBudgets.length > 0 && (
                <div className="mt-2 text-xs text-yellow-600">
                  最新: {(pendingBudgets[0] as any)?.projectName ?? "—"}
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
                OKR 层级分布
              </CardTitle>
              <CardDescription>各层级目标数量</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">公司级</p>
                  <p className="text-xl font-bold">{okrData.companyLevel}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">BU级</p>
                  <p className="text-xl font-bold text-blue-500">{okrData.buLevel}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">部门级</p>
                  <p className="text-xl font-bold text-green-500">{okrData.deptLevel}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">个人级</p>
                  <p className="text-xl font-bold text-primary">{okrData.teamLevel}</p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setLocation("/strategy")}>
                查看 OKR 详情
              </Button>
            </CardContent>
          </Card>

          {/* Top Performer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                绩效概览
              </CardTitle>
              <CardDescription>AI 绩效引擎数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {perfData.topPerformer ? (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">本月最佳</p>
                  <p className="text-lg font-bold">{perfData.topPerformer.name}</p>
                  <p className="text-sm text-green-600">得分: {perfData.topPerformer.score}</p>
                </div>
              ) : (
                <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                  暂无绩效数据
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">平均分</p>
                  <p className="font-bold">{perfData.avgMeetingScore}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">待办完成率</p>
                  <p className="font-bold">{perfData.actionItemCompletionRate}%</p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setLocation("/meeting-executive")}>
                查看绩效详情
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                快捷操作
              </CardTitle>
              <CardDescription>常用管理功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/employee-management")}>
                <Users className="w-4 h-4 mr-2" />
                用户管理
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/cost")}>
                <Database className="w-4 h-4 mr-2" />
                成本中心
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/report-center")}>
                <Activity className="w-4 h-4 mr-2" />
                报表中心
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/strategy")}>
                <TrendingUp className="w-4 h-4 mr-2" />
                战略目标
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Permission Status */}
        <Card>
          <CardHeader>
            <CardTitle>当前权限状态</CardTitle>
            <CardDescription>您作为管理员拥有以下权限</CardDescription>
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
