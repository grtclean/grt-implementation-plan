/**
 * v2.5.34 M7-M9交付跟踪仪表盘
 * 功能：预验收Gate检查、现场安装跟踪、最终验收管理
 *
 * Data source: trpc.m7m9.delivery.* / trpc.m7m9.siteIssue.* / trpc.m7m9.gateCheck.* (DB-backed)
 */

import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Shield,
  Target,
  Truck,
  Wrench,
  AlertTriangle,
  Camera,
  MessageSquare,
  Bot
} from "lucide-react";
import { useState } from "react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function M7M9DeliveryTrack() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("gate");

  // ─── tRPC Queries ───
  const deliveriesQuery = trpc.m7m9.delivery.list.useQuery({ page: 1, pageSize: 10 }, QUERY_OPTS);
  const statsQuery = trpc.m7m9.delivery.getStats.useQuery(undefined, QUERY_OPTS);
  const issuesQuery = trpc.m7m9.siteIssue.list.useQuery({ page: 1, pageSize: 20 }, QUERY_OPTS);
  const issueStatsQuery = trpc.m7m9.siteIssue.getStats.useQuery({}, QUERY_OPTS);

  const deliveries = (deliveriesQuery.data as any)?.items ?? [];
  const latestDelivery = deliveries[0] ?? null;
  const issues = (issuesQuery.data as any)?.items ?? [];
  const stats = statsQuery.data as any;
  const issueStats = issueStatsQuery.data as any;

  const isLoading = deliveriesQuery.isLoading;

  // Derive milestones from latest delivery
  const currentStage = latestDelivery?.currentStage ?? "M7_Pre_Acceptance";
  const stageOrder = ["M7_Pre_Acceptance", "M8_Installation", "M9_Final_Acceptance", "Completed"];
  const currentStageIdx = stageOrder.indexOf(currentStage);

  const milestones = [
    {
      stage: "M7", name: "预验收",
      status: currentStageIdx > 0 ? "Completed" : currentStageIdx === 0 ? "In_Progress" : "Pending",
      date: latestDelivery?.plannedM7Date ? new Date(latestDelivery.plannedM7Date).toLocaleDateString("zh-CN") : "—",
      progress: currentStageIdx > 0 ? 100 : currentStageIdx === 0 ? 65 : 0,
    },
    {
      stage: "M8", name: "现场安装",
      status: currentStageIdx > 1 ? "Completed" : currentStageIdx === 1 ? "In_Progress" : "Pending",
      date: latestDelivery?.plannedM8Date ? new Date(latestDelivery.plannedM8Date).toLocaleDateString("zh-CN") : "—",
      progress: currentStageIdx > 1 ? 100 : currentStageIdx === 1 ? 50 : 0,
    },
    {
      stage: "M9", name: "最终验收",
      status: currentStageIdx > 2 ? "Completed" : currentStageIdx === 2 ? "In_Progress" : "Pending",
      date: latestDelivery?.plannedM9Date ? new Date(latestDelivery.plannedM9Date).toLocaleDateString("zh-CN") : "—",
      progress: currentStageIdx > 2 ? 100 : currentStageIdx === 2 ? 30 : 0,
    },
  ];

  const decisionColors = createStatusColorMap({
    Green_Light: "green",
    Conditional_Pass: "yellow",
    Blocked_Issue: "red",
  });

  const decisionLabels: Record<string, string> = {
    Green_Light: "通过",
    Conditional_Pass: "有条件通过",
    Blocked_Issue: "阻塞",
  };

  const issueStatusColors = createStatusColorMap({
    Open: "red",
    Investigating: "blue",
    In_Progress: "blue",
    Pending_Approval: "yellow",
    Resolved: "green",
    Closed: "green",
    Escalated: "red",
  });

  const issueStatusLabels: Record<string, string> = {
    Open: "待处理",
    Investigating: "调查中",
    In_Progress: "处理中",
    Pending_Approval: "待审批",
    Resolved: "已解决",
    Closed: "已关闭",
    Escalated: "已升级",
  };

  const getMilestoneStatus = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "In_Progress": return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "Pending": return <Clock className="w-5 h-5 text-gray-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Truck} title="M7-M9 交付跟踪仪表盘" description="加载中..." />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Truck}
          title="M7-M9 交付跟踪仪表盘"
          description="Gatekeeper AI · Site Copilot AI · 预验收/安装/最终验收全流程管理"
          actions={
            <>
              <Button variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                上传现场照片
              </Button>
              <Button>
                <Bot className="w-4 h-4 mr-2" />
                AI助手
              </Button>
            </>
          }
        />

        {/* 项目概览 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={FileText} label="项目编号" value={latestDelivery?.projectNo ?? "—"} />
          <StatCard icon={Users} label="客户" value={latestDelivery?.customerName ?? "—"} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Target} label="当前阶段" value={currentStage.replace(/_/g, " ")} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Truck} label="总交付单" value={stats?.total ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={AlertTriangle} label="阻塞问题" value={stats?.blocked ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* 里程碑进度 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">交付里程碑</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      milestone.status === "Completed" ? "border-green-500 bg-green-500/10" :
                      milestone.status === "In_Progress" ? "border-blue-500 bg-blue-500/10" :
                      "border-gray-300 bg-gray-100"
                    }`}>
                      {getMilestoneStatus(milestone.status)}
                    </div>
                    <p className="font-bold mt-2">{milestone.stage}</p>
                    <p className="text-sm text-muted-foreground">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">{milestone.date}</p>
                    {milestone.status === "In_Progress" && (
                      <div className="w-full mt-2">
                        <Progress value={milestone.progress} className="h-1" />
                        <p className="text-xs text-center mt-1">{milestone.progress}%</p>
                      </div>
                    )}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                      milestone.status === "Completed" ? "bg-green-500" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 详细内容Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gate">
              <Shield className="w-4 h-4 mr-2" />
              Gate检查
            </TabsTrigger>
            <TabsTrigger value="issues">
              <AlertTriangle className="w-4 h-4 mr-2" />
              现场问题 ({issueStats?.total ?? 0})
            </TabsTrigger>
            <TabsTrigger value="copilot">
              <Bot className="w-4 h-4 mr-2" />
              AI助手
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="w-4 h-4 mr-2" />
              交付文档
            </TabsTrigger>
          </TabsList>

          {/* Gate检查Tab */}
          <TabsContent value="gate" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Gatekeeper AI 检查
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>阶段分布:</span>
                    {stats?.byStage && Object.entries(stats.byStage).map(([stage, count]: [string, any]) => (
                      <Badge key={stage} variant="outline" className="text-xs">
                        {stage.replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  选择一个交付单并点击执行AI Gate检查，系统将自动分析清洁度报告、节拍验证、PLC数据、开放问题等。
                </p>
                {deliveries.length > 0 ? (
                  <div className="space-y-3">
                    {deliveries.slice(0, 5).map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{d.deliveryCode ?? d.projectNo}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.customerName ?? "—"} · {d.currentStage?.replace(/_/g, " ")} · {d.status}
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          d.status === "Blocked" ? "text-red-500 border-red-500/30" :
                          d.status === "In_Progress" ? "text-blue-500 border-blue-500/30" :
                          d.status === "Completed" ? "text-green-500 border-green-500/30" :
                          "text-gray-500"
                        }>
                          {d.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">暂无交付记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 现场问题Tab */}
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">现场问题清单</CardTitle>
                  <Button size="sm">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    新建问题
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Issue stats summary */}
                {issueStats && (
                  <div className="flex gap-4 mb-4 text-sm">
                    {Object.entries(issueStats.byStatus ?? {}).map(([status, count]: [string, any]) => (
                      count > 0 && (
                        <Badge key={status} variant="outline" className="text-xs">
                          {issueStatusLabels[status] ?? status}: {count}
                        </Badge>
                      )
                    ))}
                  </div>
                )}
                <div className="space-y-4">
                  {issues.map((issue: any) => (
                    <div key={issue.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{(issue.issueCategory ?? issue.category ?? "").replace(/_/g, " ")}</Badge>
                          <StatusBadge color={issueStatusColors[(issue.status ?? "") as keyof typeof issueStatusColors] ?? "gray"}>
                            {issueStatusLabels[issue.status] ?? issue.status}
                          </StatusBadge>
                          <Badge variant={issue.severity === "High" || issue.severity === "Critical" ? "destructive" : "secondary"}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {issue.createdAt ? new Date(issue.createdAt).toLocaleString("zh-CN") : "—"}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{issue.title ?? issue.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {issue.reportedByName ? `报告人: ${issue.reportedByName}` : ""}
                        </span>
                        <Button size="sm" variant="outline">
                          <Bot className="w-4 h-4 mr-2" />
                          AI分析
                        </Button>
                      </div>
                    </div>
                  ))}
                  {issues.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">暂无现场问题</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI助手Tab */}
          <TabsContent value="copilot">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Site Copilot AI 现场助手
                </CardTitle>
                <CardDescription>
                  智能问题诊断、解决方案推荐、根因分析
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      快速诊断
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      描述现场问题，AI将提供诊断和解决方案
                    </p>
                    <textarea
                      className="w-full p-2 border rounded-lg text-sm"
                      rows={3}
                      placeholder="描述您遇到的问题..."
                    />
                    <Button className="w-full mt-2">
                      <Bot className="w-4 h-4 mr-2" />
                      获取AI建议
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      常见问题
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        如何处理缺件问题？
                      </li>
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        设备调试不达标怎么办？
                      </li>
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        客户临时变更需求如何处理？
                      </li>
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        质量缺陷现场修复流程
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-bold mb-2">AI能力说明</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">问题分类</span>
                      <p className="text-xs text-muted-foreground">自动识别问题类型</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">根因分析</span>
                      <p className="text-xs text-muted-foreground">深度分析问题根源</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">解决方案</span>
                      <p className="text-xs text-muted-foreground">SOP格式解决步骤</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">相似案例</span>
                      <p className="text-xs text-muted-foreground">历史案例参考</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 交付文档Tab */}
          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">交付文档清单</CardTitle>
                <CardDescription>Technical Writer AI 自动生成的交付文档</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "操作手册", status: "已生成", version: "v1.2", date: "2024-06-08" },
                    { name: "维护SOP", status: "已生成", version: "v1.0", date: "2024-06-08" },
                    { name: "故障排除指南", status: "已生成", version: "v1.1", date: "2024-06-10" },
                    { name: "备件清单", status: "已生成", version: "v1.0", date: "2024-06-08" },
                    { name: "培训材料", status: "待生成", version: "-", date: "-" },
                    { name: "验收报告", status: "待生成", version: "-", date: "-" },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.version !== "-" ? `${doc.version} · ${doc.date}` : "待生成"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={doc.status === "已生成" ? "bg-green-500" : "bg-gray-500"}>
                          {doc.status}
                        </Badge>
                        {doc.status === "已生成" && (
                          <Button size="sm" variant="outline">下载</Button>
                        )}
                        {doc.status === "待生成" && (
                          <Button size="sm">
                            <Bot className="w-4 h-4 mr-2" />
                            AI生成
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
