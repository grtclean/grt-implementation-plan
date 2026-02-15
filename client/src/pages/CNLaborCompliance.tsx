/**
 * 中国劳动法合规分析 (CN Labor Compliance Analysis)
 * Overtime analysis against Chinese labor law 36h monthly limit
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Scale, Loader2, Sparkles, AlertTriangle, CheckCircle,
} from "lucide-react";

interface CNOvertimeResult {
  totalOvertimeHours: number;
  monthlyLimit: number;
  complianceStatus: string;
  violations: Array<{ date: string; type: string; hours: number; issue: string }>;
  weekdayOT: number;
  weekendOT: number;
  holidayOT: number;
  overtimePay: number;
  recommendations: string[];
}

export default function CNLaborCompliance() {
  const [employeeData, setEmployeeData] = useState("");
  const [month, setMonth] = useState("");
  const [overtimeRecords, setOvertimeRecords] = useState("");
  const [result, setResult] = useState<CNOvertimeResult | null>(null);

  const mutation = trpc.regionalCompliance.analyzeCNOvertime.useMutation({
    onSuccess: (data) => setResult(data as CNOvertimeResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!employeeData.trim() || !month.trim() || !overtimeRecords.trim() || mutation.isPending) return;
    mutation.mutate({
      employeeData,
      month,
      overtimeRecords,
    });
  };

  const complianceColor = (status: string) => {
    switch (status) {
      case "合规": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "预警": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "违规": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Scale}
          title="中国劳动法合规分析"
          description="加班时长分析 · 36小时月度上限 · 合规预警 · 加班费计算"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI合规
            </Badge>
          }
        />

        {/* Input Form */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5 text-primary" />
              合规分析输入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-300">员工信息</label>
              <Textarea
                placeholder="员工姓名、入职日期、合同类型..."
                className="min-h-[80px] bg-slate-900 border-slate-700"
                value={employeeData}
                onChange={(e) => setEmployeeData(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">统计月份</label>
              <Input
                type="text"
                placeholder="2026-01"
                className="bg-slate-900 border-slate-700"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">加班记录</label>
              <Textarea
                placeholder="加班日期、时长(小时)、类型(工作日/周末/节假日)..."
                className="min-h-[100px] bg-slate-900 border-slate-700"
                value={overtimeRecords}
                onChange={(e) => setOvertimeRecords(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!employeeData.trim() || !month.trim() || !overtimeRecords.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI合规分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Compliance Status */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">合规状态</p>
                    <Badge className={`text-xl px-4 py-2 mt-1 ${complianceColor(result.complianceStatus)}`}>
                      {result.complianceStatus}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">月度加班总时长 / 法定上限</p>
                    <p className="text-3xl font-bold">
                      <span className={result.totalOvertimeHours > result.monthlyLimit ? "text-red-400" : "text-green-400"}>
                        {result.totalOvertimeHours}h
                      </span>
                      <span className="text-muted-foreground text-lg"> / {result.monthlyLimit}h</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overtime Breakdown */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-5 w-5 text-primary" />
                  加班时长明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded bg-muted/50 text-center">
                    <p className="text-xs text-slate-300">工作日加班</p>
                    <p className="text-2xl font-bold mt-1">{result.weekdayOT}h</p>
                  </div>
                  <div className="p-4 rounded bg-muted/50 text-center">
                    <p className="text-xs text-slate-300">周末加班</p>
                    <p className="text-2xl font-bold mt-1">{result.weekendOT}h</p>
                  </div>
                  <div className="p-4 rounded bg-muted/50 text-center">
                    <p className="text-xs text-slate-300">节假日加班</p>
                    <p className="text-2xl font-bold mt-1">{result.holidayOT}h</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">应付加班费</span>
                    <span className="text-xl font-bold text-primary">¥{result.overtimePay.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Violations */}
            {result.violations.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    违规记录 ({result.violations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.violations.map((v, i) => (
                      <div key={i} className="p-3 rounded bg-muted/50 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{v.date}</span>
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{v.type}</Badge>
                          <span className="text-sm text-slate-300">{v.hours}h</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{v.issue}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    AI建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{i + 1}.</span>
                        <span>{r}</span>
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
