/**
 * 个人智能体与YDW数据映射页面
 * 功能：行为探针日志、过程笔记、技能推断、能力画像
 */

import { useAuth } from "@/_core/hooks/useAuth";
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

// 行为上下文类型
const BEHAVIOR_CONTEXTS = [
  { id: "IDE_Code_Commit", name: "代码提交", icon: Code },
  { id: "CAD_Save", name: "CAD保存", icon: Cpu },
  { id: "Document_Edit", name: "文档编辑", icon: FileText },
  { id: "Meeting_Attend", name: "会议参与", icon: User },
  { id: "Training_Complete", name: "培训完成", icon: BookOpen },
  { id: "Project_Milestone", name: "项目里程碑", icon: Target },
];

const skillLevelColorMap = createStatusColorMap({
  "4": "green",
  "5": "green",
  "3": "blue",
  "2": "yellow",
  "1": "gray",
  "0": "gray",
});

export default function PersonalAgent() {
  const { user } = useAuth();
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
      toast.success("过程笔记已保存");
      setShowAddNoteDialog(false);
      setNewNote({ projectPhase: "", problemDesc: "", solutionDesc: "" });
      refetchNotes();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const extractKnowledgeMutation = (trpc.personalAgent as any).extractKnowledge.useMutation({
    onSuccess: () => {
      toast.success("知识提取完成");
      refetchNotes();
    },
    onError: (error) => {
      toast.error(`提取失败: ${error.message}`);
    },
  });

  const inferSkillMutation = (trpc.personalAgent as any).inferSkillFromBehavior.useMutation({
    onSuccess: (data) => {
      toast.success(`技能推断完成: ${data.impliedSkill}`);
      refetchLogs();
    },
    onError: (error) => {
      toast.error(`推断失败: ${error.message}`);
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
          title="个人智能体"
          description="行为探针、过程笔记、技能推断与知识提取"
          actions={
            <Button variant="outline" onClick={() => { refetchLogs(); refetchNotes(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="行为记录" value={stats?.totalBehaviors || 0} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={FileText} label="过程笔记" value={stats?.totalNotes || 0} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Lightbulb} label="推断技能" value={stats?.inferredSkills || 0} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={Brain} label="知识提取" value={stats?.extractedKnowledge || 0} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              能力画像
            </TabsTrigger>
            <TabsTrigger value="behaviors">
              <Activity className="w-4 h-4 mr-2" />
              行为探针
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4 mr-2" />
              过程笔记
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <Lightbulb className="w-4 h-4 mr-2" />
              知识图谱
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
                    个人信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{user?.name || "未登录"}</h3>
                      <p className="text-sm text-muted-foreground">
                        DID: {user?.openId?.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">角色</span>
                      <Badge>{user?.role || "user"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">注册时间</span>
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
                    技能等级 (L1-L5)
                  </CardTitle>
                  <CardDescription>
                    基于行为数据自动推断的能力等级
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "技术能力 (T)", level: skillProfile?.technology || 0 },
                      { name: "系统理解 (S)", level: skillProfile?.systemUnderstanding || 0 },
                      { name: "交付能力 (D)", level: skillProfile?.delivery || 0 },
                      { name: "客户价值 (C)", level: skillProfile?.customerValue || 0 },
                      { name: "知识沉淀 (K)", level: skillProfile?.knowledge || 0 },
                      { name: "领导力 (L)", level: skillProfile?.leadership || 0 },
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
                  最近技能成长
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skillProfile?.recentGrowth?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      暂无技能成长记录，继续完成项目和任务以积累能力证据
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
                          +{growth.points} 点
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
                  行为探针日志
                </CardTitle>
                <CardDescription>
                  自动采集的用户行为数据，用于技能推断
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {behaviorLogs?.items?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>暂无行为记录</p>
                      <p className="text-sm mt-2">系统将自动采集IDE、CAD等工具的操作行为</p>
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
                                推断技能
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
                  placeholder="搜索笔记..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新建笔记
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建过程笔记</DialogTitle>
                    <DialogDescription>
                      记录项目过程中的问题和解决方案，AI将自动提取结构化知识
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>项目阶段</Label>
                      <Input
                        value={newNote.projectPhase}
                        onChange={(e) => setNewNote({ ...newNote, projectPhase: e.target.value })}
                        placeholder="如: M5设计验证、M7生产准备"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>问题描述</Label>
                      <Textarea
                        value={newNote.problemDesc}
                        onChange={(e) => setNewNote({ ...newNote, problemDesc: e.target.value })}
                        placeholder="详细描述遇到的问题..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>解决方案</Label>
                      <Textarea
                        value={newNote.solutionDesc}
                        onChange={(e) => setNewNote({ ...newNote, solutionDesc: e.target.value })}
                        placeholder="描述如何解决这个问题..."
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => createNoteMutation.mutate({
                        projectPhase: newNote.projectPhase,
                        problemDesc: newNote.problemDesc,
                        solutionDesc: newNote.solutionDesc,
                      })}
                      disabled={createNoteMutation.isPending}
                    >
                      {createNoteMutation.isPending ? "保存中..." : "保存"}
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
                    <p>暂无过程笔记</p>
                    <p className="text-sm mt-2">点击"新建笔记"记录项目经验</p>
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
                            AI提取知识
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-red-400 mb-1">问题</p>
                          <p className="text-sm">{note.problem_desc}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-400 mb-1">解决方案</p>
                          <p className="text-sm">{note.solution_desc}</p>
                        </div>
                        {note.ai_extracted_knowledge && (
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-1">
                              <Brain className="w-4 h-4" />
                              AI提取的结构化知识
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
                  知识图谱
                </CardTitle>
                <CardDescription>
                  从过程笔记和行为数据中提取的结构化知识网络
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">知识图谱可视化</p>
                  <p className="text-sm mt-2">
                    随着过程笔记和行为数据的积累，系统将自动构建个人知识图谱
                  </p>
                  <div className="mt-6 flex justify-center gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{stats?.extractedKnowledge || 0}</p>
                      <p className="text-xs">知识节点</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">0</p>
                      <p className="text-xs">知识关联</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-purple-400">0</p>
                      <p className="text-xs">技能映射</p>
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
