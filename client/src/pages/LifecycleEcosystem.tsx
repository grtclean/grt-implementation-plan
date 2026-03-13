import { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Rocket, Star, BookOpen, Target, Award, Users, ChevronRight,
  Heart, Compass, TrendingUp, MessageSquare, Calendar, Eye,
  Palette, Sparkles, GraduationCap, Shield, Clock, CheckCircle2,
  ArrowRight, Play, Briefcase, Globe, UserCheck, Crown, Lightbulb,
} from "lucide-react";

// G-stage config
const STAGE_CONFIG: Record<string, { icon: typeof Rocket; color: string; bgColor: string }> = {
  G1: { icon: Compass, color: "text-blue-500", bgColor: "bg-blue-50" },
  G2: { icon: Rocket, color: "text-green-500", bgColor: "bg-green-50" },
  G3: { icon: Heart, color: "text-pink-500", bgColor: "bg-pink-50" },
  G4: { icon: BookOpen, color: "text-indigo-500", bgColor: "bg-indigo-50" },
  G5: { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  G6: { icon: TrendingUp, color: "text-orange-500", bgColor: "bg-orange-50" },
  G7: { icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-50" },
  G8: { icon: Shield, color: "text-cyan-500", bgColor: "bg-cyan-50" },
  G9: { icon: Target, color: "text-violet-500", bgColor: "bg-violet-50" },
  G10: { icon: Award, color: "text-amber-500", bgColor: "bg-amber-50" },
  G11: { icon: Sparkles, color: "text-fuchsia-500", bgColor: "bg-fuchsia-50" },
  G12: { icon: Briefcase, color: "text-teal-500", bgColor: "bg-teal-50" },
  G13: { icon: Users, color: "text-sky-500", bgColor: "bg-sky-50" },
  G14: { icon: GraduationCap, color: "text-purple-500", bgColor: "bg-purple-50" },
  G15: { icon: Globe, color: "text-rose-500", bgColor: "bg-rose-50" },
  G16: { icon: Eye, color: "text-slate-600", bgColor: "bg-slate-50" },
  G17: { icon: Lightbulb, color: "text-lime-600", bgColor: "bg-lime-50" },
  G18: { icon: Crown, color: "text-gold-500", bgColor: "bg-yellow-50" },
  G19: { icon: UserCheck, color: "text-gray-500", bgColor: "bg-gray-50" },
  G20: { icon: Heart, color: "text-red-500", bgColor: "bg-red-50" },
};

function getStageConfig(code: string) {
  return STAGE_CONFIG[code] ?? { icon: Star, color: "text-gray-500", bgColor: "bg-gray-50" };
}

export default function LifecycleEcosystem() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("portal");
  const [selectedStageCode, setSelectedStageCode] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // ── Data queries ──
  const myJourney = trpc.lifecycleEcosystem.journey.getMy.useQuery();
  const myMilestones = trpc.lifecycleEcosystem.milestone.getMy.useQuery();
  const myFeed = trpc.lifecycleEcosystem.activity.getMyFeed.useQuery({ limit: 20 });
  const templates = trpc.lifecycleEcosystem.template.list.useQuery();
  const mySummary = trpc.lifecycleEcosystem.dashboard.getMySummary.useQuery();

  const journey = myJourney.data;
  const milestones = myMilestones.data ?? [];
  const activities = myFeed.data ?? [];
  const allTemplates = templates.data ?? [];
  const summary = mySummary.data;

  const currentTemplate = allTemplates.find(t => t.stageCode === journey?.currentStage);

  // ── Tab 1: Personal Portal (个人生命旅程门户) ──
  function PortalTab() {
    if (!journey) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Rocket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">欢迎来到GRT生命旅程</h3>
            <p className="text-muted-foreground">您的旅程尚未初始化，请联系HR或部门主管开启您的G1阶段</p>
          </CardContent>
        </Card>
      );
    }

    const cfg = getStageConfig(journey.currentStage);
    const StageIcon = cfg.icon;
    const completedCount = milestones.filter(m => m.status === "completed").length;
    const progressPct = milestones.length > 0 ? Math.round((completedCount / Math.max(milestones.length, 1)) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <Card className={`${cfg.bgColor} border-0`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm ${cfg.color}`}>
                    <StageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{journey.employeeName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {journey.department} · {journey.position} · {journey.currentStage} {journey.currentStageName}
                    </p>
                  </div>
                </div>
                {journey.personalMotto && (
                  <p className="italic text-sm mt-3 text-muted-foreground">"{journey.personalMotto}"</p>
                )}
                {journey.careerVision && (
                  <p className="text-sm mt-2">{journey.careerVision}</p>
                )}
              </div>
              <Badge variant="outline" className={`${cfg.color} font-bold text-lg px-3 py-1`}>
                {journey.currentStage}
              </Badge>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>旅程进度</span>
                <span>{completedCount}/{milestones.length} 阶段完成 ({progressPct}%)</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{summary?.stats.completedStages ?? 0}</p>
              <p className="text-xs text-muted-foreground">完成阶段</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{summary?.stats.totalDocuments ?? 0}</p>
              <p className="text-xs text-muted-foreground">学习文档</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{Math.round((summary?.stats.totalLearningMinutes ?? 0) / 60)}h</p>
              <p className="text-xs text-muted-foreground">学习时长</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{activities.length}</p>
              <p className="text-xs text-muted-foreground">活动记录</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Stage Narrative */}
        {currentTemplate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <StageIcon className={`w-5 h-5 ${cfg.color}`} />
                当前阶段: {currentTemplate.stageName} — {currentTemplate.stageSubtitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentTemplate.narrative && (
                <div className="bg-muted/30 p-4 rounded-lg text-sm leading-relaxed">
                  {currentTemplate.narrative}
                </div>
              )}
              {currentTemplate.companyMissionLink && (
                <div className="flex items-start gap-2 text-sm">
                  <Target className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                  <span>{currentTemplate.companyMissionLink}</span>
                </div>
              )}
              {currentTemplate.cultureMessage && (
                <div className="flex items-start gap-2 text-sm">
                  <Heart className="w-4 h-4 mt-0.5 text-pink-500 shrink-0" />
                  <span className="italic">{currentTemplate.cultureMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Persona Traits */}
        {journey.personaTraits && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">人物画像</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">原动力类型</p>
                  <Badge variant="secondary">{(journey.personaTraits as any).driveType}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">学习风格</p>
                  <Badge variant="secondary">{(journey.personaTraits as any).learningStyle}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">工作风格</p>
                  <Badge variant="secondary">{(journey.personaTraits as any).workStyle}</Badge>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-muted-foreground text-sm mb-1">优势标签</p>
                <div className="flex flex-wrap gap-1">
                  {((journey.personaTraits as any)?.strengthTags ?? []).map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.slice(0, 8).map(act => (
                <div key={act.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{act.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {act.stageCode && <Badge variant="outline" className="mr-1 text-xs">{act.stageCode}</Badge>}
                      {act.activityType} · {act.occurredAt ? new Date(act.occurredAt).toLocaleDateString("zh-CN") : ""}
                    </p>
                  </div>
                  {act.isPinned && <Star className="w-4 h-4 text-yellow-500 shrink-0" />}
                </div>
              ))}
              {activities.length === 0 && <p className="text-muted-foreground text-sm">暂无活动记录</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Tab 2: G1-G20 Timeline (旅程时间轴) ──
  function TimelineTab() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">G1—G20 员工生命旅程</CardTitle>
            <CardDescription>做全球最好的工业洁净系统 · 工程师文化为底蕴 · 公平公开学习为公司哲学基础</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />

              {allTemplates.map((tmpl, idx) => {
                const cfg = getStageConfig(tmpl.stageCode);
                const Icon = cfg.icon;
                const milestone = milestones.find(m => m.stageCode === tmpl.stageCode);
                const isCurrent = journey?.currentStage === tmpl.stageCode;
                const isCompleted = milestone?.status === "completed";

                return (
                  <div
                    key={tmpl.stageCode}
                    className={`relative pl-16 pb-8 cursor-pointer hover:bg-muted/20 rounded-lg p-3 transition-colors ${
                      isCurrent ? "bg-muted/30 ring-1 ring-primary/20" : ""
                    }`}
                    onClick={() => setSelectedStageCode(tmpl.stageCode)}
                  >
                    {/* Node */}
                    <div className={`absolute left-3 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                      isCompleted ? "bg-green-500 border-green-500 text-white" :
                      isCurrent ? `${cfg.bgColor} border-primary ${cfg.color}` :
                      "bg-white border-muted-foreground/30 text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"} className="text-xs">
                        {tmpl.stageCode}
                      </Badge>
                      <span className="font-semibold text-sm">{tmpl.stageName}</span>
                      <span className="text-xs text-muted-foreground">{tmpl.stageNameEn}</span>
                      {isCurrent && <Badge className="ml-auto bg-primary/10 text-primary text-xs">当前阶段</Badge>}
                      {isCompleted && milestone?.managerRating && (
                        <div className="ml-auto flex gap-0.5">
                          {Array.from({ length: milestone.managerRating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{tmpl.stageSubtitle}</p>
                    {milestone?.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        完成于 {new Date(milestone.completedAt).toLocaleDateString("zh-CN")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stage Detail Dialog */}
        {selectedStageCode && <StageDetailPanel stageCode={selectedStageCode} onClose={() => setSelectedStageCode(null)} />}
      </div>
    );
  }

  // ── Stage Detail Panel ──
  function StageDetailPanel({ stageCode, onClose }: { stageCode: string; onClose: () => void }) {
    const tmplQuery = trpc.lifecycleEcosystem.template.getByCode.useQuery({ stageCode });
    const tmpl = tmplQuery.data;
    const milestone = milestones.find(m => m.stageCode === stageCode);
    const cfg = getStageConfig(stageCode);
    const Icon = cfg.icon;

    if (!tmpl) return null;

    return (
      <Card className="mt-4">
        <CardHeader className={cfg.bgColor}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${cfg.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{tmpl.stageCode} {tmpl.stageName} — {tmpl.stageNameEn}</CardTitle>
                <CardDescription>{tmpl.stageSubtitle}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Narrative */}
          {tmpl.narrative && (
            <div className="bg-muted/20 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-line">
              {tmpl.narrative}
            </div>
          )}

          {/* Mission & Culture */}
          <div className="grid grid-cols-2 gap-4">
            {tmpl.companyMissionLink && (
              <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-blue-50">
                <Target className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 mb-1">使命关联</p>
                  <p>{tmpl.companyMissionLink}</p>
                </div>
              </div>
            )}
            {tmpl.cultureMessage && (
              <div className="flex items-start gap-2 text-sm p-3 rounded-lg bg-pink-50">
                <Heart className="w-4 h-4 mt-0.5 text-pink-500 shrink-0" />
                <div>
                  <p className="font-medium text-pink-700 mb-1">文化寄语</p>
                  <p className="italic">{tmpl.cultureMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Default Daily Tools */}
          {tmpl.defaultDailyTools && (tmpl.defaultDailyTools as any[]).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">每日工具</h4>
              <div className="grid grid-cols-2 gap-2">
                {(tmpl.defaultDailyTools as any[]).map((tool: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border">
                    <Play className="w-3 h-3 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{tool.tool}</p>
                      <p className="text-xs text-muted-foreground">{tool.description} · {tool.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Objectives */}
          {tmpl.defaultObjectives && (tmpl.defaultObjectives as any[]).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">阶段目标</h4>
              {(tmpl.defaultObjectives as any[]).map((group: any, gi: number) => (
                <div key={gi} className="mb-2">
                  <Badge variant="outline" className="mb-1 text-xs">{group.role}</Badge>
                  <div className="space-y-1 ml-2">
                    {(group.objectives ?? []).map((obj: any, oi: number) => (
                      <div key={oi} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                        <span>{obj.title}</span>
                        <Badge variant="secondary" className="text-xs">{obj.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Achievement */}
          {tmpl.achievementBadge && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
              <Award className="w-8 h-8 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-700">{tmpl.achievementTitle}</p>
                <p className="text-sm text-muted-foreground">完成后获得: {tmpl.achievementBadge}</p>
              </div>
            </div>
          )}

          {/* Milestone Review (if exists) */}
          {milestone && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-semibold">个人里程碑记录</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">状态</p>
                  <Badge variant={milestone.status === "completed" ? "default" : "outline"}>{milestone.status}</Badge>
                </div>
                {milestone.stageKpiScore && (
                  <div>
                    <p className="text-muted-foreground">KPI得分</p>
                    <p className="font-bold">{milestone.stageKpiScore}</p>
                  </div>
                )}
                {milestone.managerRating && (
                  <div>
                    <p className="text-muted-foreground">主管评分</p>
                    <div className="flex">
                      {Array.from({ length: milestone.managerRating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {milestone.managerReview && (
                <div className="bg-muted/20 p-3 rounded text-sm">
                  <p className="text-muted-foreground text-xs mb-1">主管评语</p>
                  {milestone.managerReview}
                </div>
              )}
              {milestone.hrbpNotes && (
                <div className="bg-muted/20 p-3 rounded text-sm">
                  <p className="text-muted-foreground text-xs mb-1">HRBP备注</p>
                  {milestone.hrbpNotes}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Tab 3: Stage Templates (模板管理) ──
  function TemplateManagementTab() {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">G1-G20 阶段模板管理</CardTitle>
            <CardDescription>公司统一设定各阶段的目标、工具、叙事和文化价值，主管可按需调整</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {allTemplates.map(tmpl => {
                const cfg = getStageConfig(tmpl.stageCode);
                const Icon = cfg.icon;
                return (
                  <div
                    key={tmpl.stageCode}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${cfg.bgColor}`}
                    onClick={() => setSelectedStageCode(tmpl.stageCode)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className="font-semibold text-sm">{tmpl.stageCode}</span>
                      <span className="text-sm">{tmpl.stageName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.stageSubtitle}</p>
                    <div className="flex gap-1 mt-2">
                      {tmpl.achievementBadge && <Badge variant="outline" className="text-xs">{tmpl.achievementBadge}</Badge>}
                      <Badge variant="secondary" className="text-xs">
                        {tmpl.typicalStartMonth != null ? `M${tmpl.typicalStartMonth}` : ""}
                        {tmpl.typicalEndMonth != null ? `—M${tmpl.typicalEndMonth}` : "+"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedStageCode && <StageDetailPanel stageCode={selectedStageCode} onClose={() => setSelectedStageCode(null)} />}
      </div>
    );
  }

  // ── Tab 4: Team View (团队旅程总览) ──
  function TeamViewTab() {
    const teamQuery = trpc.lifecycleEcosystem.journey.list.useQuery({
      search: teamSearch || undefined,
      limit: 50,
    });
    const companyHealth = trpc.lifecycleEcosystem.dashboard.getCompanyHealth.useQuery();
    const teamJourneys = teamQuery.data?.rows ?? [];
    const health = companyHealth.data;

    return (
      <div className="space-y-6">
        {/* Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">公司旅程健康度</CardTitle>
            <CardDescription>在职员工生命周期阶段分布 · 共{health?.totalJourneys ?? 0}人</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {(health?.stageDistribution ?? []).map((item: any) => {
                const cfg = getStageConfig(item.stage);
                const Icon = cfg.icon;
                return (
                  <div key={item.stage} className={`p-2 rounded text-center ${cfg.bgColor}`}>
                    <Icon className={`w-4 h-4 mx-auto ${cfg.color}`} />
                    <p className="font-bold text-lg">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.stage}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search + List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">团队成员旅程</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="搜索员工姓名..."
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              className="mb-4"
            />
            <div className="space-y-2">
              {teamJourneys.map(j => {
                const cfg = getStageConfig(j.currentStage);
                const Icon = cfg.icon;
                return (
                  <div
                    key={j.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/20 cursor-pointer"
                    onClick={() => setSelectedUserId(j.userId)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bgColor}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{j.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{j.department} · {j.position}</p>
                    </div>
                    <Badge variant="outline">{j.currentStage} {j.currentStageName}</Badge>
                    <Badge variant={j.status === "active" ? "default" : "secondary"} className="text-xs">{j.status}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
              {teamJourneys.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">暂无数据</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Tab 5: Manager Review (主管审阅) ──
  function ManagerReviewTab() {
    const [reviewMilestoneId, setReviewMilestoneId] = useState<number | null>(null);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState(4);

    const managerReviewMutation = trpc.lifecycleEcosystem.milestone.managerReview.useMutation();
    const hrbpReviewMutation = trpc.lifecycleEcosystem.milestone.hrbpReview.useMutation();

    const pendingJourneys = trpc.lifecycleEcosystem.journey.list.useQuery({ limit: 20 });
    const journeys = pendingJourneys.data?.rows ?? [];

    function handleSubmitReview() {
      if (!reviewMilestoneId || !reviewText) return;
      managerReviewMutation.mutate({
        milestoneId: reviewMilestoneId,
        review: reviewText,
        rating: reviewRating,
      }, {
        onSuccess: () => {
          setReviewMilestoneId(null);
          setReviewText("");
        },
      });
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">员工旅程审阅</CardTitle>
            <CardDescription>审阅并优化下属员工的生命旅程里程碑，确保员工被关注和激励</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {journeys.map(j => {
                const cfg = getStageConfig(j.currentStage);
                const Icon = cfg.icon;
                return (
                  <div key={j.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bgColor}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{j.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{j.department} · {j.currentStage} {j.currentStageName}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedUserId(j.userId)}>
                        <Eye className="w-3 h-3 mr-1" /> 查看详情
                      </Button>
                    </div>
                    {j.personaTraits && (
                      <div className="text-xs flex gap-2 mt-1">
                        <Badge variant="secondary">{(j.personaTraits as any).driveType}</Badge>
                        <Badge variant="secondary">{(j.personaTraits as any).workStyle}</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Review Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">提交评审</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">里程碑ID</label>
              <Input
                type="number"
                value={reviewMilestoneId ?? ""}
                onChange={e => setReviewMilestoneId(Number(e.target.value) || null)}
                placeholder="输入里程碑ID"
              />
            </div>
            <div>
              <label className="text-sm font-medium">评分</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setReviewRating(r)}
                    className={`p-1 ${r <= reviewRating ? "text-yellow-500" : "text-gray-300"}`}>
                    <Star className="w-5 h-5" fill={r <= reviewRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">评语</label>
              <Textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="输入对该员工阶段的评价和建议..."
                rows={3}
              />
            </div>
            <Button onClick={handleSubmitReview} disabled={!reviewMilestoneId || !reviewText}>
              <MessageSquare className="w-4 h-4 mr-1" /> 提交评审
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Tab 6: Integration Dashboard (生态集成) ──
  function IntegrationTab() {
    const knowledgeReqs = trpc.lifecycleEcosystem.integration.getStageKnowledgeRequirements.useQuery({
      role: journey?.role ?? "production_engineer",
      stageCode: journey?.currentStage ?? "G2",
    }, { enabled: !!journey });

    const reqs = knowledgeReqs.data ?? [];

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">生态集成 — 三大平台协同</CardTitle>
            <CardDescription>员工生命旅程 × 知识合规平台 × 高管绩效总览 深度联动</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <a href="/lifecycle-ecosystem" className="block p-4 rounded-lg border bg-green-50 hover:shadow-sm transition-shadow">
                <Rocket className="w-8 h-8 text-green-500 mb-2" />
                <h4 className="font-semibold text-sm">生命旅程生态</h4>
                <p className="text-xs text-muted-foreground">G1-G20 全生命周期管理</p>
              </a>
              <a href="/knowledge-compliance" className="block p-4 rounded-lg border bg-blue-50 hover:shadow-sm transition-shadow">
                <BookOpen className="w-8 h-8 text-blue-500 mb-2" />
                <h4 className="font-semibold text-sm">知识合规平台</h4>
                <p className="text-xs text-muted-foreground">文档·技能·测试·授权</p>
              </a>
              <a href="/executive-review" className="block p-4 rounded-lg border bg-purple-50 hover:shadow-sm transition-shadow">
                <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
                <h4 className="font-semibold text-sm">高管绩效总览</h4>
                <p className="text-xs text-muted-foreground">公司·部门·员工KPI</p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Stage Knowledge Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              当前阶段({journey?.currentStage})岗位知识要求
            </CardTitle>
            <CardDescription>根据您的岗位和当前生命旅程阶段，自动匹配知识合规平台的学习要求</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reqs.map((req: any) => (
                <div key={req.id} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <Badge variant={req.importance === "must_know" ? "destructive" : req.importance === "should_know" ? "default" : "secondary"} className="text-xs shrink-0">
                    {req.importance === "must_know" ? "必须掌握" : req.importance === "should_know" ? "应当了解" : "建议学习"}
                  </Badge>
                  <div className="flex-1">
                    <p>{req.docTitle}</p>
                    <p className="text-xs text-muted-foreground">Lv{req.skillLevel} · {req.mastery}</p>
                  </div>
                  <a href="/knowledge-compliance">
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              ))}
              {reqs.length === 0 && <p className="text-muted-foreground text-sm">暂无匹配的知识要求</p>}
            </div>
          </CardContent>
        </Card>

        {/* Integration Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">协同流程</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded bg-muted/20">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs shrink-0">1</div>
                <div>
                  <p className="font-medium">生命旅程阶段驱动学习</p>
                  <p className="text-muted-foreground">G阶段升级 → 自动匹配知识合规平台的新一级技能要求和学习文档</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded bg-muted/20">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs shrink-0">2</div>
                <div>
                  <p className="font-medium">知识掌握反馈旅程</p>
                  <p className="text-muted-foreground">理论测试通过 + 学习进度完成 → 活动流记录 → 里程碑目标自动勾选</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded bg-muted/20">
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs shrink-0">3</div>
                <div>
                  <p className="font-medium">绩效评估驱动阶段晋升</p>
                  <p className="text-muted-foreground">高管绩效总览的KPI/任务数据 → 主管审阅旅程 → 判断是否推进到下一G阶段</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded bg-muted/20">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shrink-0">4</div>
                <div>
                  <p className="font-medium">个人画像持续优化</p>
                  <p className="text-muted-foreground">学习偏好 + 绩效表现 + 项目经历 → AI人物画像更新 → 个性化成长路径推荐</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">员工生命旅程生态系统</h1>
          <p className="text-muted-foreground text-sm">G1—G20 · 做全球最好的工业洁净系统 · 最有效的资源创造生产力</p>
        </div>
        {journey && (
          <Badge variant="outline" className="text-lg px-4 py-1 font-bold">
            {journey.currentStage} {journey.currentStageName}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="portal">个人门户</TabsTrigger>
          <TabsTrigger value="timeline">旅程时间轴</TabsTrigger>
          <TabsTrigger value="templates">阶段模板</TabsTrigger>
          <TabsTrigger value="team">团队总览</TabsTrigger>
          <TabsTrigger value="review">主管审阅</TabsTrigger>
          <TabsTrigger value="integration">生态集成</TabsTrigger>
        </TabsList>

        <TabsContent value="portal"><PortalTab /></TabsContent>
        <TabsContent value="timeline"><TimelineTab /></TabsContent>
        <TabsContent value="templates"><TemplateManagementTab /></TabsContent>
        <TabsContent value="team"><TeamViewTab /></TabsContent>
        <TabsContent value="review"><ManagerReviewTab /></TabsContent>
        <TabsContent value="integration"><IntegrationTab /></TabsContent>
      </Tabs>
    </div>
  );
}
