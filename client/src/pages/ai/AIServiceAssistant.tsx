/**
 * AI服务助手
 * 智能故障诊断、维保计划管理与知识库匹配
 *
 * Data source: trpc.serviceAssistant.getDashboard (DB-backed)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Headphones, Search, Loader2,
  Sparkles, ArrowRight, Wrench, FileText, Calendar,
  BookOpen, ChevronRight, Clock, Activity, Zap,
} from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const maintenanceStatusColor: Record<string, string> = {
  "正常": "bg-green-500/20 text-green-400",
  "即将到期": "bg-yellow-500/20 text-yellow-400",
  "今日": "bg-red-500/20 text-red-400",
  "逾期": "bg-red-500/20 text-red-400",
};

export default function AIServiceAssistant() {
  const [symptomInput, setSymptomInput] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [kbQuery, setKbQuery] = useState("");
  const [kbSearching, setKbSearching] = useState(false);
  const [showKbResults, setShowKbResults] = useState(true);

  // ─── tRPC ───
  const dashQuery = trpc.serviceAssistant.getDashboard.useQuery(undefined, QUERY_OPTS);
  const dash = dashQuery.data ?? { steps: [], actions: [], maintenance: [], summaries: [], kb: [] };
  const diagnosisSteps = dash.steps as any[];
  const diagnosisActions = dash.actions as any[];
  const maintenance = dash.maintenance as any[];
  const summaries = dash.summaries as any[];
  const kbArticles = dash.kb as any[];

  const handleDiagnose = () => {
    if (!symptomInput.trim()) return;
    setDiagnosing(true);
    setTimeout(() => { setDiagnosing(false); setShowDiagnosis(true); }, 2000);
  };

  const handleKbSearch = () => {
    if (!kbQuery.trim()) return;
    setKbSearching(true);
    setTimeout(() => { setKbSearching(false); setShowKbResults(true); }, 1000);
  };

  if (dashQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader icon={Headphones} title="AI服务助手" description="..." />
        <Skeleton className="h-10 w-96" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6 p-6">
        <PageHeader icon={Headphones} title="AI服务助手" description="智能故障诊断、维保计划管理与知识库匹配" />

        <Tabs defaultValue="diagnosis" className="space-y-4">
          <TabsList>
            <TabsTrigger value="diagnosis"><Zap className="w-4 h-4 mr-1" />故障诊断</TabsTrigger>
            <TabsTrigger value="maintenance"><Calendar className="w-4 h-4 mr-1" />维保计划</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-1" />服务报告</TabsTrigger>
            <TabsTrigger value="kb"><BookOpen className="w-4 h-4 mr-1" />知识库匹配</TabsTrigger>
          </TabsList>

          {/* Fault Diagnosis */}
          <TabsContent value="diagnosis" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">故障症状描述</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="描述设备故障症状，例如：USC-3000超声波清洗机运行时噪音异常，清洗效果下降..." value={symptomInput} onChange={e => setSymptomInput(e.target.value)} rows={3} />
                <Button onClick={handleDiagnose} disabled={diagnosing || !symptomInput.trim()}>
                  {diagnosing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />诊断中...</> : <><Sparkles className="w-4 h-4 mr-1" />智能诊断</>}
                </Button>
              </CardContent>
            </Card>

            {showDiagnosis && (
              <>
                <Card className="border-primary">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />决策树诊断路径</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {diagnosisSteps.map((step: any, idx: number) => (
                      <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">{idx + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{step.question}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{step.result}</p>
                        </div>
                        <Badge variant="outline">{step.confidence}%</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-5 h-5" />建议操作</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {diagnosisActions.map((act: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-muted-foreground">{idx + 1}.</span>
                            <span className="text-sm font-medium">{act.action}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={act.priority === "高" ? "text-red-400" : act.priority === "中" ? "text-yellow-400" : "text-green-400"}>{act.priority}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{act.estimatedTime}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Maintenance Plan */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">设备维护保养计划总览</p>
              <Button size="sm"><Sparkles className="w-4 h-4 mr-1" />AI优化排程</Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b">
                      <th className="text-left py-2 px-3">设备</th><th className="text-left py-2 px-3">维护任务</th><th className="text-left py-2 px-3">周期</th><th className="text-left py-2 px-3">下次执行</th><th className="text-left py-2 px-3">状态</th>
                    </tr></thead>
                    <tbody>{maintenance.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{item.equipment}</td>
                        <td className="py-2 px-3">{item.task}</td>
                        <td className="py-2 px-3">{item.interval}</td>
                        <td className="py-2 px-3 font-mono text-xs">{item.nextDue}</td>
                        <td className="py-2 px-3"><Badge className={maintenanceStatusColor[item.status] ?? "bg-gray-500/20 text-gray-400"}>{item.status}</Badge></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Reports */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">近期服务工单摘要</p>
              <Button size="sm"><Sparkles className="w-4 h-4 mr-1" />AI生成汇总报告</Button>
            </div>
            <div className="space-y-3">
              {summaries.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">{s.ticketNo}</Badge>
                          <span className="text-sm font-medium">{s.customer}</span>
                          <Badge variant="outline">{s.equipment}</Badge>
                        </div>
                        <p className="text-sm mt-1"><span className="text-muted-foreground">问题: </span>{s.issue}</p>
                        <p className="text-sm mt-1"><span className="text-muted-foreground">解决: </span>{s.resolution}</p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><Clock className="w-3 h-3" />处理时长: {s.duration}</span>
                      </div>
                      <Button size="sm" variant="ghost"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Knowledge Base */}
          <TabsContent value="kb" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索知识库文章..." value={kbQuery} onChange={e => setKbQuery(e.target.value)} className="pl-9" onKeyDown={e => { if (e.key === "Enter") handleKbSearch(); }} />
              </div>
              <Button onClick={handleKbSearch} disabled={kbSearching}>
                {kbSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {showKbResults && (
              <div className="space-y-3">
                {kbArticles.map((article: any) => (
                  <Card key={article.id} className="hover:border-primary/50 cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{article.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">{article.category}</Badge>
                            <span>浏览: {article.views}</span>
                            <span>更新: {article.lastUpdated}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{article.relevance}%</div>
                          <div className="text-xs text-muted-foreground">匹配度</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
