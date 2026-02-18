import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Headphones, Search, Loader2, AlertTriangle, CheckCircle,
  Sparkles, ArrowRight, Wrench, FileText, Calendar,
  BookOpen, ChevronRight, Clock, Activity, Zap,
} from "lucide-react";

// ============================================================
// Types & Mock Data
// ============================================================

interface DiagnosisStep { id: number; question: string; result: string; confidence: number; }
interface DiagnosisAction { action: string; priority: string; estimatedTime: string; }
interface MaintenanceItem { id: string; equipment: string; task: string; interval: string; nextDue: string; status: string; }
interface ServiceSummary { id: string; ticketNo: string; customer: string; equipment: string; issue: string; resolution: string; duration: string; }
interface KBArticle { id: string; title: string; category: string; relevance: number; views: number; lastUpdated: string; }

const MOCK_DIAGNOSIS_STEPS: DiagnosisStep[] = [
  { id: 1, question: "设备是否有异常噪音?", result: "是 - 超声波槽体振动异常", confidence: 90 },
  { id: 2, question: "清洗液温度是否正常?", result: "正常 - 55C在范围内", confidence: 95 },
  { id: 3, question: "超声波功率输出是否达标?", result: "偏低 - 实测功率仅为额定的65%", confidence: 88 },
  { id: 4, question: "换能器是否有脱胶现象?", result: "疑似 - 需要现场确认", confidence: 72 },
];

const MOCK_ACTIONS: DiagnosisAction[] = [
  { action: "检查超声波换能器与槽体的粘接状态", priority: "高", estimatedTime: "30分钟" },
  { action: "使用阻抗分析仪测量换能器频率响应", priority: "高", estimatedTime: "1小时" },
  { action: "如确认脱胶，更换换能器并重新粘接", priority: "中", estimatedTime: "4小时" },
  { action: "更换后进行功率输出校验", priority: "中", estimatedTime: "1小时" },
  { action: "运行清洗测试验证效果", priority: "低", estimatedTime: "2小时" },
];

const MOCK_MAINTENANCE: MaintenanceItem[] = [
  { id: "m1", equipment: "USC-3000 #001", task: "清洗液更换", interval: "每月", nextDue: "2026-02-20", status: "即将到期" },
  { id: "m2", equipment: "USC-3000 #001", task: "过滤器清洁", interval: "每周", nextDue: "2026-02-15", status: "正常" },
  { id: "m3", equipment: "USC-3000 #001", task: "换能器功率检测", interval: "每季度", nextDue: "2026-03-01", status: "正常" },
  { id: "m4", equipment: "SPR-5000 #002", task: "喷嘴检查与清洁", interval: "每两周", nextDue: "2026-02-14", status: "今日" },
  { id: "m5", equipment: "SPR-5000 #002", task: "高压泵密封件检查", interval: "每月", nextDue: "2026-02-28", status: "正常" },
  { id: "m6", equipment: "ASC-5000 #003", task: "传动链条润滑", interval: "每周", nextDue: "2026-02-16", status: "正常" },
  { id: "m7", equipment: "ASC-5000 #003", task: "安全联锁功能测试", interval: "每月", nextDue: "2026-02-25", status: "正常" },
  { id: "m8", equipment: "USC-2000 #004", task: "PLC程序备份", interval: "每季度", nextDue: "2026-02-18", status: "即将到期" },
];

const MOCK_SUMMARIES: ServiceSummary[] = [
  { id: "s1", ticketNo: "SRV-2026-0128", customer: "宝马汽车(沈阳)", equipment: "USC-3000", issue: "清洗效果不稳定，部分工件残留超标", resolution: "更换两个衰减换能器，重新校准超声功率", duration: "6小时" },
  { id: "s2", ticketNo: "SRV-2026-0125", customer: "博世(苏州)", equipment: "SPR-5000", issue: "喷淋压力波动，泵站异响", resolution: "更换高压泵密封件，清洗安全阀", duration: "4小时" },
  { id: "s3", ticketNo: "SRV-2026-0120", customer: "中航工业", equipment: "ASC-5000", issue: "传送带偶发卡顿，PLC报警", resolution: "调整传送带张力，更新PLC逻辑消除误报", duration: "8小时" },
];

const MOCK_KB: KBArticle[] = [
  { id: "kb1", title: "超声波换能器脱胶故障诊断与处理", category: "故障处理", relevance: 98, views: 342, lastUpdated: "2025-12-15" },
  { id: "kb2", title: "USC-3000功率输出偏低排查流程", category: "故障处理", relevance: 95, views: 256, lastUpdated: "2025-11-20" },
  { id: "kb3", title: "超声波清洗设备日常维护保养指南", category: "维护保养", relevance: 82, views: 518, lastUpdated: "2025-10-01" },
  { id: "kb4", title: "清洗液浓度异常处理方案", category: "工艺优化", relevance: 75, views: 189, lastUpdated: "2025-09-15" },
  { id: "kb5", title: "PLC报警代码速查手册", category: "技术手册", relevance: 68, views: 723, lastUpdated: "2025-08-20" },
  { id: "kb6", title: "高压泵维修保养标准作业", category: "维护保养", relevance: 62, views: 291, lastUpdated: "2025-11-05" },
];

const maintenanceStatusColor: Record<string, string> = {
  "正常": "bg-green-500/20 text-green-400",
  "即将到期": "bg-yellow-500/20 text-yellow-400",
  "今日": "bg-red-500/20 text-red-400",
  "逾期": "bg-red-500/20 text-red-400",
};

// ============================================================
// Component
// ============================================================

export default function AIServiceAssistant() {
  const [symptomInput, setSymptomInput] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [kbQuery, setKbQuery] = useState("");
  const [kbSearching, setKbSearching] = useState(false);
  const [showKbResults, setShowKbResults] = useState(true);

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
                    {MOCK_DIAGNOSIS_STEPS.map((step, idx) => (
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
                      {MOCK_ACTIONS.map((act, idx) => (
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
                    <tbody>{MOCK_MAINTENANCE.map(item => (
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
              {MOCK_SUMMARIES.map(s => (
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
                {MOCK_KB.map(article => (
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
