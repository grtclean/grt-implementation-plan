/**
 * 个人智能体中心 - 行为探针、技能推断、知识图谱、成长曲线
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, Activity, Brain, Network, TrendingUp, Award, FileText, Lightbulb } from "lucide-react";

const mockBehaviorLogs = [
  { id: "bl_001", context: "IDE_Code_Commit", actionData: "PLC程序优化", impliedSkill: "PLC编程 Level 4", timestamp: "2026-01-30 14:30:00" },
  { id: "bl_002", context: "CAD_Save", actionData: "喷嘴组件设计", impliedSkill: "3D建模 Level 3", timestamp: "2026-01-30 14:15:00" },
  { id: "bl_003", context: "Document_Edit", actionData: "技术方案撰写", impliedSkill: "技术文档 Level 3", timestamp: "2026-01-30 13:45:00" },
];

const mockSkillInferences = [
  { skill: "PLC编程", level: 4, confidence: 92, evidenceCount: 156 },
  { skill: "流体仿真", level: 5, confidence: 88, evidenceCount: 89 },
  { skill: "3D建模", level: 3, confidence: 75, evidenceCount: 45 },
  { skill: "项目管理", level: 3, confidence: 68, evidenceCount: 34 },
];

const mockProcessNotes = [
  { id: "pn_001", phase: "M5", problem: "清洗周期时间超标", solution: "优化喷嘴角度和压力参数", extractedKnowledge: ["喷嘴角度优化", "压力参数调整"] },
  { id: "pn_002", phase: "M7", problem: "牙膏测试不通过", solution: "增加预冲洗步骤", extractedKnowledge: ["预冲洗工艺", "牙膏测试标准"] },
];

export default function PersonalAgentHub() {
  const [activeTab, setActiveTab] = useState("behavior");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            个人智能体中心
          </h1>
          <p className="text-muted-foreground mt-1">行为探针、技能推断、知识图谱、成长追踪</p>
        </div>
        <Button size="sm"><Award className="w-4 h-4 mr-2" />生成能力证书</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">行为记录</p><p className="text-2xl font-bold text-primary">1,234</p></div>
              <Activity className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">推断技能</p><p className="text-2xl font-bold text-green-400">12</p></div>
              <Brain className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">知识节点</p><p className="text-2xl font-bold text-blue-400">89</p></div>
              <Network className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">成长指数</p><p className="text-2xl font-bold text-purple-400">+15%</p></div>
              <TrendingUp className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="behavior"><Activity className="w-4 h-4 mr-2" />行为探针</TabsTrigger>
          <TabsTrigger value="skills"><Brain className="w-4 h-4 mr-2" />技能推断</TabsTrigger>
          <TabsTrigger value="notes"><FileText className="w-4 h-4 mr-2" />过程笔记</TabsTrigger>
          <TabsTrigger value="graph"><Network className="w-4 h-4 mr-2" />知识图谱</TabsTrigger>
          <TabsTrigger value="growth"><TrendingUp className="w-4 h-4 mr-2" />成长曲线</TabsTrigger>
        </TabsList>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>行为探针日志</CardTitle><CardDescription>自动采集的工作行为数据</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockBehaviorLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <Activity className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium">{log.actionData}</p>
                        <p className="text-sm text-muted-foreground">上下文: {log.context}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{log.impliedSkill}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>技能推断结果</CardTitle><CardDescription>基于行为数据的AI技能推断</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSkillInferences.map((skill, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{skill.skill}</span>
                        <Badge>Level {skill.level}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">置信度: {skill.confidence}% · 证据: {skill.evidenceCount}条</span>
                    </div>
                    <Progress value={skill.confidence} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>过程笔记</CardTitle><CardDescription>问题解决记录与知识提取</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockProcessNotes.map((note) => (
                  <div key={note.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{note.phase}</Badge>
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                    </div>
                    <p className="font-medium text-red-400 mb-1">问题: {note.problem}</p>
                    <p className="text-green-400 mb-2">解决: {note.solution}</p>
                    <div className="flex gap-2">
                      {note.extractedKnowledge.map((k, i) => (
                        <Badge key={i} variant="secondary">{k}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>知识图谱</CardTitle><CardDescription>个人知识网络可视化</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">[知识图谱可视化 - 节点关系网络]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>成长曲线</CardTitle><CardDescription>能力成长趋势追踪</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[成长曲线图 - 按月展示各技能成长]</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
