import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

// 能力域配置
const DOMAINS: Record<string, { name: string; fullName: string; color: string }> = {
  T: { name: "技术能力", fullName: "Technology", color: "#f97316" },
  S: { name: "系统理解", fullName: "System Understanding", color: "#3b82f6" },
  D: { name: "交付能力", fullName: "Delivery", color: "#22c55e" },
  C: { name: "客户价值", fullName: "Customer Value", color: "#a855f7" },
  K: { name: "知识沉淀", fullName: "Knowledge Precipitation", color: "#eab308" },
  L: { name: "领导力", fullName: "Leadership/Influence", color: "#ec4899" },
};

// 模拟推荐数据
const MOCK_RECOMMENDATION = {
  userId: "user1",
  currentCapabilities: {
    T: { level: 3, points: 450 },
    S: { level: 2, points: 180 },
    D: { level: 3, points: 380 },
    C: { level: 2, points: 150 },
    K: { level: 1, points: 60 },
    L: { level: 1, points: 40 },
  },
  weakestDomains: [
    { code: "K", name: "知识沉淀", level: 1, gap: 1.5 },
    { code: "L", name: "领导力", level: 1, gap: 1.5 },
    { code: "C", name: "客户价值", level: 2, gap: 0.5 },
  ],
  strongestDomains: [
    { code: "T", name: "技术能力", level: 3 },
    { code: "D", name: "交付能力", level: 3 },
  ],
  recommendedPath: {
    shortTerm: [
      { action: "完成知识沉淀基础培训课程", domain: "K", expectedPoints: 30 },
      { action: "参与1个知识沉淀相关的简单项目", domain: "K", expectedPoints: 50 },
      { action: "完成领导力基础培训课程", domain: "L", expectedPoints: 30 },
    ],
    midTerm: [
      { action: "独立完成2-3个知识沉淀相关项目", domain: "K", expectedPoints: 150 },
      { action: "获取知识沉淀领域的专业认证", domain: "K", expectedPoints: 100 },
      { action: "独立完成2-3个客户价值相关项目", domain: "C", expectedPoints: 150 },
    ],
    longTerm: [
      { action: "成为知识沉淀领域的内部专家", domain: "K", expectedPoints: 200 },
      { action: "指导新人在知识沉淀领域的成长", domain: "K", expectedPoints: 100 },
    ],
  },
  projectOpportunities: [
    {
      id: "k1",
      name: "技术文档编写",
      description: "编写技术文档和操作手册",
      requiredDomains: ["K"],
      requiredLevel: 1,
      potentialPoints: 30,
      difficulty: "easy",
    },
    {
      id: "c1",
      name: "客户需求调研",
      description: "参与客户需求调研和分析",
      requiredDomains: ["C"],
      requiredLevel: 1,
      potentialPoints: 40,
      difficulty: "easy",
    },
    {
      id: "l1",
      name: "项目协调角色",
      description: "担任项目协调角色，锻炼协调能力",
      requiredDomains: ["L"],
      requiredLevel: 2,
      potentialPoints: 60,
      difficulty: "medium",
    },
  ],
  trainingResources: [
    {
      id: "kr1",
      name: "技术写作课程",
      description: "学习技术文档写作规范",
      targetDomain: "K",
      targetLevel: 2,
      duration: "4小时",
      type: "online",
    },
    {
      id: "lr1",
      name: "团队管理基础课程",
      description: "学习团队管理基础知识",
      targetDomain: "L",
      targetLevel: 2,
      duration: "8小时",
      type: "online",
    },
    {
      id: "cr1",
      name: "客户沟通技巧课程",
      description: "学习专业的客户沟通技巧",
      targetDomain: "C",
      targetLevel: 2,
      duration: "6小时",
      type: "online",
    },
  ],
  aiAnalysis:
    "根据您的能力数据分析，您在技术能力(T)和交付能力(D)方面表现优秀，已达到L3等级。建议优先提升知识沉淀(K)和领导力(L)两个短板领域。可以通过编写技术文档、参与内部培训等方式积累知识沉淀积分；通过担任项目协调角色来锻炼领导力。预计3-6个月内可以将这两个领域提升至L2等级。",
  generatedAt: new Date().toISOString(),
};

export default function CapabilityPathRecommendation() {
  // 获取路径推荐
  const recommendationQuery = trpc.capabilityOs.getPathRecommendation.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 使用模拟数据或真实数据
  // 确保数据有效：如果后端返回空数组或无效数据，使用模拟数据
  const rawData = recommendationQuery.data;
  const isValidData = rawData && 
    typeof rawData === 'object' && 
    !Array.isArray(rawData) && 
    rawData.recommendedPath && 
    rawData.weakestDomains;
  const recommendation = isValidData ? rawData : MOCK_RECOMMENDATION;
  const isLoading = recommendationQuery.isLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">AI正在分析您的能力数据...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Link href="/capability-os">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading">能力发展路径推荐</h1>
            <p className="text-muted-foreground">AI-Powered Capability Development Path</p>
          </div>
        </div>

        {/* AI分析卡片 */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI智能分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{recommendation.aiAnalysis}</p>
          </CardContent>
        </Card>

        {/* 能力概览 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 能力短板 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-500">
                <Target className="h-5 w-5" />
                需要提升的领域
              </CardTitle>
              <CardDescription>这些领域是您当前的能力短板</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendation.weakestDomains.map((domain: any) => {
                const config = DOMAINS[domain.code];
                return (
                  <div
                    key={domain.code}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: config?.color }}
                      >
                        {domain.code}
                      </div>
                      <div>
                        <p className="font-medium">{domain.name}</p>
                        <p className="text-xs text-muted-foreground">{config?.fullName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">L{domain.level}</span>
                      <p className="text-xs text-yellow-500">差距 {domain.gap}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 能力优势 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <TrendingUp className="h-5 w-5" />
                您的能力优势
              </CardTitle>
              <CardDescription>这些领域是您的核心竞争力</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendation.strongestDomains.length > 0 ? (
                recommendation.strongestDomains.map((domain: any) => {
                  const config = DOMAINS[domain.code];
                  return (
                    <div
                      key={domain.code}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: config?.color }}
                        >
                          {domain.code}
                        </div>
                        <div>
                          <p className="font-medium">{domain.name}</p>
                          <p className="text-xs text-muted-foreground">{config?.fullName}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-500">L{domain.level}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  继续积累经验，培养您的核心优势
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 发展路径和资源 */}
        <Tabs defaultValue="path" className="space-y-4">
          <TabsList>
            <TabsTrigger value="path" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              发展路径
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="h-4 w-4" />
              项目机会
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <BookOpen className="h-4 w-4" />
              培训资源
            </TabsTrigger>
          </TabsList>

          {/* 发展路径 */}
          <TabsContent value="path">
            <div className="space-y-6">
              {/* 短期行动 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    短期行动 (1-3个月)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendation.recommendedPath.shortTerm.map((action: any, index: number) => {
                      const config = DOMAINS[action.domain];
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{action.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{ backgroundColor: config?.color }}
                              >
                                {config?.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                预计积分 +{action.expectedPoints}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 中期行动 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    中期行动 (3-6个月)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendation.recommendedPath.midTerm.map((action: any, index: number) => {
                      const config = DOMAINS[action.domain];
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{action.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{ backgroundColor: config?.color }}
                              >
                                {config?.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                预计积分 +{action.expectedPoints}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 长期行动 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    长期行动 (6-12个月)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendation.recommendedPath.longTerm.map((action: any, index: number) => {
                      const config = DOMAINS[action.domain];
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{action.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{ backgroundColor: config?.color }}
                              >
                                {config?.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                预计积分 +{action.expectedPoints}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 项目机会 */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>推荐项目机会</CardTitle>
                <CardDescription>参与这些项目可以快速积累能力积分</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendation.projectOpportunities.map((project: any) => {
                    const config = DOMAINS[project.requiredDomains[0]];
                    return (
                      <Card key={project.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: config?.color }}
                            >
                              {config?.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                project.difficulty === "easy"
                                  ? "bg-green-500/20 text-green-500"
                                  : project.difficulty === "medium"
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {project.difficulty === "easy"
                                ? "简单"
                                : project.difficulty === "medium"
                                  ? "中等"
                                  : "困难"}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h4 className="font-semibold mb-2">{project.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              要求 L{project.requiredLevel}+
                            </span>
                            <span className="font-bold text-primary">+{project.potentialPoints}分</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 培训资源 */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle>推荐培训资源</CardTitle>
                <CardDescription>通过培训快速提升能力等级</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendation.trainingResources.map((resource: any) => {
                    const config = DOMAINS[resource.targetDomain];
                    return (
                      <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: config?.color }}
                            >
                              {config?.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                resource.type === "online"
                                  ? "bg-blue-500/20 text-blue-500"
                                  : resource.type === "offline"
                                    ? "bg-purple-500/20 text-purple-500"
                                    : "bg-green-500/20 text-green-500"
                              }`}
                            >
                              {resource.type === "online"
                                ? "在线"
                                : resource.type === "offline"
                                  ? "线下"
                                  : "实操"}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h4 className="font-semibold mb-2">{resource.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {resource.duration}
                            </span>
                            <span className="font-medium">目标 L{resource.targetLevel}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
