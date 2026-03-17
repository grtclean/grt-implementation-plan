/**
 * HR Lifecycle Page - 试点B HR链路管理
 * 招聘入职→30/60/90考核→转正评估
 */

import { useState } from "react";
import { useSandboxPageEnhancements } from "@/components/Sandbox/useSandboxPageEnhancements";
import ShortcutOverlay from "@/components/Sandbox/ShortcutOverlay";
import SandboxFileImport from "@/components/Sandbox/SandboxFileImport";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users, UserPlus, ClipboardCheck, Award,
  CheckCircle2, Clock,
  ChevronRight, Briefcase, GraduationCap, Target
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// 招聘阶段映射
const stageLabels: Record<string, { label: string; color: string }> = {
  resume_screening: { label: '简历筛选', color: 'bg-gray-500' },
  phone_interview: { label: '电话面试', color: 'bg-blue-500' },
  technical_interview: { label: '技术面试', color: 'bg-purple-500' },
  hr_interview: { label: 'HR面试', color: 'bg-indigo-500' },
  final_interview: { label: '终面', color: 'bg-orange-500' },
  offer_pending: { label: '待发Offer', color: 'bg-yellow-500' },
  offer_sent: { label: '已发Offer', color: 'bg-cyan-500' },
  offer_accepted: { label: '已接受', color: 'bg-green-500' },
  offer_rejected: { label: '已拒绝', color: 'bg-red-500' },
  onboarding: { label: '入职中', color: 'bg-emerald-500' },
  withdrawn: { label: '已撤回', color: 'bg-gray-400' },
};

// 入职阶段映射
const phaseLabels: Record<string, { label: string; days: string }> = {
  '30': { label: '第一阶段', days: '1-30天' },
  '60': { label: '第二阶段', days: '31-60天' },
  '90': { label: '第三阶段', days: '61-90天' },
};

export default function HRLifecycle() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Sandbox enhancements ──
  const { shortcutOverlayOpen, setShortcutOverlayOpen, shortcuts, lastSaved, isSaving } = useSandboxPageEnhancements({
    sandboxShortcuts: [
      { key: "ctrl+n", label: "新建流程", labelEn: "New workflow", action: () => { setActiveTab("recruitment"); toast.info("切换到招聘管理 Switched to recruitment"); } },
    ],
    autoSave: {
      data: { activeTab },
      onSave: async (d) => { localStorage.setItem("grt-sb-hr", JSON.stringify(d)); },
    },
  });
  
  // 获取统计数据
  const { data: stats, isLoading: statsLoading } = (trpc.hrLifecycle as any).getHRDashboardStats.useQuery();

  // 获取岗位画像
  const { data: jobProfiles, isLoading: profilesLoading } = (trpc.hrLifecycle as any).getJobProfiles.useQuery({});

  // 获取候选人列表
  const { data: candidates, isLoading: candidatesLoading } = (trpc.hrLifecycle as any).getCandidates.useQuery({});

  // 获取入职计划
  const { data: onboardingPlans, isLoading: plansLoading } = (trpc.hrLifecycle as any).getOnboardingPlans.useQuery({});

  // 获取转正评估
  const { data: probationReviews, isLoading: reviewsLoading } = (trpc.hrLifecycle as any).getProbationReviews.useQuery({});

  // 初始化岗位画像
  const initProfileMutation = (trpc.hrLifecycle as any).initSalesProjectEngineerProfile.useMutation({
    onSuccess: () => {
      toast.success('销售与项目工程师岗位画像初始化成功');
    },
    onError: (error: any) => {
      toast.error(`初始化失败: ${error.message}`);
    }
  });

  return (
      <div className="space-y-6">
        <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} commonShortcuts={shortcuts.commonShortcuts} sandboxShortcuts={shortcuts.sandboxShortcuts} sandboxTitle="HR生命周期" />
        <PageHeader
          icon={Users}
          title={t("hr.lifecycle.title")}
          description={t("hr.lifecycle.description")}
          actions={
            <div className="flex items-center gap-2">
              <SandboxFileImport
                accept=".csv"
                label="导入花名册"
                onImport={(rows, fileName) => { toast.success(`已导入 ${rows.length} 行员工数据 (${fileName})`); }}
              />
              <Button
                onClick={() => initProfileMutation.mutate()}
                disabled={initProfileMutation.isPending}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t("hr.lifecycle.initProfile")}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label={t("hr.lifecycle.totalCandidates")} value={stats?.totalCandidates || 0} subtitle={t("hr.lifecycle.candidatesInFunnel")} />
          <StatCard icon={ClipboardCheck} label={t("hr.lifecycle.activeOnboarding")} value={stats?.activeOnboardingPlans || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" subtitle={t("hr.lifecycle.ongoingTraining")} />
          <StatCard icon={Award} label={t("hr.lifecycle.pendingProbation")} value={stats?.pendingProbationReviews || 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" subtitle={t("hr.lifecycle.awaitingHR")} />
          <StatCard icon={Target} label={t("hr.lifecycle.avgProbationScore")} value={`${stats?.avgProbationScore || 0}${t("hr.lifecycle.points")}`} iconColor="text-green-500" iconBg="bg-green-500/10" subtitle={t("hr.lifecycle.comprehensiveAssessment")} />
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <Target className="w-4 h-4 mr-2" />
              {t("hr.lifecycle.tab.overview")}
            </TabsTrigger>
            <TabsTrigger value="recruitment">
              <UserPlus className="w-4 h-4 mr-2" />
              {t("hr.lifecycle.tab.recruitment")}
            </TabsTrigger>
            <TabsTrigger value="onboarding">
              <GraduationCap className="w-4 h-4 mr-2" />
              {t("hr.lifecycle.tab.onboarding")}
            </TabsTrigger>
            <TabsTrigger value="probation">
              <Award className="w-4 h-4 mr-2" />
              {t("hr.lifecycle.tab.probation")}
            </TabsTrigger>
          </TabsList>

          {/* 总览 */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 岗位画像 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    {t("hr.lifecycle.jobProfile")}
                  </CardTitle>
                  <CardDescription>{t("hr.lifecycle.targetPosition")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {profilesLoading ? (
                    <div className="text-center py-4 text-muted-foreground">{t("hr.lifecycle.loading")}</div>
                  ) : jobProfiles && jobProfiles.length > 0 ? (
                    <div className="space-y-3">
                      {jobProfiles.map((profile: any) => (
                        <div key={profile.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{profile.job_title}</div>
                              <div className="text-sm text-muted-foreground">
                                {profile.department} · {profile.level}
                              </div>
                            </div>
                            <Badge variant={profile.is_active ? "default" : "secondary"}>
                              {profile.is_active ? t("hr.lifecycle.enabled") : t("hr.lifecycle.disabled")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {t("hr.lifecycle.noProfileData")}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 招聘漏斗 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {t("hr.lifecycle.recruitmentFunnel")}
                  </CardTitle>
                  <CardDescription>{t("hr.lifecycle.candidateDistribution")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.candidatesByStage && Object.keys(stats.candidatesByStage).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(stats.candidatesByStage).map(([stage, count]) => (
                        <div key={stage} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${stageLabels[stage]?.color || 'bg-gray-500'}`} />
                            <span className="text-sm">{stageLabels[stage]?.label || stage}</span>
                          </div>
                          <Badge variant="outline">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {t("hr.lifecycle.noCandidateData")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 入职进度概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  {t("hr.lifecycle.onboardingProgress")}
                </CardTitle>
                <CardDescription>{t("hr.lifecycle.onboardingProgressDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="text-center py-4 text-muted-foreground">{t("hr.lifecycle.loading")}</div>
                ) : onboardingPlans && onboardingPlans.length > 0 ? (
                  <div className="space-y-4">
                    {onboardingPlans.filter((p: any) => p.status === 'active').slice(0, 5).map((plan: any) => (
                      <div key={plan.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{plan.employee_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {plan.plan_code} · {phaseLabels[plan.current_phase]?.label}
                            </div>
                          </div>
                          <Badge>
                            {phaseLabels[plan.current_phase]?.days}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-16">30天</span>
                            <Progress value={plan.phase_30_completion_rate || 0} className="flex-1" />
                            <span className="text-xs w-10">{plan.phase_30_completion_rate || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-16">60天</span>
                            <Progress value={plan.phase_60_completion_rate || 0} className="flex-1" />
                            <span className="text-xs w-10">{plan.phase_60_completion_rate || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-16">90天</span>
                            <Progress value={plan.phase_90_completion_rate || 0} className="flex-1" />
                            <span className="text-xs w-10">{plan.phase_90_completion_rate || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("hr.lifecycle.noActivePlans")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 招聘管理 */}
          <TabsContent value="recruitment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("hr.lifecycle.candidateList")}</CardTitle>
                <CardDescription>{t("hr.lifecycle.candidateListDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {candidatesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">{t("hr.lifecycle.loading")}</div>
                ) : candidates && candidates.length > 0 ? (
                  <div className="space-y-3">
                    {candidates.map((candidate: any) => (
                      <div key={candidate.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {candidate.candidate_code} · {candidate.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={stageLabels[candidate.current_stage]?.color}>
                            {stageLabels[candidate.current_stage]?.label || candidate.current_stage}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("hr.lifecycle.noCandidates")}</p>
                    <p className="text-sm">{t("hr.lifecycle.addCandidateHint")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 入职培训 */}
          <TabsContent value="onboarding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("hr.lifecycle.onboardingPlanList")}</CardTitle>
                <CardDescription>{t("hr.lifecycle.onboardingPlanListDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="text-center py-4 text-muted-foreground">{t("hr.lifecycle.loading")}</div>
                ) : onboardingPlans && onboardingPlans.length > 0 ? (
                  <div className="space-y-3">
                    {onboardingPlans.map((plan: any) => (
                      <div key={plan.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{plan.employee_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {plan.plan_code} · {t("hr.lifecycle.onboardingDate")}: {plan.start_date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                              {plan.status === 'active' ? t("hr.lifecycle.statusActive") :
                               plan.status === 'completed' ? t("hr.lifecycle.statusCompleted") :
                               plan.status === 'extended' ? t("hr.lifecycle.statusExtended") : t("hr.lifecycle.statusTerminated")}
                            </Badge>
                            <Badge variant="outline">
                              {phaseLabels[plan.current_phase]?.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {plan.phase_30_completion_rate || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">{t("hr.lifecycle.completion30")}</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {plan.phase_60_completion_rate || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">{t("hr.lifecycle.completion60")}</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {plan.phase_90_completion_rate || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">{t("hr.lifecycle.completion90")}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("hr.lifecycle.noOnboardingPlans")}</p>
                    <p className="text-sm">{t("hr.lifecycle.onboardingPlanHint")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 转正评估 */}
          <TabsContent value="probation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("hr.lifecycle.probationList")}</CardTitle>
                <CardDescription>{t("hr.lifecycle.probationListDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">{t("hr.lifecycle.loading")}</div>
                ) : probationReviews && probationReviews.length > 0 ? (
                  <div className="space-y-3">
                    {probationReviews.map((review: any) => (
                      <div key={review.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Award className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{review.employee_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {review.review_code} · {t("hr.lifecycle.reviewDate")}: {review.review_date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold">{review.overall_score}{t("hr.lifecycle.points")}</div>
                              <div className="text-xs text-muted-foreground">{t("hr.lifecycle.overallScore")}</div>
                            </div>
                            <Badge variant={
                              review.result === 'pass' ? 'default' :
                              review.result === 'extend' ? 'secondary' : 'destructive'
                            }>
                              {review.result === 'pass' ? t("hr.lifecycle.resultPass") :
                               review.result === 'extend' ? t("hr.lifecycle.resultExtend") : t("hr.lifecycle.resultFail")}
                            </Badge>
                            {review.hr_approval ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("hr.lifecycle.noProbationReviews")}</p>
                    <p className="text-sm">{t("hr.lifecycle.probationReviewHint")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
