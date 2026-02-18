/**
 * AI人才评估 (AI Talent Assessment)
 * Phase F: 人才盘点 · 潜力评估 · 职业路径 · 发展建议
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  UserCheck, Loader2, Sparkles, CheckCircle, AlertTriangle,
  TrendingUp, Target, Star,
} from "lucide-react";

const ROLES = [
  "机械工程师", "电气工程师", "软件工程师", "工艺工程师",
  "项目经理", "销售经理", "售后工程师", "质量工程师",
  "生产主管", "职能专员",
];

const DEPARTMENTS = [
  "研发中心", "生产制造", "销售市场", "售后服务", "质量管理", "财务行政", "人力资源",
];

interface AssessmentResult {
  talentGrade: string;
  potentialLevel: string;
  strengths: string[];
  developmentAreas: string[];
  careerPaths: Array<{ role: string; readiness: string; timeframe: string }>;
  successionReadiness: string;
  recommendations: string[];
}

export default function AITalentAssessment() {
  const [employeeName, setEmployeeName] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [skillTags, setSkillTags] = useState("");
  const [performanceSummary, setPerformanceSummary] = useState("");
  const [certifications, setCertifications] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const mutation = trpc.hrIntelligence.assessTalent.useMutation({
    onSuccess: (data) => setResult(data as AssessmentResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!employeeName.trim() || !yearsOfExperience || mutation.isPending) return;
    mutation.mutate({
      employeeName,
      role,
      department,
      yearsOfExperience: Number(yearsOfExperience),
      skillTags: skillTags || undefined,
      performanceSummary: performanceSummary || undefined,
      certifications: certifications || undefined,
    });
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "B": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "C": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "D": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const potentialLabel = (level: string) => {
    switch (level) {
      case "high": return "高潜力";
      case "medium": return "中等潜力";
      case "low": return "待发展";
      default: return level;
    }
  };

  const potentialColor = (level: string) => {
    switch (level) {
      case "high": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "low": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const readinessLabel = (r: string) => {
    switch (r) {
      case "ready": return "已就绪";
      case "1-2years": return "1-2年";
      case "3+years": return "3年以上";
      default: return r;
    }
  };

  const readinessColor = (r: string) => {
    switch (r) {
      case "ready": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "1-2years": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "3+years": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={UserCheck}
          title="AI人才评估"
          description="人才盘点 · 潜力评估 · 职业路径 · 发展建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI评估
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-5 w-5 text-primary" />
              员工信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">员工姓名</label>
                <Input placeholder="如: 张三" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
              </div>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">所属部门</label>
                <Select value={department} onValueChange={(v) => setDepartment(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工作年限</label>
                <Input type="number" placeholder="如: 5" value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">技能标签（可选）</label>
              <Input placeholder="如: 机械设计、SolidWorks、GD&T" value={skillTags} onChange={(e) => setSkillTags(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">绩效概述（可选）</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px] resize-y"
                placeholder="如: 连续两年绩效A，主导完成3个重点项目"
                value={performanceSummary}
                onChange={(e) => setPerformanceSummary(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">持有证书（可选）</label>
              <Input placeholder="如: PMP、ISO内审员、高级工程师" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!employeeName.trim() || !yearsOfExperience || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI评估
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Grade + Potential */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">人才等级</p>
                    <Badge className={`text-2xl px-4 py-2 ${gradeColor(result.talentGrade)}`}>{result.talentGrade}级人才</Badge>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">潜力评估</p>
                    <Badge className={`text-lg px-3 py-1 ${potentialColor(result.potentialLevel)}`}>
                      {potentialLabel(result.potentialLevel)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">{result.successionReadiness}</p>
              </CardContent>
            </Card>

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    核心优势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Development Areas */}
            {result.developmentAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    发展领域
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.developmentAreas.map((area, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Career Paths */}
            {result.careerPaths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    职业发展路径
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.careerPaths.map((path, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{path.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={readinessColor(path.readiness)}>{readinessLabel(path.readiness)}</Badge>
                          <span className="text-sm text-muted-foreground">{path.timeframe}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-5 w-5 text-primary" />
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
  );
}
