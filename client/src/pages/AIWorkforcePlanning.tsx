/**
 * AI人力规划 (AI Workforce Planning)
 * Phase F: 人力需求 · 招聘计划 · 预算分配 · 风险评估
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
  Users, Loader2, Sparkles, UserPlus, AlertTriangle,
  TrendingUp, Shield, Target,
} from "lucide-react";

const DEPARTMENTS = [
  "研发中心", "生产制造", "销售市场", "售后服务", "质量管理", "财务行政", "人力资源",
];

const TIME_HORIZONS = [
  { value: "Q1", label: "Q1 (1个季度)" },
  { value: "Q2", label: "Q2 (半年)" },
  { value: "H1", label: "H1 (上半年)" },
  { value: "全年", label: "全年 (12个月)" },
];

interface WorkforceResult {
  optimalHeadcount: number;
  hiringNeeds: Array<{ role: string; count: number; priority: string; timeline: string }>;
  skillRequirements: string[];
  budgetAllocation: { hiring: number; training: number; retention: number };
  riskFactors: Array<{ factor: string; impact: string; mitigation: string }>;
  recommendations: string[];
}

export default function AIWorkforcePlanning() {
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [currentHeadcount, setCurrentHeadcount] = useState("");
  const [plannedProjects, setPlannedProjects] = useState("");
  const [attritionRate, setAttritionRate] = useState("");
  const [budgetConstraint, setBudgetConstraint] = useState("");
  const [growthTarget, setGrowthTarget] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("");
  const [result, setResult] = useState<WorkforceResult | null>(null);

  const mutation = trpc.hrIntelligence.planWorkforce.useMutation({
    onSuccess: (data) => setResult(data as WorkforceResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!currentHeadcount || !plannedProjects.trim() || !attritionRate || mutation.isPending) return;
    mutation.mutate({
      department,
      currentHeadcount: Number(currentHeadcount),
      plannedProjects,
      attritionRate: Number(attritionRate),
      budgetConstraint: budgetConstraint || undefined,
      growthTarget: growthTarget || undefined,
      timeHorizon: timeHorizon || undefined,
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

  const impactColor = (i: string) => {
    switch (i) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const impactLabel = (i: string) => {
    switch (i) {
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return i;
    }
  };

  const budgetTotal = result
    ? result.budgetAllocation.hiring + result.budgetAllocation.training + result.budgetAllocation.retention
    : 0;

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Users}
          title="AI人力规划"
          description="人力需求 · 招聘计划 · 预算分配 · 风险评估"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI规划
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              部门信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">部门名称</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">现有人数</label>
                <Input type="number" placeholder="如: 35" value={currentHeadcount} onChange={(e) => setCurrentHeadcount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">计划项目</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px] resize-y"
                placeholder="如: Q1启动3个新项目（半导体清洗线2个、汽车零部件清洗线1个），需增加机械设计和电气调试人员"
                value={plannedProjects}
                onChange={(e) => setPlannedProjects(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">流失率(%)</label>
                <Input type="number" placeholder="如: 15" value={attritionRate} onChange={(e) => setAttritionRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">预算约束（可选）</label>
                <Input placeholder="如: 年度人力预算500万" value={budgetConstraint} onChange={(e) => setBudgetConstraint(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">增长目标（可选）</label>
                <Input placeholder="如: 产能提升20%" value={growthTarget} onChange={(e) => setGrowthTarget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">规划周期（可选）</label>
              <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)}>
                <option value="">不指定</option>
                {TIME_HORIZONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!currentHeadcount || !plannedProjects.trim() || !attritionRate || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI规划
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Optimal Headcount */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">最优编制</p>
                    <p className="text-5xl font-bold text-primary">{result.optimalHeadcount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">现有人数</p>
                    <p className="text-3xl font-bold text-muted-foreground">{currentHeadcount}</p>
                  </div>
                </div>
                {result.optimalHeadcount > Number(currentHeadcount) && (
                  <p className="text-sm text-green-400 mt-2">
                    需增编 {result.optimalHeadcount - Number(currentHeadcount)} 人
                  </p>
                )}
                {result.optimalHeadcount < Number(currentHeadcount) && (
                  <p className="text-sm text-yellow-400 mt-2">
                    建议优化 {Number(currentHeadcount) - result.optimalHeadcount} 人
                  </p>
                )}
                {result.optimalHeadcount === Number(currentHeadcount) && (
                  <p className="text-sm text-blue-400 mt-2">编制合理，无需调整</p>
                )}
              </CardContent>
            </Card>

            {/* Hiring Needs */}
            {result.hiringNeeds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="h-5 w-5 text-primary" />
                    招聘需求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">岗位</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">人数</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">优先级</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">时间线</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.hiringNeeds.map((need, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 px-3 font-medium">{need.role}</td>
                            <td className="py-2 px-3">{need.count}人</td>
                            <td className="py-2 px-3">
                              <Badge className={priorityColor(need.priority)}>{priorityLabel(need.priority)}</Badge>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{need.timeline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skill Requirements */}
            {result.skillRequirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    技能需求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.skillRequirements.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Allocation */}
            {budgetTotal > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    预算分配
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex h-6 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(result.budgetAllocation.hiring / budgetTotal) * 100}%` }}
                    >
                      {Math.round((result.budgetAllocation.hiring / budgetTotal) * 100)}%
                    </div>
                    <div
                      className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(result.budgetAllocation.training / budgetTotal) * 100}%` }}
                    >
                      {Math.round((result.budgetAllocation.training / budgetTotal) * 100)}%
                    </div>
                    <div
                      className="bg-orange-500 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(result.budgetAllocation.retention / budgetTotal) * 100}%` }}
                    >
                      {Math.round((result.budgetAllocation.retention / budgetTotal) * 100)}%
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>招聘 ({result.budgetAllocation.hiring}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>培训 ({result.budgetAllocation.training}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-orange-500" />
                      <span>留才 ({result.budgetAllocation.retention}%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Factors */}
            {result.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    风险因素
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.riskFactors.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{risk.factor}</span>
                            <Badge className={impactColor(risk.impact)}>{impactLabel(risk.impact)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
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
