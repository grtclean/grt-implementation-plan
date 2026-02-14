/**
 * 个人智能体中心增强版 - 行为数据聚合、技能推断、知识图谱
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, Activity, Target, Network, Award, BookOpen,
  TrendingUp, Clock, Zap, ChevronRight
} from "lucide-react";

// 行为数据聚合
const behaviorData = [
  { context: "IDE_Code_Commit", count: 234, lastTime: "2026-01-30 15:30", impliedSkill: "Python开发 L4" },
  { context: "CAD_Save", count: 156, lastTime: "2026-01-30 14:20", impliedSkill: "3D建模 L3" },
  { context: "PLM_Review", count: 89, lastTime: "2026-01-30 11:45", impliedSkill: "设计评审 L2" },
  { context: "ERP_Query", count: 67, lastTime: "2026-01-30 10:30", impliedSkill: "数据分析 L2" },
];

// 技能推断结果
const inferredSkills = [
  { name: "Python开发", level: 4, confidence: 92, evidence: "234次代码提交", trend: "up" },
  { name: "3D建模", level: 3, confidence: 87, evidence: "156次CAD保存", trend: "up" },
  { name: "设计评审", level: 2, confidence: 78, evidence: "89次PLM评审", trend: "stable" },
  { name: "数据分析", level: 2, confidence: 72, evidence: "67次ERP查询", trend: "up" },
];

// 知识图谱节点
const knowledgeNodes = [
  { id: "k1", name: "流体仿真", type: "技术", connections: 5 },
  { id: "k2", name: "PLC编程", type: "技术", connections: 4 },
  { id: "k3", name: "清洗工艺", type: "领域", connections: 6 },
  { id: "k4", name: "项目管理", type: "管理", connections: 3 },
];

// 成长路径
const growthPath = [
  { stage: "L1 初级", status: "completed", skills: ["基础操作", "文档编写"] },
  { stage: "L2 中级", status: "completed", skills: ["独立开发", "问题解决"] },
  { stage: "L3 高级", status: "current", skills: ["系统设计", "技术指导"], progress: 65 },
  { stage: "L4 专家", status: "upcoming", skills: ["架构设计", "团队领导"] },
  { stage: "L5 大师", status: "upcoming", skills: ["战略规划", "行业影响"] },
];

// 学习推荐
const learningRecommendations = [
  { title: "高级流体仿真技术", type: "课程", duration: "8小时", relevance: 95 },
  { title: "PLC高级编程实战", type: "实践", duration: "16小时", relevance: 88 },
  { title: "项目管理PMP认证", type: "认证", duration: "40小时", relevance: 82 },
];

export default function PersonalAgentHubEnhanced() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("behavior");

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
    return <Activity className="w-4 h-4 text-yellow-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "current": return "bg-primary/20 text-primary border-primary/30";
      case "upcoming": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Brain}
        title="个人智能体中心 (增强版)"
        description="行为数据聚合、技能自动推断、知识图谱可视化"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />行为数据
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Target className="w-4 h-4" />技能推断
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Network className="w-4 h-4" />知识图谱
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />成长路径
          </TabsTrigger>
        </TabsList>

        {/* 行为数据聚合 */}
        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>行为探针数据聚合</CardTitle>
              <CardDescription>从日常工作行为中自动采集的能力证据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {behaviorData.map((item, idx) => (
                  <div key={idx} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-primary/50" />
                        <div>
                          <p className="font-medium">{item.context}</p>
                          <p className="text-xs text-muted-foreground">最后活动: {item.lastTime}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-primary">{item.count} 次</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">推断技能:</span>
                      <Badge className="bg-primary/20 text-primary">{item.impliedSkill}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 技能推断 */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI技能自动推断</CardTitle>
              <CardDescription>基于行为数据的技能等级推断结果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inferredSkills.map((skill, idx) => (
                  <div key={idx} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-primary/50" />
                        <div>
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">证据: {skill.evidence}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(skill.trend)}
                        <Badge className="bg-primary/20 text-primary">L{skill.level}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">置信度</span>
                        <span className="text-primary">{skill.confidence}%</span>
                      </div>
                      <Progress value={skill.confidence} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 知识图谱 */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>知识图谱可视化</CardTitle>
              <CardDescription>个人知识体系和技能关联网络</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted rounded-lg border border-border mb-4">
                <div className="relative w-full h-full p-8">
                  {/* 简化的知识图谱可视化 */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  {knowledgeNodes.map((node, idx) => {
                    const angle = (idx * 90) * (Math.PI / 180);
                    const x = Math.cos(angle) * 100;
                    const y = Math.sin(angle) * 80;
                    return (
                      <div 
                        key={node.id}
                        className="absolute w-20 h-20 rounded-full bg-card border border-border flex flex-col items-center justify-center text-center"
                        style={{
                          top: `calc(50% + ${y}px - 40px)`,
                          left: `calc(50% + ${x}px - 40px)`,
                        }}
                      >
                        <p className="text-xs font-medium">{node.name}</p>
                        <p className="text-[10px] text-muted-foreground">{node.connections}个关联</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {knowledgeNodes.map((node) => (
                  <div key={node.id} className="p-2 bg-muted rounded flex items-center justify-between">
                    <span className="text-sm">{node.name}</span>
                    <Badge variant="outline" className="text-xs">{node.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 成长路径 */}
        <TabsContent value="growth" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>能力成长路径</CardTitle>
                <CardDescription>L1-L5能力等级晋升规划</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {growthPath.map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        stage.status === "completed" ? "bg-green-500/20 text-green-400" :
                        stage.status === "current" ? "bg-primary/20 text-primary" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {stage.status === "completed" ? "✓" : idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{stage.stage}</p>
                          <Badge className={getStatusColor(stage.status)}>
                            {stage.status === "completed" ? "已完成" : stage.status === "current" ? "进行中" : "待解锁"}
                          </Badge>
                        </div>
                        {stage.progress && (
                          <Progress value={stage.progress} className="h-1 mt-2" />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{stage.skills.join(" · ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>学习推荐</CardTitle>
                <CardDescription>基于成长路径的个性化学习建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {learningRecommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary/50" />
                          <p className="font-medium text-sm">{rec.title}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{rec.type}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{rec.duration}
                        </span>
                        <span className="text-primary">相关度 {rec.relevance}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  查看更多推荐 <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
