import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
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
import { useLanguage } from "@/contexts/LanguageContext";

// 能力域配置 — use i18n keys, resolved at render time
const DOMAINS_CONFIG: Record<string, { nameKey: string; fullName: string; color: string }> = {
  T: { nameKey: "hr.capPath.domainT", fullName: "Technology", color: "#f97316" },
  S: { nameKey: "hr.capPath.domainS", fullName: "System Understanding", color: "#3b82f6" },
  D: { nameKey: "hr.capPath.domainD", fullName: "Delivery", color: "#22c55e" },
  C: { nameKey: "hr.capPath.domainC", fullName: "Customer Value", color: "#a855f7" },
  K: { nameKey: "hr.capPath.domainK", fullName: "Knowledge Precipitation", color: "#eab308" },
  L: { nameKey: "hr.capPath.domainL", fullName: "Leadership/Influence", color: "#ec4899" },
};

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function CapabilityPathRecommendation() {
  const { t } = useLanguage();
  // 获取路径推荐 (DB-backed)
  const recommendationQuery = trpc.capabilityOs.getPathRecommendation.useQuery(undefined, QUERY_OPTS);

  const recommendation = recommendationQuery.data as any;
  const isLoading = recommendationQuery.isLoading;

  if (isLoading || !recommendation) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">{t("hr.capPath.loading")}</p>
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Sparkles}
          title={t("hr.capPath.title")}
          description={t("hr.capPath.subtitle")}
        />

        {/* AI分析卡片 */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("hr.capPath.aiAnalysis")}
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
                {t("hr.capPath.weakAreas")}
              </CardTitle>
              <CardDescription>{t("hr.capPath.weakAreasDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendation.weakestDomains.map((domain: any) => {
                const config = DOMAINS_CONFIG[domain.code];
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
                      <p className="text-xs text-yellow-500">{t("hr.capPath.gap")} {domain.gap}</p>
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
                {t("hr.capPath.strengths")}
              </CardTitle>
              <CardDescription>{t("hr.capPath.strengthsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendation.strongestDomains.length > 0 ? (
                recommendation.strongestDomains.map((domain: any) => {
                  const config = DOMAINS_CONFIG[domain.code];
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
                  {t("hr.capPath.noStrengths")}
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
              {t("hr.capPath.tabPath")}
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="h-4 w-4" />
              {t("hr.capPath.tabProjects")}
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {t("hr.capPath.tabTraining")}
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
                    {t("hr.capPath.shortTerm")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendation.recommendedPath.shortTerm.map((action: any, index: number) => {
                      const config = DOMAINS_CONFIG[action.domain];
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
                                {config ? t(config.nameKey) : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t("hr.capPath.expectedPoints")} +{action.expectedPoints}
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
                    {t("hr.capPath.midTerm")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendation.recommendedPath.midTerm.map((action: any, index: number) => {
                      const config = DOMAINS_CONFIG[action.domain];
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
                                {config ? t(config.nameKey) : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t("hr.capPath.expectedPoints")} +{action.expectedPoints}
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
                    {t("hr.capPath.longTerm")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendation.recommendedPath.longTerm.map((action: any, index: number) => {
                      const config = DOMAINS_CONFIG[action.domain];
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
                                {config ? t(config.nameKey) : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t("hr.capPath.expectedPoints")} +{action.expectedPoints}
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
                <CardTitle>{t("hr.capPath.projectOpportunities")}</CardTitle>
                <CardDescription>{t("hr.capPath.projectOpportunitiesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendation.projectOpportunities.map((project: any) => {
                    const config = DOMAINS_CONFIG[project.requiredDomains[0]];
                    return (
                      <Card key={project.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: config?.color }}
                            >
                              {config ? t(config.nameKey) : ""}
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
                                ? t("hr.capPath.difficultyEasy")
                                : project.difficulty === "medium"
                                  ? t("hr.capPath.difficultyMedium")
                                  : t("hr.capPath.difficultyHard")}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h4 className="font-semibold mb-2">{project.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("hr.capPath.requireLevel")} L{project.requiredLevel}+
                            </span>
                            <span className="font-bold text-primary">+{project.potentialPoints}{t("hr.capPath.points")}</span>
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
                <CardTitle>{t("hr.capPath.trainingResources")}</CardTitle>
                <CardDescription>{t("hr.capPath.trainingResourcesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendation.trainingResources.map((resource: any) => {
                    const config = DOMAINS_CONFIG[resource.targetDomain];
                    return (
                      <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="px-2 py-1 rounded text-xs text-white"
                              style={{ backgroundColor: config?.color }}
                            >
                              {config ? t(config.nameKey) : ""}
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
                                ? t("hr.capPath.typeOnline")
                                : resource.type === "offline"
                                  ? t("hr.capPath.typeOffline")
                                  : t("hr.capPath.typePractice")}
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
                            <span className="font-medium">{t("hr.capPath.targetLevel")} L{resource.targetLevel}</span>
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
  );
}
