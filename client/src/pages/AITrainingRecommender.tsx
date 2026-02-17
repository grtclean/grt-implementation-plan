/**
 * AI培训推荐 (AI Training Recommender)
 * Phase F: 技能差距分析 · 课程推荐 · 学习路径 · 发展规划
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  GraduationCap, Loader2, Sparkles, BookOpen, Target,
  Clock, TrendingUp,
} from "lucide-react";

const ROLES = [
  "机械工程师", "电气工程师", "软件工程师", "工艺工程师",
  "项目经理", "销售经理", "售后工程师", "质量工程师",
  "生产主管", "职能专员",
];

const EXPERIENCE_LEVELS = [
  { value: "初级", label: "初级 (0-2年)" },
  { value: "中级", label: "中级 (3-5年)" },
  { value: "高级", label: "高级 (5-10年)" },
  { value: "专家", label: "专家 (10年+)" },
];

const LEARNING_PREFERENCES = [
  { value: "online", label: "线上学习" },
  { value: "classroom", label: "课堂培训" },
  { value: "OJT", label: "在岗训练" },
  { value: "mentoring", label: "导师辅导" },
];

const DEPARTMENTS = [
  "研发中心", "生产制造", "销售市场", "售后服务", "质量管理", "财务行政", "人力资源",
];

interface TrainingResult {
  skillGaps: Array<{ skill: string; currentLevel: string; targetLevel: string; priority: string }>;
  recommendedCourses: Array<{ name: string; type: string; duration: string; priority: string; relevance: string }>;
  learningPath: string;
  estimatedTime: string;
  recommendations: string[];
}

export default function AITrainingRecommender() {
  const [role, setRole] = useState(ROLES[0]);
  const [currentSkills, setCurrentSkills] = useState("");
  const [targetSkills, setTargetSkills] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("中级");
  const [learningPreference, setLearningPreference] = useState("__none__");
  const [department, setDepartment] = useState("__none__");
  const [result, setResult] = useState<TrainingResult | null>(null);

  const mutation = trpc.hrIntelligence.recommendTraining.useMutation({
    onSuccess: (data) => setResult(data as TrainingResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!currentSkills.trim() || !targetSkills.trim() || mutation.isPending) return;
    mutation.mutate({
      role,
      currentSkills,
      targetSkills,
      experienceLevel,
      learningPreference: learningPreference === "__none__" ? undefined : learningPreference,
      department: department === "__none__" ? undefined : department,
    });
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return p;
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case "online": return "线上";
      case "classroom": return "课堂";
      case "OJT": return "在岗";
      case "mentoring": return "导师";
      default: return t;
    }
  };

  const typeColor = (t: string) => {
    switch (t) {
      case "online": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "classroom": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "OJT": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "mentoring": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={GraduationCap}
          title="AI培训推荐"
          description="技能差距分析 · 课程推荐 · 学习路径 · 发展规划"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI推荐
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5 text-primary" />
              培训需求
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">岗位角色</label>
                <Select value={role} onValueChange={(v) => setRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择岗位" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">经验等级</label>
                <Select value={experienceLevel} onValueChange={(v) => setExperienceLevel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择等级" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">当前技能</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px] resize-y"
                placeholder="如: SolidWorks建模(熟练)、AutoCAD(精通)、GD&T(基础)、有限元分析(入门)"
                value={currentSkills}
                onChange={(e) => setCurrentSkills(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">目标技能</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px] resize-y"
                placeholder="如: 有限元分析(精通)、CFD仿真(熟练)、项目管理(基础)、英语技术文档"
                value={targetSkills}
                onChange={(e) => setTargetSkills(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">学习偏好（可选）</label>
                <Select value={learningPreference} onValueChange={(v) => setLearningPreference(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="不指定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不指定</SelectItem>
                    {LEARNING_PREFERENCES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">所属部门（可选）</label>
                <Select value={department} onValueChange={(v) => setDepartment(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="不指定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不指定</SelectItem>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!currentSkills.trim() || !targetSkills.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI推荐
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Skill Gaps */}
            {result.skillGaps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    技能差距分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">技能</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">当前水平</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">目标水平</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">优先级</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.skillGaps.map((gap, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 px-3 font-medium">{gap.skill}</td>
                            <td className="py-2 px-3 text-muted-foreground">{gap.currentLevel}</td>
                            <td className="py-2 px-3">{gap.targetLevel}</td>
                            <td className="py-2 px-3">
                              <Badge className={priorityColor(gap.priority)}>{priorityLabel(gap.priority)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Courses */}
            {result.recommendedCourses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-5 w-5 text-primary" />
                    推荐课程
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.recommendedCourses.map((course, idx) => (
                      <div key={idx} className="flex items-start justify-between p-3 rounded bg-muted/50">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{course.name}</span>
                            <Badge className={typeColor(course.type)}>{typeLabel(course.type)}</Badge>
                            <Badge className={priorityColor(course.priority)}>{priorityLabel(course.priority)}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration}</span>
                            <span>{course.relevance}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learning Path + Estimated Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  学习路径
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{result.learningPath}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>预计完成时间：{result.estimatedTime}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
