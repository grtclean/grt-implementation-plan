/**
 * HR Lifecycle Page - 试点B HR链路管理
 * 招聘入职→30/60/90考核→转正评估
 */

import { useState } from "react";
import Layout from "@/components/Layout";
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
  const [activeTab, setActiveTab] = useState("dashboard");
  
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
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="HR链路管理"
          description="试点B：招聘入职→30/60/90考核→转正评估全流程管理"
          actions={
            <Button
              onClick={() => initProfileMutation.mutate()}
              disabled={initProfileMutation.isPending}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              初始化岗位画像
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="候选人总数" value={stats?.totalCandidates || 0} subtitle="招聘漏斗中的候选人" />
          <StatCard icon={ClipboardCheck} label="活跃入职计划" value={stats?.activeOnboardingPlans || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" subtitle="正在进行的入职培训" />
          <StatCard icon={Award} label="待审批转正" value={stats?.pendingProbationReviews || 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" subtitle="等待HR审批" />
          <StatCard icon={Target} label="平均转正评分" value={`${stats?.avgProbationScore || 0}分`} iconColor="text-green-500" iconBg="bg-green-500/10" subtitle="综合能力评估" />
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <Target className="w-4 h-4 mr-2" />
              总览
            </TabsTrigger>
            <TabsTrigger value="recruitment">
              <UserPlus className="w-4 h-4 mr-2" />
              招聘管理
            </TabsTrigger>
            <TabsTrigger value="onboarding">
              <GraduationCap className="w-4 h-4 mr-2" />
              入职培训
            </TabsTrigger>
            <TabsTrigger value="probation">
              <Award className="w-4 h-4 mr-2" />
              转正评估
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
                    岗位画像
                  </CardTitle>
                  <CardDescription>目标岗位：销售与项目工程师</CardDescription>
                </CardHeader>
                <CardContent>
                  {profilesLoading ? (
                    <div className="text-center py-4 text-muted-foreground">加载中...</div>
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
                              {profile.is_active ? '启用' : '停用'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      暂无岗位画像，请点击"初始化岗位画像"按钮
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 招聘漏斗 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    招聘漏斗
                  </CardTitle>
                  <CardDescription>各阶段候选人分布</CardDescription>
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
                      暂无候选人数据
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
                  入职培训进度
                </CardTitle>
                <CardDescription>30/60/90天入职计划执行情况</CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="text-center py-4 text-muted-foreground">加载中...</div>
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
                    暂无活跃的入职计划
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 招聘管理 */}
          <TabsContent value="recruitment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>候选人列表</CardTitle>
                <CardDescription>招聘漏斗中的所有候选人</CardDescription>
              </CardHeader>
              <CardContent>
                {candidatesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">加载中...</div>
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
                    <p>暂无候选人</p>
                    <p className="text-sm">添加候选人开始招聘流程</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 入职培训 */}
          <TabsContent value="onboarding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>入职计划列表</CardTitle>
                <CardDescription>30/60/90天入职培训计划</CardDescription>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="text-center py-4 text-muted-foreground">加载中...</div>
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
                                {plan.plan_code} · 入职日期: {plan.start_date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                              {plan.status === 'active' ? '进行中' : 
                               plan.status === 'completed' ? '已完成' : 
                               plan.status === 'extended' ? '已延期' : '已终止'}
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
                            <div className="text-xs text-muted-foreground">30天完成率</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {plan.phase_60_completion_rate || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">60天完成率</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                              {plan.phase_90_completion_rate || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">90天完成率</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无入职计划</p>
                    <p className="text-sm">候选人接受Offer后自动创建入职计划</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 转正评估 */}
          <TabsContent value="probation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>转正评估列表</CardTitle>
                <CardDescription>90天入职期满后的转正评估</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">加载中...</div>
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
                                {review.review_code} · 评估日期: {review.review_date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold">{review.overall_score}分</div>
                              <div className="text-xs text-muted-foreground">综合评分</div>
                            </div>
                            <Badge variant={
                              review.result === 'pass' ? 'default' :
                              review.result === 'extend' ? 'secondary' : 'destructive'
                            }>
                              {review.result === 'pass' ? '通过' :
                               review.result === 'extend' ? '延期' : '不通过'}
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
                    <p>暂无转正评估</p>
                    <p className="text-sm">员工完成90天入职期后进入转正评估</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
