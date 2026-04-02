/**
 * 销售人员工作台 — M0-M2 每日统一入口
 *
 * 角色: 销售工程师(戴晓燕/沈迎凤), 销售经理, 大客户经理
 * M0: 线索→商机 (Lead Qualification)
 * M1: 技术方案→报价 (Solution & Quotation)
 * M2: 合同谈判→签约 (Contract Negotiation)
 *
 * 一页搞定: 今日任务 · 线索跟进 · 商机管道 · 报价进度 · 客户日历 · M阶段门
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Target, Users, Phone, Mail, Calendar, TrendingUp, DollarSign, FileText,
  Clock, CheckCircle, AlertTriangle, ArrowRight, Star, Eye, MessageSquare,
  Briefcase, MapPin, Zap, Trophy, ChevronRight, PlusCircle, Filter
} from "lucide-react";

// ── GRT Real Sales Data ──
const TODAY_TASKS = [
  { id: 1, time: "09:00", type: "call", title: "回访大众汽车-清洁度需求确认", customer: "大众汽车(中国)", contact: "王总工", priority: "high", phase: "M1", done: false },
  { id: 2, time: "10:30", type: "visit", title: "宁德时代现场勘查 — 半导体清洗线", customer: "宁德时代", contact: "李采购", priority: "critical", phase: "M0", done: false },
  { id: 3, time: "14:00", type: "meeting", title: "GRT-S3报价评审会(内部)", customer: "博世华域", contact: "", priority: "medium", phase: "M1", done: false },
  { id: 4, time: "15:30", type: "email", title: "发送定制清洗方案PPT", customer: "采埃孚(ZF)", contact: "张经理", priority: "medium", phase: "M1", done: true },
  { id: 5, time: "16:00", type: "call", title: "合同条款二轮谈判", customer: "舍弗勒(Schaeffler)", contact: "陈总", priority: "high", phase: "M2", done: false },
];

const LEADS = [
  { id: "LD-2026-042", source: "展会", customer: "比亚迪汽车", contact: "刘工", phone: "138****5678", need: "齿轮轴清洗线x2", budget: "150万", score: 92, status: "hot", daysOld: 3, nextAction: "现场勘查", nextDate: "04-02" },
  { id: "LD-2026-041", source: "官网", customer: "吉利汽车", contact: "赵采购", phone: "139****1234", need: "超声波清洗机", budget: "80万", score: 85, status: "warm", daysOld: 5, nextAction: "电话跟进", nextDate: "04-01" },
  { id: "LD-2026-040", source: "转介绍", customer: "三一重工", contact: "孙总", phone: "137****9876", need: "高压喷淋系统", budget: "200万", score: 78, status: "warm", daysOld: 8, nextAction: "方案发送", nextDate: "04-03" },
  { id: "LD-2026-039", source: "百度SEM", customer: "中国中车", contact: "李工程师", phone: "136****4321", need: "清洁度检测设备", budget: "60万", score: 65, status: "cold", daysOld: 12, nextAction: "需求确认", nextDate: "04-05" },
  { id: "LD-2026-038", source: "展会", customer: "蔚来汽车", contact: "王VP", phone: "135****8765", need: "电驱清洗线", budget: "300万", score: 95, status: "hot", daysOld: 2, nextAction: "CTO演示", nextDate: "03-31" },
];

const PIPELINE = [
  { id: "OPP-001", customer: "博世华域", project: "GRT-S3超声波清洗机x3台", amount: 840000, phase: "M1", stage: "报价中", probability: 75, owner: "戴晓燕", days: 45, nextGate: "技术评审" },
  { id: "OPP-002", customer: "舍弗勒(Schaeffler)", project: "齿轮轴清洗线整线", amount: 2800000, phase: "M2", stage: "合同谈判", probability: 85, owner: "戴晓燕", days: 60, nextGate: "合同审批" },
  { id: "OPP-003", customer: "大众汽车(中国)", project: "VW清洁度检测系统", amount: 650000, phase: "M1", stage: "方案设计", probability: 60, owner: "沈迎凤", days: 30, nextGate: "方案评审" },
  { id: "OPP-004", customer: "蔚来汽车", project: "电驱系统清洗产线", amount: 3200000, phase: "M0", stage: "需求分析", probability: 40, owner: "戴晓燕", days: 8, nextGate: "可行性评估" },
  { id: "OPP-005", customer: "宁德时代", project: "半导体级超纯水清洗", amount: 5500000, phase: "M0", stage: "现场勘查", probability: 30, owner: "沈迎凤", days: 5, nextGate: "URS确认" },
  { id: "OPP-006", customer: "比亚迪汽车", project: "齿轮轴清洗线x2套", amount: 1500000, phase: "M0", stage: "线索评估", probability: 25, owner: "戴晓燕", days: 3, nextGate: "需求确认" },
];

const QUOTES = [
  { id: "QT-2026-015", customer: "博世华域", project: "GRT-S3x3台", version: "v2.1", amount: 840000, status: "reviewing", sentDate: "2026-03-25", validUntil: "2026-04-25", feedback: "客户要求降价5%" },
  { id: "QT-2026-014", customer: "大众汽车", project: "VW清洁度系统", version: "v1.0", amount: 650000, status: "sent", sentDate: "2026-03-28", validUntil: "2026-04-28", feedback: "" },
  { id: "QT-2026-013", customer: "舍弗勒", project: "齿轮轴整线", version: "v3.2", amount: 2800000, status: "negotiating", sentDate: "2026-03-15", validUntil: "2026-04-15", feedback: "付款方式需30/30/30/10" },
];

const PHASE_GATES = [
  { phase: "M0", name: "商机确认", icon: Target, color: "text-purple-600 bg-purple-100", gates: ["线索评估", "需求确认", "现场勘查", "可行性评估"], description: "Lead→Opportunity" },
  { phase: "M1", name: "方案报价", icon: FileText, color: "text-blue-600 bg-blue-100", gates: ["URS评审", "方案设计", "技术评审", "报价提交", "客户反馈"], description: "Solution→Quote" },
  { phase: "M2", name: "合同签约", icon: DollarSign, color: "text-green-600 bg-green-100", gates: ["商务谈判", "合同评审", "法务审核", "CEO审批", "签约"], description: "Negotiate→Contract" },
];

const LEAD_STATUS_COLOR: Record<string, string> = { hot: "bg-red-100 text-red-700", warm: "bg-orange-100 text-orange-700", cold: "bg-blue-100 text-blue-700" };
const PRIORITY_COLOR: Record<string, string> = { critical: "bg-red-600 text-white", high: "bg-orange-100 text-orange-700", medium: "bg-blue-100 text-blue-700", low: "bg-gray-100 text-gray-600" };
const TASK_ICON: Record<string, typeof Phone> = { call: Phone, visit: MapPin, meeting: Users, email: Mail };

export default function SalesWorkstation() {
  const { language } = useLanguage();
  const { currentUserRole: name } = useUserProfile();
  const [activeTab, setActiveTab] = useState("today");

  // KPI
  const kpis = useMemo(() => {
    const totalPipeline = PIPELINE.reduce((s, p) => s + p.amount, 0);
    const weightedPipeline = PIPELINE.reduce((s, p) => s + p.amount * p.probability / 100, 0);
    const hotLeads = LEADS.filter(l => l.status === "hot").length;
    const pendingQuotes = QUOTES.filter(q => q.status !== "won").length;
    const todayUndone = TODAY_TASKS.filter(t => !t.done).length;
    return { totalPipeline, weightedPipeline, hotLeads, pendingQuotes, todayUndone };
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-orange-600" />
            {language === "zh" ? "销售工作台" : "Sales Workstation"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "zh" ? `${name || "销售工程师"} · M0线索→M1方案报价→M2合同签约 · 今日${new Date().toLocaleDateString("zh-CN")}` : `${name || "Sales Engineer"} · M0→M1→M2 Pipeline`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Calendar className="h-4 w-4 mr-1" /> {language === "zh" ? "日历" : "Calendar"}</Button>
          <Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> {language === "zh" ? "新建商机" : "New Opp"}</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{language === "zh" ? "管道总额" : "Pipeline"}</p>
            <p className="text-xl font-bold">¥{(kpis.totalPipeline / 10000).toFixed(0)}万</p>
            <p className="text-xs text-green-600">加权 ¥{(kpis.weightedPipeline / 10000).toFixed(0)}万</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{language === "zh" ? "热线索" : "Hot Leads"}</p>
            <p className="text-xl font-bold text-red-600">{kpis.hotLeads}</p>
            <p className="text-xs text-muted-foreground">{language === "zh" ? "需48h内跟进" : "Follow in 48h"}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{language === "zh" ? "待处理报价" : "Pending Quotes"}</p>
            <p className="text-xl font-bold text-blue-600">{kpis.pendingQuotes}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{language === "zh" ? "今日待办" : "Today Tasks"}</p>
            <p className="text-xl font-bold text-yellow-600">{kpis.todayUndone}</p>
            <p className="text-xs text-muted-foreground">{language === "zh" ? `共${TODAY_TASKS.length}项` : `of ${TODAY_TASKS.length}`}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{language === "zh" ? "本月成交" : "Month Won"}</p>
            <p className="text-xl font-bold text-green-600">¥280万</p>
            <p className="text-xs text-green-600">+12% vs 上月</p>
          </CardContent>
        </Card>
      </div>

      {/* M0-M2 Phase Gate Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1">
            {PHASE_GATES.map((pg, i) => {
              const count = PIPELINE.filter(p => p.phase === pg.phase).length;
              const amount = PIPELINE.filter(p => p.phase === pg.phase).reduce((s, p) => s + p.amount, 0);
              return (
                <div key={pg.phase} className="flex items-center flex-1">
                  <div className={`flex-1 rounded-lg p-3 ${pg.color.split(" ")[1]} border`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <pg.icon className={`h-4 w-4 ${pg.color.split(" ")[0]}`} />
                        <span className="font-bold text-sm">{pg.phase}</span>
                        <span className="text-xs">{pg.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{count}{language === "zh" ? "个" : ""}</Badge>
                    </div>
                    <p className="text-lg font-bold">{amount > 0 ? `¥${(amount / 10000).toFixed(0)}万` : "-"}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {pg.gates.map(g => <span key={g} className="text-[10px] bg-white/60 rounded px-1">{g}</span>)}
                    </div>
                  </div>
                  {i < PHASE_GATES.length - 1 && <ChevronRight className="h-5 w-5 text-gray-400 mx-1 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="today" className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {language === "zh" ? "今日任务" : "Today"} <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{kpis.todayUndone}</Badge></TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {language === "zh" ? "线索(M0)" : "Leads"}</TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> {language === "zh" ? "商机管道" : "Pipeline"}</TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {language === "zh" ? "报价(M1)" : "Quotes"}</TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {language === "zh" ? "签约(M2)" : "Contracts"}</TabsTrigger>
        </TabsList>

        {/* Today Tasks */}
        <TabsContent value="today" className="mt-4 space-y-2">
          {TODAY_TASKS.map(task => {
            const Icon = TASK_ICON[task.type] || Clock;
            return (
              <Card key={task.id} className={`${task.done ? "opacity-50" : ""} ${task.priority === "critical" ? "border-l-4 border-l-red-500" : ""}`}>
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="text-center w-14">
                    <p className="text-sm font-mono font-bold">{task.time}</p>
                    <Badge className={`${PRIORITY_COLOR[task.priority]} text-[10px] mt-0.5`}>{task.priority === "critical" ? "紧急" : task.priority === "high" ? "高" : "中"}</Badge>
                  </div>
                  <Icon className={`h-5 w-5 flex-shrink-0 ${task.done ? "text-green-500" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className={`font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.customer} · {task.contact} · <Badge variant="outline" className="text-[10px]">{task.phase}</Badge></p>
                  </div>
                  <div className="flex gap-1">
                    {!task.done && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7"><Phone className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7"><MessageSquare className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"><CheckCircle className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "完成" : "Done"}</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Leads (M0) */}
        <TabsContent value="leads" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "温度" : "Temp"}</TableHead>
                  <TableHead>{language === "zh" ? "线索号" : "Lead ID"}</TableHead>
                  <TableHead>{language === "zh" ? "来源" : "Source"}</TableHead>
                  <TableHead>{language === "zh" ? "客户" : "Customer"}</TableHead>
                  <TableHead>{language === "zh" ? "需求" : "Need"}</TableHead>
                  <TableHead>{language === "zh" ? "预算" : "Budget"}</TableHead>
                  <TableHead>{language === "zh" ? "评分" : "Score"}</TableHead>
                  <TableHead>{language === "zh" ? "天数" : "Days"}</TableHead>
                  <TableHead>{language === "zh" ? "下一步" : "Next"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LEADS.map(lead => (
                  <TableRow key={lead.id} className={lead.status === "hot" ? "bg-red-50" : ""}>
                    <TableCell><Badge className={`${LEAD_STATUS_COLOR[lead.status]} text-xs`}>{lead.status === "hot" ? "🔥热" : lead.status === "warm" ? "温" : "冷"}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{lead.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{lead.source}</Badge></TableCell>
                    <TableCell className="font-medium">{lead.customer}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{lead.need}</TableCell>
                    <TableCell className="font-medium text-orange-600">{lead.budget}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Progress value={lead.score} className="w-12 h-1.5" />
                        <span className="text-xs font-bold">{lead.score}</span>
                      </div>
                    </TableCell>
                    <TableCell className={lead.daysOld > 7 ? "text-red-600 font-bold" : ""}>{lead.daysOld}d</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{lead.nextAction}</p>
                        <p className="text-[10px] text-muted-foreground">{lead.nextDate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Phone className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" className="h-7 text-xs"><ArrowRight className="h-3 w-3 mr-1" />{language === "zh" ? "转商机" : "Convert"}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Pipeline */}
        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "阶段" : "Phase"}</TableHead>
                  <TableHead>{language === "zh" ? "商机" : "Opportunity"}</TableHead>
                  <TableHead>{language === "zh" ? "客户" : "Customer"}</TableHead>
                  <TableHead>{language === "zh" ? "项目" : "Project"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "金额" : "Amount"}</TableHead>
                  <TableHead>{language === "zh" ? "概率" : "Prob"}</TableHead>
                  <TableHead>{language === "zh" ? "天数" : "Days"}</TableHead>
                  <TableHead>{language === "zh" ? "下一阶段门" : "Next Gate"}</TableHead>
                  <TableHead>{language === "zh" ? "负责人" : "Owner"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PIPELINE.sort((a, b) => b.amount - a.amount).map(opp => (
                  <TableRow key={opp.id}>
                    <TableCell>
                      <Badge className={opp.phase === "M0" ? "bg-purple-100 text-purple-700" : opp.phase === "M1" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                        {opp.phase}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{opp.id}</TableCell>
                    <TableCell className="font-medium">{opp.customer}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{opp.project}</TableCell>
                    <TableCell className="text-right font-bold">¥{(opp.amount / 10000).toFixed(0)}万</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Progress value={opp.probability} className={`w-10 h-1.5 ${opp.probability >= 70 ? "[&>div]:bg-green-500" : opp.probability >= 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`} />
                        <span className="text-xs">{opp.probability}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={opp.days > 30 ? "text-orange-600" : ""}>{opp.days}d</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{opp.nextGate}</Badge></TableCell>
                    <TableCell className="text-sm">{opp.owner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Quotes (M1) */}
        <TabsContent value="quotes" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "报价号" : "Quote#"}</TableHead>
                  <TableHead>{language === "zh" ? "客户" : "Customer"}</TableHead>
                  <TableHead>{language === "zh" ? "项目" : "Project"}</TableHead>
                  <TableHead>{language === "zh" ? "版本" : "Ver"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "金额" : "Amount"}</TableHead>
                  <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
                  <TableHead>{language === "zh" ? "发送日期" : "Sent"}</TableHead>
                  <TableHead>{language === "zh" ? "有效期" : "Valid Until"}</TableHead>
                  <TableHead>{language === "zh" ? "客户反馈" : "Feedback"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {QUOTES.map(qt => (
                  <TableRow key={qt.id}>
                    <TableCell className="font-mono text-sm">{qt.id}</TableCell>
                    <TableCell className="font-medium">{qt.customer}</TableCell>
                    <TableCell>{qt.project}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{qt.version}</Badge></TableCell>
                    <TableCell className="text-right font-bold">¥{(qt.amount / 10000).toFixed(0)}万</TableCell>
                    <TableCell>
                      <Badge className={qt.status === "negotiating" ? "bg-green-100 text-green-700" : qt.status === "reviewing" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}>
                        {qt.status === "negotiating" ? "谈判中" : qt.status === "reviewing" ? "评审中" : "已发送"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{qt.sentDate}</TableCell>
                    <TableCell className="text-sm">{qt.validUntil}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate text-muted-foreground">{qt.feedback || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Contracts (M2) */}
        <TabsContent value="contracts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-green-600" /> {language === "zh" ? "本月签约" : "Month Contracts"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { customer: "麦格纳(Magna)", project: "齿轮箱清洗线", amount: 1800000, date: "2026-03-15" },
                  { customer: "爱信精机(Aisin)", project: "变速箱零件清洗机x2", amount: 980000, date: "2026-03-22" },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">{c.customer}</p>
                      <p className="text-sm text-muted-foreground">{c.project}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">¥{(c.amount / 10000).toFixed(0)}万</p>
                      <p className="text-xs text-muted-foreground">{c.date}</p>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <p className="text-2xl font-bold text-green-600">¥280万</p>
                  <p className="text-sm text-muted-foreground">{language === "zh" ? "目标 ¥500万 · 完成率 56%" : "Target ¥500W · 56%"}</p>
                  <Progress value={56} className="mt-2 [&>div]:bg-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" /> {language === "zh" ? "待签约商机" : "Pending Contracts"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {PIPELINE.filter(p => p.phase === "M2").map(opp => (
                  <div key={opp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{opp.customer}</p>
                      <p className="text-sm text-muted-foreground">{opp.project}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">{opp.stage}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">¥{(opp.amount / 10000).toFixed(0)}万</p>
                      <p className="text-xs text-muted-foreground">{opp.probability}% {language === "zh" ? "概率" : "prob"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
