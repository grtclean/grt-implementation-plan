/**
 * 工作日计算器 (Working Days Calculator)
 * 节假日感知 · 多地区支持 · 缓冲天数 · 关键时段预警
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, Loader2, Sparkles, CheckCircle, AlertTriangle, Clock, Calendar, ListChecks,
} from "lucide-react";

const REGIONS = [
  { value: "CN", label: "中国" },
  { value: "DE", label: "德国" },
  { value: "US", label: "美国" },
];

interface WorkingDaysResult {
  endDate: string;
  workingDays: number;
  holidaysEncountered: Array<{ date: string; name: string }>;
  calendarDays: number;
  bufferDays: number;
  criticalPeriods: Array<{ period: string; reason: string }>;
  recommendations: string[];
}

export default function WorkingDaysCalculator() {
  const [startDate, setStartDate] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [region, setRegion] = useState("CN");
  const [includeBuffer, setIncludeBuffer] = useState(false);
  const [result, setResult] = useState<WorkingDaysResult | null>(null);

  const mutation = trpc.regionalCompliance.calculateWorkingDays.useMutation({
    onSuccess: (data) => setResult(data as WorkingDaysResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!startDate || !estimatedDays || mutation.isPending) return;
    mutation.mutate({
      startDate,
      estimatedDays: Number(estimatedDays),
      region,
      includeBuffer,
    });
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={CalendarDays}
          title="工作日计算器"
          description="节假日感知 · 多地区支持 · 缓冲天数 · 关键时段预警"
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
              <CalendarDays className="h-5 w-5 text-primary" />
              计算参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">开始日期 *</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">所需工作日 *</label>
                <Input
                  type="number"
                  placeholder="所需工作日"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">地区</label>
                <Select value={region} onValueChange={(v) => setRegion(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择地区" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">缓冲选项</label>
                <div className="flex items-center gap-2 h-[38px]">
                  <input
                    type="checkbox"
                    id="includeBuffer"
                    checked={includeBuffer}
                    onChange={(e) => setIncludeBuffer(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-background"
                  />
                  <label htmlFor="includeBuffer" className="text-sm">包含10%缓冲天数</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!startDate || !estimatedDays || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                计算工作日
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* End Date — Prominent Card */}
            <Card className="border-primary/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  <p className="text-sm text-muted-foreground">预计完成日期</p>
                </div>
                <p className="text-4xl font-bold text-primary">{result.endDate}</p>
              </CardContent>
            </Card>

            {/* Working Days vs Calendar Days Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">工作日</p>
                    <p className="text-3xl font-bold text-primary">{result.workingDays}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">日历天数</p>
                    <p className="text-3xl font-bold">{result.calendarDays}</p>
                  </div>
                </CardContent>
              </Card>
              {result.bufferDays > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">缓冲天数</p>
                      <p className="text-3xl font-bold text-yellow-400">{result.bufferDays}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Holidays Encountered */}
            {result.holidaysEncountered.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    期间节假日 ({result.holidaysEncountered.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">日期</th>
                          <th className="text-left py-2">节假日名称</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.holidaysEncountered.map((holiday, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-mono text-xs">{holiday.date}</td>
                            <td className="py-2 font-medium">{holiday.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Critical Periods */}
            {result.criticalPeriods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    关键时段预警 ({result.criticalPeriods.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.criticalPeriods.map((cp, idx) => (
                      <div key={idx} className="p-3 rounded bg-muted/50 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                          <span className="font-medium text-sm">{cp.period}</span>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">注意</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">{cp.reason}</p>
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
                    <CheckCircle className="h-5 w-5 text-green-400" />
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
