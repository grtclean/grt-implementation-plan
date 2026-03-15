/**
 * 个人智能体中心 - 行为探针、技能推断、知识图谱、成长曲线
 * 数据源: trpc.employeeAiAssistant (getMySessions, getSkillMap, getLearningRecords, getMyAssistant, getCareerPaths)
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, Activity, Brain, Network, TrendingUp, Award, FileText, Lightbulb, Loader2, MapPin, ArrowRight } from "lucide-react";

// ==================== Fallback demo data ====================

const fallbackBehaviorLogs = [
  { id: "bl_001", context: "IDE_Code_Commit", actionData: "PLC程序优化", impliedSkill: "PLC编程 Level 4", timestamp: "2026-01-30 14:30:00" },
  { id: "bl_002", context: "CAD_Save", actionData: "喷嘴组件设计", impliedSkill: "3D建模 Level 3", timestamp: "2026-01-30 14:15:00" },
  { id: "bl_003", context: "Document_Edit", actionData: "技术方案撰写", impliedSkill: "技术文档 Level 3", timestamp: "2026-01-30 13:45:00" },
];

const fallbackSkillInferences = [
  { skill: "PLC编程", level: 4, confidence: 92, evidenceCount: 156 },
  { skill: "流体仿真", level: 5, confidence: 88, evidenceCount: 89 },
  { skill: "3D建模", level: 3, confidence: 75, evidenceCount: 45 },
  { skill: "项目管理", level: 3, confidence: 68, evidenceCount: 34 },
];

const fallbackProcessNotes = [
  { id: "pn_001", phase: "M5", problem: "清洗周期时间超标", solution: "优化喷嘴角度和压力参数", extractedKnowledge: ["喷嘴角度优化", "压力参数调整"] },
  { id: "pn_002", phase: "M7", problem: "牙膏测试不通过", solution: "增加预冲洗步骤", extractedKnowledge: ["预冲洗工艺", "牙膏测试标准"] },
];

const fallbackCareerPaths = [
  { id: 0, currentRole: "机械设计工程师", targetRole: "高级机械设计师", pathType: "vertical", progressPercentage: 65, estimatedTimeline: "12个月", requiredSkills: "3D建模,有限元分析,项目管理", status: "in_progress" },
  { id: 1, currentRole: "机械设计工程师", targetRole: "项目经理", pathType: "horizontal", progressPercentage: 30, estimatedTimeline: "24个月", requiredSkills: "项目管理,沟通协调,预算管理", status: "planning" },
];

// ==================== Loading spinner component ====================

function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      {label && <span className="text-muted-foreground text-sm">{label}</span>}
    </div>
  );
}

function DemoDataBadge() {
  return <Badge variant="outline" className="ml-2 text-xs text-amber-500 border-amber-500/40">(示例数据)</Badge>;
}

// ==================== Main component ====================

export default function PersonalAgentHub() {
  const { t } = useLanguage();
  const { roleConfig } = useUserProfile();
  const [activeTab, setActiveTab] = useState("behavior");

  // ---- tRPC queries ----
  const assistantQuery = (trpc.employeeAiAssistant as any).getMyAssistant.useQuery();
  const sessionsQuery = (trpc.employeeAiAssistant as any).getMySessions.useQuery({ limit: 50 });
  const skillMapQuery = (trpc.employeeAiAssistant as any).getSkillMap.useQuery();
  const learningQuery = (trpc.employeeAiAssistant as any).getLearningRecords.useQuery();
  const careerQuery = (trpc.employeeAiAssistant as any).getCareerPaths.useQuery();

  // ---- Derive behavior logs from sessions ----
  const { behaviorLogs, isSessionDemo } = useMemo(() => {
    const sessions = sessionsQuery.data as any[] | null | undefined;
    if (!sessions || sessions.length === 0) {
      return { behaviorLogs: fallbackBehaviorLogs, isSessionDemo: true };
    }
    const mapped = sessions.map((s: any) => ({
      id: `session_${s.id}`,
      context: s.context || "AI_Session",
      actionData: s.title || "AI会话",
      impliedSkill: s.status === "active" ? "AI辅助 进行中" : "AI辅助 已完成",
      timestamp: s.lastMessageAt || s.createdAt || "",
    }));
    return { behaviorLogs: mapped, isSessionDemo: false };
  }, [sessionsQuery.data]);

  // ---- Derive skill inferences from skill map ----
  const { skillInferences, isSkillDemo } = useMemo(() => {
    const skillData = skillMapQuery.data as { skills: any[]; totalSkills: number } | null | undefined;
    if (!skillData || !skillData.skills || skillData.skills.length === 0) {
      return { skillInferences: fallbackSkillInferences, isSkillDemo: true };
    }
    const mapped = skillData.skills.map((s: any) => ({
      skill: s.skillName || s.skillCategory || "未知技能",
      level: s.currentLevel ?? 1,
      confidence: s.lastAssessedAt ? 85 : 50, // assessed = higher confidence
      evidenceCount: s.evidence ? (typeof s.evidence === "string" ? s.evidence.split(",").length : 1) : 0,
    }));
    return { skillInferences: mapped, isSkillDemo: false };
  }, [skillMapQuery.data]);

  // ---- Derive process notes from learning records ----
  const { processNotes, isNotesDemo } = useMemo(() => {
    const records = learningQuery.data as any[] | null | undefined;
    if (!records || records.length === 0) {
      return { processNotes: fallbackProcessNotes, isNotesDemo: true };
    }
    const mapped = records.map((r: any) => ({
      id: `lr_${r.id}`,
      phase: r.contentCategory || "通用",
      problem: r.sourceReference || "学习来源",
      solution: r.learnedContent || "学习内容",
      extractedKnowledge: r.contentCategory ? [r.contentCategory] : [],
    }));
    return { processNotes: mapped, isNotesDemo: false };
  }, [learningQuery.data]);

  // ---- Derive career paths ----
  const { careerPaths, isCareerDemo } = useMemo(() => {
    const paths = careerQuery.data as any[] | null | undefined;
    if (!paths || paths.length === 0) {
      return { careerPaths: fallbackCareerPaths, isCareerDemo: true };
    }
    return { careerPaths: paths, isCareerDemo: false };
  }, [careerQuery.data]);

  // ---- Header stats from assistant + queries ----
  const assistant = assistantQuery.data as any | null | undefined;
  const hasRealData = !isSessionDemo || !isSkillDemo || !isNotesDemo;
  const totalSessions = isSessionDemo ? "1,234" : String((sessionsQuery.data as any[])?.length ?? 0);
  const totalSkills = isSkillDemo ? 12 : ((skillMapQuery.data as any)?.totalSkills ?? 0);
  const totalKnowledge = isNotesDemo ? 89 : (learningQuery.data as any[])?.length ?? 0;
  const growthIndex = isSkillDemo ? "+15%" : `${skillInferences.length} 项`;

  const isAnyLoading = sessionsQuery.isLoading || skillMapQuery.isLoading || learningQuery.isLoading || assistantQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={User}
        title={t("ai.personalAgentHub.title")}
        description={`${t("ai.personalAgentHub.description")}${assistant ? ` | ${assistant.assistantName || "个人助手"}` : ""}${roleConfig ? ` | ${roleConfig.label}` : ""}`}
        actions={
          <Button size="sm" disabled={!hasRealData}>
            <Award className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.generateCert")}
            {!hasRealData && <span className="ml-1 text-xs opacity-60">(需真实数据)</span>}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t("ai.personalAgentHub.behaviorRecords")} value={isAnyLoading ? "..." : totalSessions} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Brain} label={t("ai.personalAgentHub.inferredSkills")} value={isAnyLoading ? "..." : totalSkills} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Network} label={t("ai.personalAgentHub.knowledgeNodes")} value={isAnyLoading ? "..." : totalKnowledge} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={TrendingUp} label={t("ai.personalAgentHub.growthIndex")} value={isAnyLoading ? "..." : growthIndex} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-card border border-border">
          <TabsTrigger value="behavior"><Activity className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabBehavior")}</TabsTrigger>
          <TabsTrigger value="skills"><Brain className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabSkills")}</TabsTrigger>
          <TabsTrigger value="notes"><FileText className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabNotes")}</TabsTrigger>
          <TabsTrigger value="career"><MapPin className="w-4 h-4 mr-2" />职业路径</TabsTrigger>
          <TabsTrigger value="graph"><Network className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabGraph")}</TabsTrigger>
          <TabsTrigger value="growth"><TrendingUp className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabGrowth")}</TabsTrigger>
        </TabsList>

        {/* ==================== Behavior Tab ==================== */}
        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("ai.personalAgentHub.behaviorLogTitle")}
                {isSessionDemo && <DemoDataBadge />}
              </CardTitle>
              <CardDescription>{t("ai.personalAgentHub.behaviorLogDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsQuery.isLoading ? (
                <LoadingSpinner label="加载行为记录..." />
              ) : (
                <div className="space-y-3">
                  {behaviorLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <Activity className="w-8 h-8 text-primary/50" />
                        <div>
                          <p className="font-medium">{log.actionData}</p>
                          <p className="text-sm text-muted-foreground">{t("ai.personalAgentHub.context")}: {log.context}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{log.impliedSkill}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Skills Tab ==================== */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("ai.personalAgentHub.skillInferTitle")}
                {isSkillDemo && <DemoDataBadge />}
              </CardTitle>
              <CardDescription>{t("ai.personalAgentHub.skillInferDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {skillMapQuery.isLoading ? (
                <LoadingSpinner label="加载技能数据..." />
              ) : (
                <div className="space-y-4">
                  {skillInferences.map((skill: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{skill.skill}</span>
                          <Badge>Level {skill.level}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{t("ai.personalAgentHub.confidence")}: {skill.confidence}% · {t("ai.personalAgentHub.evidence")}: {skill.evidenceCount}{t("ai.personalAgentHub.evidenceCount")}</span>
                      </div>
                      <Progress value={skill.confidence} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Notes Tab ==================== */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("ai.personalAgentHub.notesTitle")}
                {isNotesDemo && <DemoDataBadge />}
              </CardTitle>
              <CardDescription>{t("ai.personalAgentHub.notesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {learningQuery.isLoading ? (
                <LoadingSpinner label="加载学习记录..." />
              ) : (
                <div className="space-y-3">
                  {processNotes.map((note: any) => (
                    <div key={note.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{note.phase}</Badge>
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                      </div>
                      <p className="font-medium text-red-400 mb-1">{t("ai.personalAgentHub.problemLabel")}: {note.problem}</p>
                      <p className="text-green-400 mb-2">{t("ai.personalAgentHub.solutionLabel")}: {note.solution}</p>
                      <div className="flex gap-2">
                        {(note.extractedKnowledge || []).map((k: string, i: number) => (
                          <Badge key={i} variant="secondary">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Career Paths Tab ==================== */}
        <TabsContent value="career" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                职业发展路径
                {isCareerDemo && <DemoDataBadge />}
              </CardTitle>
              <CardDescription>基于技能评估和岗位要求,AI推荐的职业发展方向</CardDescription>
            </CardHeader>
            <CardContent>
              {careerQuery.isLoading ? (
                <LoadingSpinner label="加载职业路径..." />
              ) : (
                <div className="space-y-4">
                  {careerPaths.map((path: any) => (
                    <div key={path.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{path.currentRole}</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <Badge>{path.targetRole}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={path.pathType === "vertical" ? "default" : "secondary"}>
                            {path.pathType === "vertical" ? "纵向发展" : "横向转型"}
                          </Badge>
                          <Badge variant={path.status === "in_progress" ? "default" : "outline"}>
                            {path.status === "in_progress" ? "进行中" : path.status === "planning" ? "规划中" : path.status === "completed" ? "已完成" : path.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>完成进度</span>
                          <span className="font-medium">{path.progressPercentage ?? 0}%</span>
                        </div>
                        <Progress value={path.progressPercentage ?? 0} className="h-2" />
                        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                          <span>预计周期: {path.estimatedTimeline || "待定"}</span>
                          {path.requiredSkills && (
                            <div className="flex gap-1">
                              {String(path.requiredSkills).split(",").slice(0, 3).map((s: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Graph Tab ==================== */}
        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("ai.personalAgentHub.graphTitle")}</CardTitle><CardDescription>{t("ai.personalAgentHub.graphDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">{t("ai.personalAgentHub.graphPlaceholder")}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Growth Tab ==================== */}
        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("ai.personalAgentHub.growthTitle")}</CardTitle><CardDescription>{t("ai.personalAgentHub.growthDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">{t("ai.personalAgentHub.growthPlaceholder")}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
