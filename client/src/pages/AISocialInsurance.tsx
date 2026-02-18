/**
 * AI五险一金计算器 (AI Social Insurance Calculator)
 * 社保计算 · 公积金 · 企业成本 · 合规建议
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
  Calculator, Loader2, Sparkles, TrendingUp, Users, Shield,
  Building2, Wallet,
} from "lucide-react";

const CITIES = ["上海", "苏州", "无锡"];

interface SocialInsuranceResult {
  city: string;
  baseSalary: number;
  employeeContribution: {
    pension: number;
    medical: number;
    unemployment: number;
    housingFund: number;
    total: number;
  };
  employerContribution: {
    pension: number;
    medical: number;
    unemployment: number;
    workInjury: number;
    housingFund: number;
    total: number;
  };
  totalMonthly: number;
  annualCost: number;
  breakdown: Array<{
    item: string;
    employerRate: string;
    employerAmount: number;
    employeeRate: string;
    employeeAmount: number;
  }>;
  comparisonWithBenchmark: string;
  recommendations: string[];
}

export default function AISocialInsurance() {
  const [city, setCity] = useState(CITIES[0]);
  const [baseSalary, setBaseSalary] = useState("");
  const [housingFundRate, setHousingFundRate] = useState("7");
  const [employeeCount, setEmployeeCount] = useState("");
  const [result, setResult] = useState<SocialInsuranceResult | null>(null);

  const mutation = trpc.regionalCompliance.calculateSocialInsurance.useMutation({
    onSuccess: (data) => setResult(data as SocialInsuranceResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!baseSalary || mutation.isPending) return;
    mutation.mutate({
      city,
      baseSalary: Number(baseSalary),
      housingFundRate: Number(housingFundRate),
      employeeCount: employeeCount ? Number(employeeCount) : undefined,
    });
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Calculator}
          title="AI五险一金计算器"
          description="社保计算 · 公积金 · 企业成本 · 合规建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI计算
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-primary" />
              计算参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">缴纳城市</label>
                <Select value={city} onValueChange={(v) => setCity(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择城市" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">月工资基数（元）</label>
                <Input
                  type="number"
                  placeholder="月工资基数(元)"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">公积金比例（%）</label>
                <Input
                  type="number"
                  placeholder="公积金比例"
                  value={housingFundRate}
                  min={5}
                  max={12}
                  onChange={(e) => setHousingFundRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">范围 5% - 12%，默认 7%</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">员工人数（可选）</label>
                <Input
                  type="number"
                  placeholder="员工人数(可选)"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!baseSalary || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI计算
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Total Monthly & Annual Cost */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">每月总成本</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(result.totalMonthly)} 元</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">年度总成本</p>
                    <p className="text-4xl font-bold text-blue-400">{formatCurrency(result.annualCost)} 元</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{result.city} · 月工资基数 {formatCurrency(result.baseSalary)} 元</span>
                </div>
              </CardContent>
            </Card>

            {/* Employee Contribution Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-blue-400" />
                  个人缴纳明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">项目</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">比例</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">金额（元/月）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.breakdown.map((row, idx) => (
                        <tr key={idx} className="border-b border-muted/50">
                          <td className="py-2 font-medium">{row.item}</td>
                          <td className="py-2 text-right text-muted-foreground">{row.employeeRate}</td>
                          <td className="py-2 text-right">{formatCurrency(row.employeeAmount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2">
                        <td className="py-2 font-bold">合计</td>
                        <td className="py-2 text-right" />
                        <td className="py-2 text-right font-bold text-blue-400">
                          {formatCurrency(result.employeeContribution.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Employer Contribution Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-5 w-5 text-green-400" />
                  企业缴纳明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">项目</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">比例</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">金额（元/月）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.breakdown.map((row, idx) => (
                        <tr key={idx} className="border-b border-muted/50">
                          <td className="py-2 font-medium">{row.item}</td>
                          <td className="py-2 text-right text-muted-foreground">{row.employerRate}</td>
                          <td className="py-2 text-right">{formatCurrency(row.employerAmount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2">
                        <td className="py-2 font-bold">合计</td>
                        <td className="py-2 text-right" />
                        <td className="py-2 text-right font-bold text-green-400">
                          {formatCurrency(result.employerContribution.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Comparison with Benchmark */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  基准对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.comparisonWithBenchmark}</p>
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
  );
}
