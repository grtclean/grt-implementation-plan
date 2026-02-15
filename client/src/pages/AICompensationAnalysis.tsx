/**
 * AI薪酬分析 (AI Compensation Analysis)
 * Phase F: 薪酬竞争力 · 市场对标 · 公平性分析 · 调薪建议
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, Loader2, Sparkles, TrendingUp, BarChart3, Shield,
} from "lucide-react";

const DEPARTMENTS = [
  "研发中心", "生产制造", "销售市场", "售后服务", "质量管理", "财务行政", "人力资源",
];

const PERFORMANCE_GRADES = [
  { value: "A", label: "A (优秀)" },
  { value: "B+", label: "B+ (良好)" },
  { value: "B", label: "B (合格)" },
  { value: "C", label: "C (待改进)" },
  { value: "D", label: "D (不合格)" },
];

const EDUCATION_LEVELS = [
  { value: "博士", label: "博士" },
  { value: "硕士", label: "硕士" },
  { value: "本科", label: "本科" },
  { value: "大专", label: "大专" },
  { value: "其他", label: "其他" },
];

interface CompensationResult {
  marketPosition: string;
  competitivenessScore: number;
  equityAnalysis: string;
  adjustmentSuggestion: string;
  salaryRange: { min: number; mid: number; max: number };
  recommendations: string[];
}

export default function AICompensationAnalysis() {
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [experienceYears, setExperienceYears] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [location, setLocation] = useState("");
  const [performanceGrade, setPerformanceGrade] = useState("");
  const [education, setEducation] = useState("");
  const [result, setResult] = useState<CompensationResult | null>(null);

  const mutation = trpc.hrIntelligence.analyzeCompensation.useMutation({
    onSuccess: (data) => setResult(data as CompensationResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!position.trim() || !experienceYears || !currentSalary || mutation.isPending) return;
    mutation.mutate({
      position,
      department,
      experienceYears: Number(experienceYears),
      currentSalary: Number(currentSalary),
      location: location || undefined,
      performanceGrade: performanceGrade || undefined,
      education: education || undefined,
    });
  };

  const positionColor = (pos: string) => {
    switch (pos) {
      case "above": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "at": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "below": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const positionLabel = (pos: string) => {
    switch (pos) {
      case "above": return "高于市场";
      case "at": return "匹配市场";
      case "below": return "低于市场";
      default: return pos;
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={DollarSign}
          title="AI薪酬分析"
          description="薪酬竞争力 · 市场对标 · 公平性分析 · 调薪建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI分析
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-primary" />
              薪酬信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">岗位名称</label>
                <Input placeholder="如: 高级机械工程师" value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">所属部门</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工作年限</label>
                <Input type="number" placeholder="如: 8" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">当前年薪（万元）</label>
                <Input type="number" placeholder="如: 25" value={currentSalary} onChange={(e) => setCurrentSalary(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">工作地点（可选）</label>
                <Input placeholder="如: 上海" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">绩效等级（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={performanceGrade} onChange={(e) => setPerformanceGrade(e.target.value)}>
                  <option value="">不指定</option>
                  {PERFORMANCE_GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">学历（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={education} onChange={(e) => setEducation(e.target.value)}>
                  <option value="">不指定</option>
                  {EDUCATION_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!position.trim() || !experienceYears || !currentSalary || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Competitiveness Score + Market Position */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">竞争力评分</p>
                    <p className={`text-5xl font-bold ${scoreColor(result.competitivenessScore)}`}>{result.competitivenessScore}</p>
                  </div>
                  <Badge className={`text-lg px-4 py-2 ${positionColor(result.marketPosition)}`}>
                    {positionLabel(result.marketPosition)}
                  </Badge>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(result.competitivenessScore)}`}
                    style={{ width: `${result.competitivenessScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Salary Range */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  薪酬区间（万元/年）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                    {result.salaryRange.max > 0 && (
                      <>
                        <div className="absolute inset-y-0 bg-blue-500/30 rounded-full" style={{
                          left: `${(result.salaryRange.min / result.salaryRange.max) * 100 * 0.8}%`,
                          right: `${(1 - 0.8) * 100}%`,
                        }} />
                        {Number(currentSalary) > 0 && (
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-primary rounded"
                            style={{ left: `${Math.min((Number(currentSalary) / result.salaryRange.max) * 80, 95)}%` }}
                          />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">最低</p>
                      <p className="font-medium">{result.salaryRange.min}万</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">中位</p>
                      <p className="font-medium text-blue-400">{result.salaryRange.mid}万</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">最高</p>
                      <p className="font-medium">{result.salaryRange.max}万</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equity Analysis + Adjustment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  分析详情
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">公平性分析</p>
                  <p className="text-sm text-muted-foreground">{result.equityAnalysis}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">调薪建议</p>
                  <p className="text-sm text-muted-foreground">{result.adjustmentSuggestion}</p>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-primary" />
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
