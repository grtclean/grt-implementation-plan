/**
 * 电气工程师工作台 — M4 电气设计阶段
 * 孙坚(电气主管): PLC编程 · 电气图纸 · I/O分配 · 安全合规 · 调试准备
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Zap, Cpu, FileText, CheckCircle, Clock, AlertTriangle, Eye, Shield,
  ArrowRight, Settings2, Upload, Monitor, Cable, Power, CircuitBoard,
  Activity, Calendar, MessageSquare, Lock
} from "lucide-react";

const MY_TASKS = [
  { id: "ET-M4-001", project: "博世华域-GRT-S3", task: "PLC主程序编写(S7-1200)", priority: "high", phase: "PLC编程", progress: 70, due: "2026-04-03", status: "active" },
  { id: "ET-M4-002", project: "博世华域-GRT-S3", task: "I/O分配表确认(128点)", priority: "high", phase: "I/O设计", progress: 90, due: "2026-04-01", status: "review" },
  { id: "ET-M4-003", project: "舍弗勒-齿轮轴整线", task: "电气原理图设计(EPLAN)", priority: "critical", phase: "原理图设计", progress: 55, due: "2026-03-31", status: "active" },
  { id: "ET-M4-004", project: "大众VW-清洁度系统", task: "HMI画面设计(10寸触摸屏)", priority: "medium", phase: "HMI设计", progress: 30, due: "2026-04-12", status: "active" },
  { id: "ET-M4-005", project: "博世华域-GRT-S3", task: "变频器参数配置(15kW)", priority: "medium", phase: "参数配置", progress: 0, due: "2026-04-08", status: "pending" },
  { id: "ET-M4-006", project: "蔚来-电驱清洗线", task: "电气方案概念设计", priority: "medium", phase: "概念设计", progress: 15, due: "2026-04-15", status: "active" },
];

const IO_ALLOCATION = [
  { project: "博世华域-GRT-S3", plc: "S7-1200 DC/DC/DC", di: 48, do: 32, ai: 8, ao: 4, used_di: 42, used_do: 28, used_ai: 6, used_ao: 3, status: "confirmed" },
  { project: "舍弗勒-齿轮轴整线", plc: "S7-1500 CPU1515", di: 128, do: 64, ai: 16, ao: 8, used_di: 85, used_do: 42, used_ai: 12, used_ao: 5, status: "designing" },
  { project: "大众VW-清洁度系统", plc: "S7-1200 AC/DC/RLY", di: 32, do: 24, ai: 4, ao: 2, used_di: 18, used_do: 12, used_ai: 3, used_ao: 1, status: "planning" },
];

const SAFETY_COMPLIANCE = [
  { project: "博世华域-GRT-S3", standard: "CE", items: [
    { name: "急停回路设计(EN ISO 13850)", done: true },
    { name: "安全PLC/继电器选型", done: true },
    { name: "风险评估报告(EN ISO 12100)", done: false },
    { name: "EMC测试计划(EN 61000)", done: false },
    { name: "电气安全(EN 60204-1)", done: true },
    { name: "CE技术文档编制", done: false },
  ]},
  { project: "舍弗勒-齿轮轴整线", standard: "CE+UL", items: [
    { name: "急停回路(EN ISO 13850)", done: true },
    { name: "UL认证元器件清单", done: false },
    { name: "NFPA 79合规", done: false },
    { name: "接地系统设计", done: true },
    { name: "短路保护计算", done: false },
  ]},
];

const PRIORITY_COLOR: Record<string, string> = { critical: "bg-red-600 text-white", high: "bg-orange-100 text-orange-700", medium: "bg-blue-100 text-blue-700" };

export default function ElectricalEngineerWorkstation() {
  const { language } = useLanguage();
  const [tab, setTab] = useState("tasks");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-7 w-7 text-yellow-500" />
            {language === "zh" ? "电气工程师工作台" : "Electrical Engineer Workstation"}
          </h1>
          <p className="text-muted-foreground mt-1">{language === "zh" ? "M4阶段 · PLC编程→电气图纸→I/O分配→安全合规→调试" : "M4 Phase · PLC→Schematics→I/O→Safety→Commissioning"}</p>
        </div>
        <Button size="sm"><Upload className="h-4 w-4 mr-1" />{language === "zh" ? "上传EPLAN" : "Upload EPLAN"}</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: language === "zh" ? "设计任务" : "Tasks", value: MY_TASKS.length, icon: Cpu, color: "text-yellow-600 border-l-yellow-500" },
          { label: language === "zh" ? "PLC项目" : "PLC Projects", value: IO_ALLOCATION.length, icon: CircuitBoard, color: "text-green-600 border-l-green-500" },
          { label: language === "zh" ? "I/O利用率" : "I/O Usage", value: "78%", icon: Cable, color: "text-blue-600 border-l-blue-500" },
          { label: language === "zh" ? "安全合规" : "Safety", value: "58%", icon: Shield, color: "text-orange-600 border-l-orange-500" },
          { label: language === "zh" ? "待评审" : "Reviews", value: 2, icon: Eye, color: "text-purple-600 border-l-purple-500" },
          { label: language === "zh" ? "程序版本" : "PLC Ver", value: "v3.2", icon: Activity, color: "text-sky-600 border-l-sky-500" },
        ].map(kpi => (
          <Card key={kpi.label} className={`border-l-4 ${kpi.color.split(" ")[1]}`}>
            <CardContent className="p-3">
              <kpi.icon className={`h-5 w-5 ${kpi.color.split(" ")[0]} opacity-60 mb-1`} />
              <p className={`text-xl font-bold ${kpi.color.split(" ")[0]}`}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks"><Cpu className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "设计任务" : "Tasks"}</TabsTrigger>
          <TabsTrigger value="io"><Cable className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "I/O分配" : "I/O Map"}</TabsTrigger>
          <TabsTrigger value="safety"><Shield className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "安全合规" : "Safety"}</TabsTrigger>
          <TabsTrigger value="commissioning"><Power className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "调试准备" : "Commission"}</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{language === "zh" ? "优先级" : "P"}</TableHead>
                <TableHead>{language === "zh" ? "任务" : "Task"}</TableHead>
                <TableHead>{language === "zh" ? "项目" : "Project"}</TableHead>
                <TableHead>{language === "zh" ? "阶段" : "Phase"}</TableHead>
                <TableHead>{language === "zh" ? "进度" : "Progress"}</TableHead>
                <TableHead>{language === "zh" ? "截止" : "Due"}</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {MY_TASKS.map(t => (
                  <TableRow key={t.id} className={new Date(t.due) <= new Date() && t.progress < 100 ? "bg-red-50" : ""}>
                    <TableCell><Badge className={`text-[10px] ${PRIORITY_COLOR[t.priority]}`}>{t.priority === "critical" ? "紧急" : t.priority === "high" ? "高" : "中"}</Badge></TableCell>
                    <TableCell><p className="font-medium text-sm">{t.task}</p><p className="text-[10px] text-muted-foreground">{t.id}</p></TableCell>
                    <TableCell className="text-sm">{t.project}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.phase}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={t.progress} className="w-16 h-1.5" /><span className="text-xs">{t.progress}%</span></div></TableCell>
                    <TableCell className="text-sm">{t.due}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="h-7"><ArrowRight className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="io" className="mt-4 space-y-4">
          {IO_ALLOCATION.map(io => (
            <Card key={io.project}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{io.project}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{io.plc}</Badge>
                    <Badge className={io.status === "confirmed" ? "bg-green-100 text-green-700" : io.status === "designing" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>{io.status === "confirmed" ? "已确认" : io.status === "designing" ? "设计中" : "规划中"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "DI (数字输入)", total: io.di, used: io.used_di },
                    { label: "DO (数字输出)", total: io.do, used: io.used_do },
                    { label: "AI (模拟输入)", total: io.ai, used: io.used_ai },
                    { label: "AO (模拟输出)", total: io.ao, used: io.used_ao },
                  ].map(ch => (
                    <div key={ch.label} className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">{ch.label}</p>
                      <p className="text-lg font-bold">{ch.used}<span className="text-muted-foreground text-sm font-normal">/{ch.total}</span></p>
                      <Progress value={ch.used / ch.total * 100} className={`h-2 mt-1 ${ch.used / ch.total > 0.9 ? "[&>div]:bg-red-500" : ch.used / ch.total > 0.7 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{language === "zh" ? `余${ch.total - ch.used}点` : `${ch.total - ch.used} free`}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="safety" className="mt-4 space-y-4">
          {SAFETY_COMPLIANCE.map(sc => {
            const done = sc.items.filter(i => i.done).length;
            const pct = Math.round(done / sc.items.length * 100);
            return (
              <Card key={sc.project} className={pct < 50 ? "border-l-4 border-l-orange-500" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> {sc.project}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{sc.standard}</Badge>
                      <Badge className={pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>{pct}%</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {sc.items.map(item => (
                      <div key={item.name} className={`flex items-center gap-2 p-2 rounded border ${item.done ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
                        {item.done ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                        <span className="text-xs">{item.name}</span>
                      </div>
                    ))}
                  </div>
                  <Progress value={pct} className="mt-3 h-2" />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="commissioning" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Power className="h-4 w-4" />{language === "zh" ? "调试准备清单" : "Commissioning Prep"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "PLC程序最终版本确认", project: "博世华域-GRT-S3", done: false },
                { name: "变频器参数表编制", project: "博世华域-GRT-S3", done: false },
                { name: "HMI画面最终版本", project: "博世华域-GRT-S3", done: false },
                { name: "I/O测试表编制", project: "博世华域-GRT-S3", done: true },
                { name: "安全回路测试方案", project: "博世华域-GRT-S3", done: true },
                { name: "电气接线图核对", project: "博世华域-GRT-S3", done: true },
                { name: "备品备件清单", project: "博世华域-GRT-S3", done: false },
                { name: "调试工具准备(示波器/万用表)", project: "博世华域-GRT-S3", done: true },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded border ${item.done ? "bg-green-50 border-green-200" : ""}`}>
                  {item.done ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-gray-400" />}
                  <span className={`text-sm flex-1 ${item.done ? "text-green-700" : ""}`}>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.project}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
