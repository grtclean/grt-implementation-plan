/**
 * 研发验证中心 - 统一的研发验证管理页面
 * 合并 StageGate、StageGateHub、StageGateHubEnhanced、ProjectGate 功能
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Shield, GitBranch, CheckCircle, AlertTriangle, Zap,
  FolderKanban, FileCheck, ClipboardList, Settings,
  ChevronRight, Home,
} from "lucide-react";

// 子组件
import StageOverview from "./rd-verification/StageOverview";
import GateManagement from "./rd-verification/GateManagement";
import ReviewManagement from "./rd-verification/ReviewManagement";
import PullSignals from "./rd-verification/PullSignals";

export default function RDVerificationCenter() {
  const [activeTab, setActiveTab] = useState("overview");

  // 统计数据
  const { data: stats, isLoading: statsLoading } = trpc.stageGate.getStats.useQuery();
  const { data: statisticsData, isLoading: gateStatsLoading } = (trpc.projectGate as any).getGateStatistics.useQuery();
  const statistics = statisticsData?.statistics || statisticsData || {};

  const totalProjects = statistics?.totalProjects || 0;
  const passRate = statistics?.passRate
    ? Math.round(
        (Object.values(statistics.passRate) as number[]).reduce((a, b) => a + b, 0) /
        Math.max(Object.values(statistics.passRate).length, 1)
      )
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
            首页
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">研发验证中心</span>
        </nav>

        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            研发验证中心
          </h1>
          <p className="text-muted-foreground mt-1">
            M0-M12阶段门禁管控、检查项配置、评审管理、拉动信号
          </p>
        </div>

        {/* 统计卡片区 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 总项目数 */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {gateStatsLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">总项目数</p>
                    <p className="text-2xl font-bold">{totalProjects}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 总检查项 */}
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {statsLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">门禁通过率</p>
                    <p className="text-2xl font-bold">{passRate}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 拉动信号 */}
          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {statsLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">拉动信号</p>
                    <p className="text-2xl font-bold">{(stats as any)?.totalSignals || 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 风险项目 */}
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {statsLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">一票否决项</p>
                    <p className="text-2xl font-bold">{(stats as any)?.mandatoryItems || 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 主Tab区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">
              <FolderKanban className="w-4 h-4 mr-2" />
              项目总览
            </TabsTrigger>
            <TabsTrigger value="gates">
              <FileCheck className="w-4 h-4 mr-2" />
              阶段门管理
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <ClipboardList className="w-4 h-4 mr-2" />
              评审管理
            </TabsTrigger>
            <TabsTrigger value="signals">
              <Zap className="w-4 h-4 mr-2" />
              拉动信号
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <StageOverview />
          </TabsContent>

          <TabsContent value="gates" className="mt-6">
            <GateManagement />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewManagement />
          </TabsContent>

          <TabsContent value="signals" className="mt-6">
            <PullSignals />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">检查项配置</h3>
                <p className="text-muted-foreground mb-4">
                  管理门径检查清单模板、自动验证源配置和通知规则
                </p>
                <Link href="/gate-checklist-settings">
                  <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Settings className="w-4 h-4" />
                    打开检查项配置
                  </a>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
