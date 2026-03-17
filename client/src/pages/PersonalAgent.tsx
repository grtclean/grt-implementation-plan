/**
 * 个人智能体与YDW数据映射页面
 * 功能：行为探针日志、过程笔记、技能推断、能力画像
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState } from "react";
import {
  Brain, Activity, FileText, Plus, Eye, RefreshCw,
  Code, Cpu, Lightbulb, TrendingUp, Clock, User,
  BookOpen, Target, Zap, GitBranch, Search, Sparkles
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";

const skillLevelColorMap = createStatusColorMap({
  "4": "green",
  "5": "green",
  "3": "blue",
  "2": "yellow",
  "1": "gray",
  "0": "gray",
});

export default function PersonalAgent() {
  const { t } = useLanguage();
  const { user } = useAuth();

  // 行为上下文类型
  const BEHAVIOR_CONTEXTS = [
    { id: "IDE_Code_Commit", name: t("ai.personalAgent.codeCommit"), icon: Code },
    { id: "CAD_Save", name: t("ai.personalAgent.cadSave"), icon: Cpu },
    { id: "Document_Edit", name: t("ai.personalAgent.docEdit"), icon: FileText },
    { id: "Meeting_Attend", name: t("ai.personalAgent.meetingAttend"), icon: User },
    { id: "Training_Complete", name: t("ai.personalAgent.trainingComplete"), icon: BookOpen },
    { id: "Project_Milestone", name: t("ai.personalAgent.projectMilestone"), icon: Target },
  ];
  const [activeTab, setActiveTab] = useState("profile");
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 新建过程笔记表单
  const [newNote, setNewNote] = useState({
    projectPhase: "",
    problemDesc: "",
    solutionDesc: "",
  });

  // tRPC查询
  const { data: stats } = trpc.personalAgent.getStats.useQuery() as { data: any };
  const { data: behaviorLogs, refetch: refetchLogs } = trpc.personalAgent.getBehaviorLogs.useQuery({
    page: 1,
    pageSize: 20,
  });
  const { data: processNotes, refetch: refetchNotes } = trpc.personalAgent.getProcessNotes.useQuery({
    page: 1,
    pageSize: 20,
  });
  const { data: skillProfile } = (trpc.personalAgent as any).getSkillProfile.useQuery();

  // tRPC mutations
  const createNoteMutation = trpc.personalAgent.createProcessNote.useMutation({
    onSuccess: () => {
      toast.success(t("ai.personalAgent.noteSaved"));
      setShowAddNoteDialog(false);
      setNewNote({ projectPhase: "", problemDesc: "", solutionDesc: "" });
      refetchNotes();
    },
    onError: (error) => {
      toast.error(`${t("ai.personalAgent.saveFailed")}: ${error.message}`);
    },
  });

  const extractKnowledgeMutation = (trpc.personalAgent as any).extractKnowledge.useMutation({
    onSuccess: () => {
      toast.success(t("ai.personalAgent.knowledgeExtracted"));
      refetchNotes();
    },
    onError: (error: any) => {
      toast.error(`${t("ai.personalAgent.extractFailed")}: ${error.message}`);
    },
  });

  const inferSkillMutation = (trpc.personalAgent as any).inferSkillFromBehavior.useMutation({
    onSuccess: (data: any) => {
      toast.success(`${t("ai.personalAgent.inferredSkills")}: ${data.impliedSkill}`);
      refetchLogs();
    },
    onError: (error: any) => {
      toast.error(`${t("ai.personalAgent.inferFailed")}: ${error.message}`);
    },
  });

  // 获取上下文图标
  const getContextIcon = (context: string) => {
    const found = BEHAVIOR_CONTEXTS.find((c) => c.id === context);
    return found?.icon || Activity;
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  // 计算技能等级颜色
  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return "text-green-400";
    if (level >= 3) return "text-blue-400";
    if (level >= 2) return "text-yellow-400";
    return "text-gray-400";
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Brain}
          title={t("ai.personalAgent.title")}
          description={t("ai.personalAgent.description")}
          actions={
            <Button variant="outline" onClick={() => { refetchLogs(); refetchNotes(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("ai.personalAgent.refresh")}
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Activity} label={t("ai.personalAgent.behaviorRecords")} value={stats?.totalBehaviors || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={FileText} label={t("ai.personalAgent.processNotes")} value={stats?.totalNotes || 0} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Lightbulb} label={t("ai.personalAgent.inferredSkills")} value={stats?.inferredSkills || 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={Brain} label={t("ai.personalAgent.knowledgeExtraction")} value={stats?.extractedKnowledge || 0} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              {t("ai.personalAgent.tabProfile")}
            </TabsTrigger>
            <TabsTrigger value="behaviors">
              <Activity className="w-4 h-4 mr-2" />
              {t("ai.personalAgent.tabBehaviors")}
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4 mr-2" />
              {t("ai.personalAgent.tabNotes")}
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <Lightbulb className="w-4 h-4 mr-2" />
              {t("ai.personalAgent.tabKnowledge")}
            </TabsTrigger>
          </TabsList>

          {/* 能力画像 */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 用户信息卡片 */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t("ai.personalAgent.personalInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{user?.name || t("ai.personalAgent.notLoggedIn")}</h3>
                      <p className="text-sm text-muted-foreground">
                        DID: {user?.openId?.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("ai.personalAgent.role")}</span>
                      <Badge>{user?.role || "user"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("ai.personalAgent.registerTime")}</span>
                      <span>{user?.createdAt ? formatTime(user.createdAt) : "-"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 技能雷达 */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {t("ai.personalAgent.skillLevel")}
                  </CardTitle>
                  <CardDescription>
                    {t("ai.personalAgent.skillLevelDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: t("ai.personalAgent.skillTech"), level: skillProfile?.technology || 0 },
                      { name: t("ai.personalAgent.skillSystem"), level: skillProfile?.systemUnderstanding || 0 },
                      { name: t("ai.personalAgent.skillDelivery"), level: skillProfile?.delivery || 0 },
                      { name: t("ai.personalAgent.skillCustomer"), level: skillProfile?.customerValue || 0 },
                      { name: t("ai.personalAgent.skillKnowledge"), level: skillProfile?.knowledge || 0 },
                      { name: t("ai.personalAgent.skillLeadership"), level: skillProfile?.leadership || 0 },
                    ].map((skill) => (
                      <div key={skill.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{skill.name}</span>
                          <span className={getSkillLevelColor(skill.level)}>
                            L{skill.level}
                          </span>
                        </div>
                        <Progress value={(skill.level / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 最近技能成长 */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t("ai.personalAgent.recentGrowth")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skillProfile?.recentGrowth?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {t("ai.personalAgent.noGrowthRecord")}
                    </p>
                  ) : (
                    skillProfile?.recentGrowth?.map((growth: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <div>
                            <p className="font-medium">{growth.skill}</p>
                            <p className="text-xs text-muted-foreground">{growth.evidence}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-400">
                          +{growth.points} {t("ai.personalAgent.points")}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 行为探针 */}
          <TabsContent value="behaviors" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {t("ai.personalAgent.behaviorLogTitle")}
                </CardTitle>
                <CardDescription>
                  {t("ai.personalAgent.behaviorLogDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {behaviorLogs?.items?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("ai.personalAgent.noBehaviorRecords")}</p>
                      <p className="text-sm mt-2">{t("ai.personalAgent.noBehaviorRecordsHint")}</p>
                    </div>
                  ) : (
                    behaviorLogs?.items?.map((log: any) => {
                      const ContextIcon = getContextIcon(log.context);
                      return (
                        <div key={log.id} className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <ContextIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{log.context}</span>
                                  {log.implied_skill && (
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      {log.implied_skill}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(log.timestamp)}
                                </p>
                                {log.action_data && (
                                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono max-h-20 overflow-auto">
                                    {JSON.stringify(log.action_data, null, 2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!log.implied_skill && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => inferSkillMutation.mutate({ behaviorId: log.id })}
                                disabled={inferSkillMutation.isPending}
                              >
                                <Brain className="w-4 h-4 mr-1" />
                                {t("ai.personalAgent.inferSkill")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 过程笔记 */}
          <TabsContent value="notes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("ai.personalAgent.searchNotes")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("ai.personalAgent.newNote")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("ai.personalAgent.newNoteTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("ai.personalAgent.newNoteDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("ai.personalAgent.projectPhase")}</Label>
                      <Input
                        value={newNote.projectPhase}
                        onChange={(e) => setNewNote({ ...newNote, projectPhase: e.target.value })}
                        placeholder={t("ai.personalAgent.projectPhasePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("ai.personalAgent.problemDesc")}</Label>
                      <Textarea
                        value={newNote.problemDesc}
                        onChange={(e) => setNewNote({ ...newNote, problemDesc: e.target.value })}
                        placeholder={t("ai.personalAgent.problemDescPlaceholder")}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("ai.personalAgent.solutionDesc")}</Label>
                      <Textarea
                        value={newNote.solutionDesc}
                        onChange={(e) => setNewNote({ ...newNote, solutionDesc: e.target.value })}
                        placeholder={t("ai.personalAgent.solutionDescPlaceholder")}
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
                      {t("ai.personalAgent.cancel")}
                    </Button>
                    <Button
                      onClick={() => createNoteMutation.mutate({
                        projectPhase: newNote.projectPhase,
                        problemDesc: newNote.problemDesc,
                        solutionDesc: newNote.solutionDesc,
                      })}
                      disabled={createNoteMutation.isPending}
                    >
                      {createNoteMutation.isPending ? t("ai.personalAgent.saving") : t("ai.personalAgent.save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {processNotes?.items?.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("ai.personalAgent.noNotes")}</p>
                    <p className="text-sm mt-2">{t("ai.personalAgent.noNotesHint")}</p>
                  </CardContent>
                </Card>
              ) : (
                processNotes?.items?.map((note: any) => (
                  <Card key={note.id} className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{note.project_phase}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(note.created_at)}
                          </span>
                        </div>
                        {!note.ai_extracted_knowledge && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => extractKnowledgeMutation.mutate({ noteId: note.id })}
                            disabled={extractKnowledgeMutation.isPending}
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            {t("ai.personalAgent.aiExtractKnowledge")}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-red-400 mb-1">{t("ai.personalAgent.problem")}</p>
                          <p className="text-sm">{note.problem_desc}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-400 mb-1">{t("ai.personalAgent.solution")}</p>
                          <p className="text-sm">{note.solution_desc}</p>
                        </div>
                        {note.ai_extracted_knowledge && (
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-1">
                              <Brain className="w-4 h-4" />
                              {t("ai.personalAgent.aiExtractedKnowledge")}
                            </p>
                            <div className="text-sm">
                              {typeof note.ai_extracted_knowledge === "object" ? (
                                <pre className="text-xs font-mono overflow-auto">
                                  {JSON.stringify(note.ai_extracted_knowledge, null, 2)}
                                </pre>
                              ) : (
                                <p>{note.ai_extracted_knowledge}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* 知识图谱 */}
          <TabsContent value="knowledge" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  {t("ai.personalAgent.knowledgeGraphTitle")}
                </CardTitle>
                <CardDescription>
                  {t("ai.personalAgent.knowledgeGraphDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t("ai.personalAgent.knowledgeGraphVis")}</p>
                  <p className="text-sm mt-2">
                    {t("ai.personalAgent.knowledgeGraphHint")}
                  </p>
                  <div className="mt-6 flex justify-center gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats?.extractedKnowledge || 0}</p>
                      <p className="text-xs">{t("ai.personalAgent.knowledgeNodes")}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">0</p>
                      <p className="text-xs">{t("ai.personalAgent.knowledgeLinks")}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-purple-400">0</p>
                      <p className="text-xs">{t("ai.personalAgent.skillMappings")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
