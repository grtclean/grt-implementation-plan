/**
 * 研发验证中心 - 统一的研发验证管理页面
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Shield, CheckCircle, AlertTriangle, Zap,
  FolderKanban, FileCheck, ClipboardList, Settings,
  ChevronRight, Home, Workflow,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

import StageOverview from "./rd-verification/StageOverview";
import GateManagement from "./rd-verification/GateManagement";
import ReviewManagement from "./rd-verification/ReviewManagement";
import PullSignals from "./rd-verification/PullSignals";
import StagePipeline from "./rd-verification/StagePipeline";


export default function RDVerificationCenter() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />首页
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">研发验证中心</span>
        </nav>

        {/* 页面标题 */}
        <PageHeader icon={Shield} title="研发验证中心" description="M0-M12阶段门禁管控、检查项配置、评审管理、拉动信号" />

        {/* M0-M12 阶段流水线 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Workflow className="w-4 h-4" />项目阶段进度 (M0-M12)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StagePipeline currentStage="M4" completedStages={["M0","M1","M2","M3"]} />
          </CardContent>
        </Card>

        {/* 统计卡片区 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={FolderKanban} label="总项目数" value={5} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={Workflow} label="当前阶段分布" value="5 阶段" iconColor="text-indigo-400" iconBg="bg-indigo-500/10" />
          <StatCard icon={CheckCircle} label="门禁通过率" value="80%" iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={AlertTriangle} label="风险项目" value={1} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        </div>

        {/* 主Tab区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview"><FolderKanban className="w-4 h-4 mr-2" />项目总览</TabsTrigger>
            <TabsTrigger value="gates"><FileCheck className="w-4 h-4 mr-2" />阶段门管理</TabsTrigger>
            <TabsTrigger value="reviews"><ClipboardList className="w-4 h-4 mr-2" />评审管理</TabsTrigger>
            <TabsTrigger value="signals"><Zap className="w-4 h-4 mr-2" />拉动信号</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />设置</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><StageOverview /></TabsContent>
          <TabsContent value="gates" className="mt-6"><GateManagement /></TabsContent>
          <TabsContent value="reviews" className="mt-6"><ReviewManagement /></TabsContent>
          <TabsContent value="signals" className="mt-6"><PullSignals /></TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">检查项配置</h3>
                <p className="text-muted-foreground mb-4">管理门径检查清单模板、自动验证源配置和通知规则</p>
                <Link href="/gate-checklist-settings">
                  <a className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Settings className="w-4 h-4" />打开检查项配置
                  </a>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
