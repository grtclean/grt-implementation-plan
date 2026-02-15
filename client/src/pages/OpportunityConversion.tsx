/**
 * 商机→需求转化 (US-016)
 * 商机信息自动转化为结构化技术需求文档
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
  Target, Loader2, Sparkles, CheckCircle, AlertTriangle, FileText,
  Users, Clock,
} from "lucide-react";

const INDUSTRIES = [
  { value: "汽车制造", label: "汽车制造" },
  { value: "半导体", label: "半导体" },
  { value: "精密加工", label: "精密加工" },
  { value: "食品医药", label: "食品医药" },
  { value: "航空航天", label: "航空航天" },
  { value: "工业通用", label: "工业通用" },
];

interface ConversionResult {
  requirementDoc: {
    projectName: string;
    customerProfile: string;
    technicalRequirements: string[];
    cleanlinessSpec: string;
    throughputSpec: string;
    budgetRange: string;
    timeline: string;
  };
  riskAssessment: Array<{
    risk: string;
    level: string;
    mitigation: string;
  }>;
  suggestedTeam: Array<{
    role: string;
    responsibility: string;
  }>;
  estimatedEffort: string;
  recommendations: string[];
}

export default function OpportunityConversion() {
  const [opportunityName, setOpportunityName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [industry, setIndustry] = useState("汽车制造");
  const [productInterest, setProductInterest] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);

  const mutation = trpc.serviceSalesAdvanced.convertOpportunity.useMutation({
    onSuccess: (data) => setResult(data as ConversionResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!opportunityName.trim() || !customerName.trim() || !productInterest.trim() || mutation.isPending) return;
    mutation.mutate({
      opportunityName,
      customerName,
      industry,
      productInterest,
      budget: budget || undefined,
      notes: notes || undefined,
    });
  };

  const riskLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">高</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">中</Badge>;
      case "low":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">低</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Target}
          title="商机→需求转化"
          description="商机信息自动转化为结构化技术需求文档"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI转化
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              商机信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">商机名称 *</label>
                <Input
                  placeholder="商机名称"
                  value={opportunityName}
                  onChange={(e) => setOpportunityName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户名称 *</label>
                <Input
                  placeholder="客户名称"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">行业 *</label>
                <select
                  className="w-full bg-background border rounded px-3 py-2 text-sm"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.value} value={ind.value}>{ind.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">预算范围（万元，可选）</label>
                <Input
                  placeholder="预算范围(万元)"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">产品兴趣 *</label>
              <Input
                placeholder="如: 碳氢真空清洗机 + 超声波预清洗"
                value={productInterest}
                onChange={(e) => setProductInterest(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">补充说明（可选）</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                placeholder="补充说明"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!opportunityName.trim() || !customerName.trim() || !productInterest.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI转化需求
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Requirement Doc */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  技术需求文档
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded bg-primary/5 border border-primary/20">
                  <h3 className="text-lg font-bold">{result.requirementDoc.projectName}</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">客户画像</p>
                    <p className="text-sm">{result.requirementDoc.customerProfile}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">技术需求</p>
                    <ul className="space-y-1">
                      {result.requirementDoc.technicalRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">清洁度标准</p>
                      <p className="text-sm font-medium">{result.requirementDoc.cleanlinessSpec}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">产能要求</p>
                      <p className="text-sm font-medium">{result.requirementDoc.throughputSpec}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">预算范围</p>
                      <p className="text-sm font-medium">{result.requirementDoc.budgetRange}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">交付时间</p>
                      <p className="text-sm font-medium">{result.requirementDoc.timeline}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            {result.riskAssessment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    风险评估
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">风险</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">级别</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">缓解措施</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.riskAssessment.map((risk, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{risk.risk}</td>
                            <td className="py-2">{riskLevelBadge(risk.level)}</td>
                            <td className="py-2 text-muted-foreground">{risk.mitigation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Team */}
            {result.suggestedTeam.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-blue-400" />
                    建议团队
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">角色</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">职责</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.suggestedTeam.map((member, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{member.role}</td>
                            <td className="py-2 text-muted-foreground">{member.responsibility}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estimated Effort */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">预估工作量:</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-base px-3 py-1">
                    {result.estimatedEffort}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
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
