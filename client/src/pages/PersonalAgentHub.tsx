/**
 * 个人智能体中心 - 行为探针、技能推断、知识图谱、成长曲线
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("behavior");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={User}
        title={t("ai.personalAgentHub.title")}
        description={t("ai.personalAgentHub.description")}
        actions={<Button size="sm"><Award className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.generateCert")}</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t("ai.personalAgentHub.behaviorRecords")} value="1,234" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Brain} label={t("ai.personalAgentHub.inferredSkills")} value={12} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Network} label={t("ai.personalAgentHub.knowledgeNodes")} value={89} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={TrendingUp} label={t("ai.personalAgentHub.growthIndex")} value="+15%" iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="behavior"><Activity className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabBehavior")}</TabsTrigger>
          <TabsTrigger value="skills"><Brain className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabSkills")}</TabsTrigger>
          <TabsTrigger value="notes"><FileText className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabNotes")}</TabsTrigger>
          <TabsTrigger value="graph"><Network className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabGraph")}</TabsTrigger>
          <TabsTrigger value="growth"><TrendingUp className="w-4 h-4 mr-2" />{t("ai.personalAgentHub.tabGrowth")}</TabsTrigger>
        </TabsList>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("ai.personalAgentHub.behaviorLogTitle")}</CardTitle><CardDescription>{t("ai.personalAgentHub.behaviorLogDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockBehaviorLogs.map((log) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("ai.personalAgentHub.skillInferTitle")}</CardTitle><CardDescription>{t("ai.personalAgentHub.skillInferDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSkillInferences.map((skill, index) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("ai.personalAgentHub.notesTitle")}</CardTitle><CardDescription>{t("ai.personalAgentHub.notesDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockProcessNotes.map((note) => (
                  <div key={note.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{note.phase}</Badge>
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                    </div>
                    <p className="font-medium text-red-400 mb-1">{t("ai.personalAgentHub.problemLabel")}: {note.problem}</p>
                    <p className="text-green-400 mb-2">{t("ai.personalAgentHub.solutionLabel")}: {note.solution}</p>
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
            <CardHeader><CardTitle>{t("ai.personalAgentHub.graphTitle")}</CardTitle><CardDescription>{t("ai.personalAgentHub.graphDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">{t("ai.personalAgentHub.graphPlaceholder")}</div>
            </CardContent>
          </Card>
        </TabsContent>

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
