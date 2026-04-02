/**
 * 机械工程师工作台 — M3 设计阶段统一入口
 * 洪香龙(机械主管): 今日设计任务 · 图纸评审 · ECO变更 · 设计冻结 · BOM协同
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
  Wrench, FileText, CheckCircle, Clock, AlertTriangle, Eye, Layers,
  PenTool, GitBranch, Lock, ArrowRight, Star, Box, Ruler, Settings2,
  ShieldCheck, Upload, MessageSquare, Calendar
} from "lucide-react";

const MY_TASKS = [
  { id: "DT-M3-001", project: "博世华域-GRT-S3", task: "清洗篮框架3D建模", priority: "high", phase: "详细设计", progress: 85, dueDate: "2026-04-02", status: "active" },
  { id: "DT-M3-002", project: "舍弗勒-齿轮轴整线", task: "主轴箱体强度分析(FEA)", priority: "critical", phase: "校核验证", progress: 60, dueDate: "2026-03-31", status: "active" },
  { id: "DT-M3-003", project: "大众VW-清洁度系统", task: "喷淋管路布局设计", priority: "medium", phase: "方案设计", progress: 40, dueDate: "2026-04-10", status: "active" },
  { id: "DT-M3-004", project: "蔚来-电驱清洗线", task: "概念方案3D渲染", priority: "medium", phase: "概念设计", progress: 20, dueDate: "2026-04-15", status: "active" },
  { id: "DT-M3-005", project: "博世华域-GRT-S3", task: "传动轴装配图出图", priority: "high", phase: "出图审批", progress: 95, dueDate: "2026-04-01", status: "review" },
];

const PENDING_REVIEWS = [
  { id: "DR-001", drawing: "GRT-S3-ASM-001", title: "超声波清洗机总装图 v2.1", designer: "洪香龙", type: "assembly", pages: 3, submitted: "2026-03-28", reviewer: "徐树奎", status: "pending" },
  { id: "DR-002", drawing: "GRT-S3-DET-015", title: "清洗篮框架详图", designer: "机械组员A", type: "detail", pages: 2, submitted: "2026-03-29", reviewer: "洪香龙", status: "pending" },
  { id: "DR-003", drawing: "GRT-H2-PIP-008", title: "高压喷淋管路图", designer: "洪香龙", type: "piping", pages: 1, submitted: "2026-03-27", reviewer: "金晓锋", status: "approved" },
];

const ECO_LIST = [
  { id: "ECO-2026-008", project: "博世华域-GRT-S3", title: "清洗篮挂钩位置调整(客户要求)", impact: "BOM变更+加工图修改", severity: "major", status: "open", requestor: "戴晓燕(销售)", dueDate: "2026-04-05" },
  { id: "ECO-2026-007", project: "舍弗勒-整线", title: "减速机选型变更(力矩不足)", impact: "BOM+采购+电气图", severity: "critical", status: "reviewing", requestor: "洪香龙", dueDate: "2026-04-02" },
  { id: "ECO-2026-006", project: "通用项目", title: "标准件M10螺栓升级为A4-80", impact: "BOM批量更新", severity: "minor", status: "approved", requestor: "金晓锋(质量)", dueDate: "2026-03-30" },
];

const DESIGN_FREEZE = [
  { project: "博世华域-GRT-S3", gate: "M3-G2", name: "详细设计冻结", items: [
    { name: "总装图审批", done: true }, { name: "BOM确认", done: true }, { name: "FEA校核", done: false },
    { name: "工艺评审", done: false }, { name: "客户确认", done: true }, { name: "设计变更关闭", done: false },
  ]},
  { project: "大众VW-清洁度系统", gate: "M3-G1", name: "方案设计冻结", items: [
    { name: "概念方案确认", done: true }, { name: "关键尺寸确定", done: true }, { name: "可行性报告", done: true },
    { name: "成本预估", done: false }, { name: "风险评估", done: false },
  ]},
];

const PRIORITY_COLOR: Record<string, string> = { critical: "bg-red-600 text-white", high: "bg-orange-100 text-orange-700", medium: "bg-blue-100 text-blue-700" };
const PHASE_COLOR: Record<string, string> = { "概念设计": "bg-purple-100 text-purple-700", "方案设计": "bg-blue-100 text-blue-700", "详细设计": "bg-indigo-100 text-indigo-700", "校核验证": "bg-yellow-100 text-yellow-700", "出图审批": "bg-green-100 text-green-700" };

export default function MechanicalEngineerWorkstation() {
  const { language } = useLanguage();
  const [tab, setTab] = useState("tasks");

  const overdue = MY_TASKS.filter(t => new Date(t.dueDate) < new Date() && t.progress < 100).length;
  const pendingReviews = PENDING_REVIEWS.filter(r => r.status === "pending").length;
  const openECOs = ECO_LIST.filter(e => e.status !== "approved").length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-7 w-7 text-sky-600" />
            {language === "zh" ? "机械工程师工作台" : "Mechanical Engineer Workstation"}
          </h1>
          <p className="text-muted-foreground mt-1">{language === "zh" ? "M3阶段 · 概念→方案→详细设计→校核→出图→冻结" : "M3 Phase · Concept→Detail→Verify→Release→Freeze"}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Calendar className="h-4 w-4 mr-1" />{language === "zh" ? "排程" : "Schedule"}</Button>
          <Button size="sm"><Upload className="h-4 w-4 mr-1" />{language === "zh" ? "上传图纸" : "Upload"}</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: language === "zh" ? "进行中任务" : "Active Tasks", value: MY_TASKS.length, icon: PenTool, color: "text-sky-600 border-l-sky-500" },
          { label: language === "zh" ? "逾期任务" : "Overdue", value: overdue, icon: AlertTriangle, color: overdue > 0 ? "text-red-600 border-l-red-500" : "text-green-600 border-l-green-500" },
          { label: language === "zh" ? "待评审图纸" : "Pending Reviews", value: pendingReviews, icon: Eye, color: "text-orange-600 border-l-orange-500" },
          { label: language === "zh" ? "开放ECO" : "Open ECOs", value: openECOs, icon: GitBranch, color: "text-purple-600 border-l-purple-500" },
          { label: language === "zh" ? "设计完成率" : "Design Complete", value: "72%", icon: CheckCircle, color: "text-blue-600 border-l-blue-500" },
          { label: language === "zh" ? "标准化率" : "Standardization", value: "85%", icon: ShieldCheck, color: "text-green-600 border-l-green-500" },
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
          <TabsTrigger value="tasks"><PenTool className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "设计任务" : "Tasks"}</TabsTrigger>
          <TabsTrigger value="reviews"><Eye className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "图纸评审" : "Reviews"} {pendingReviews > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{pendingReviews}</Badge>}</TabsTrigger>
          <TabsTrigger value="eco"><GitBranch className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "设计变更" : "ECO"}</TabsTrigger>
          <TabsTrigger value="freeze"><Lock className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "设计冻结" : "Freeze"}</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{language === "zh" ? "优先级" : "Priority"}</TableHead>
                <TableHead>{language === "zh" ? "任务" : "Task"}</TableHead>
                <TableHead>{language === "zh" ? "项目" : "Project"}</TableHead>
                <TableHead>{language === "zh" ? "阶段" : "Phase"}</TableHead>
                <TableHead>{language === "zh" ? "进度" : "Progress"}</TableHead>
                <TableHead>{language === "zh" ? "截止" : "Due"}</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {MY_TASKS.map(t => (
                  <TableRow key={t.id} className={new Date(t.dueDate) < new Date() && t.progress < 100 ? "bg-red-50" : ""}>
                    <TableCell><Badge className={`text-[10px] ${PRIORITY_COLOR[t.priority]}`}>{t.priority === "critical" ? "紧急" : t.priority === "high" ? "高" : "中"}</Badge></TableCell>
                    <TableCell><div><p className="font-medium text-sm">{t.task}</p><p className="text-[10px] text-muted-foreground">{t.id}</p></div></TableCell>
                    <TableCell className="text-sm">{t.project}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${PHASE_COLOR[t.phase] || ""}`}>{t.phase}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={t.progress} className="w-16 h-1.5" /><span className="text-xs font-medium">{t.progress}%</span></div></TableCell>
                    <TableCell className={new Date(t.dueDate) < new Date() ? "text-red-600 font-bold text-sm" : "text-sm"}>{t.dueDate}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="h-7"><ArrowRight className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{language === "zh" ? "图号" : "Drawing#"}</TableHead>
                <TableHead>{language === "zh" ? "标题" : "Title"}</TableHead>
                <TableHead>{language === "zh" ? "类型" : "Type"}</TableHead>
                <TableHead>{language === "zh" ? "设计人" : "Designer"}</TableHead>
                <TableHead>{language === "zh" ? "评审人" : "Reviewer"}</TableHead>
                <TableHead>{language === "zh" ? "提交日期" : "Submitted"}</TableHead>
                <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {PENDING_REVIEWS.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.drawing}</TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.type === "assembly" ? "装配图" : r.type === "detail" ? "详图" : "管路图"}</Badge></TableCell>
                    <TableCell>{r.designer}</TableCell>
                    <TableCell>{r.reviewer}</TableCell>
                    <TableCell className="text-sm">{r.submitted}</TableCell>
                    <TableCell><Badge className={r.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>{r.status === "pending" ? "待评审" : "已批准"}</Badge></TableCell>
                    <TableCell>{r.status === "pending" && <div className="flex gap-1"><Button size="sm" className="h-7 text-xs bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />{language === "zh" ? "批准" : "OK"}</Button><Button size="sm" variant="outline" className="h-7 text-xs"><MessageSquare className="h-3 w-3 mr-1" />{language === "zh" ? "批注" : "Comment"}</Button></div>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="eco" className="mt-4 space-y-3">
          {ECO_LIST.map(eco => (
            <Card key={eco.id} className={eco.severity === "critical" ? "border-l-4 border-l-red-500" : eco.severity === "major" ? "border-l-4 border-l-orange-500" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={eco.severity === "critical" ? "bg-red-600 text-white" : eco.severity === "major" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}>{eco.severity === "critical" ? "紧急" : eco.severity === "major" ? "重大" : "轻微"}</Badge>
                    <span className="font-mono text-sm">{eco.id}</span>
                    <span className="font-medium">{eco.title}</span>
                  </div>
                  <Badge className={eco.status === "open" ? "bg-blue-100 text-blue-700" : eco.status === "reviewing" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>{eco.status === "open" ? "待处理" : eco.status === "reviewing" ? "评审中" : "已批准"}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">{language === "zh" ? "项目:" : "Project:"}</span> {eco.project}</div>
                  <div><span className="text-muted-foreground">{language === "zh" ? "影响:" : "Impact:"}</span> {eco.impact}</div>
                  <div><span className="text-muted-foreground">{language === "zh" ? "提出人:" : "By:"}</span> {eco.requestor}</div>
                  <div><span className="text-muted-foreground">{language === "zh" ? "截止:" : "Due:"}</span> <span className={new Date(eco.dueDate) < new Date() ? "text-red-600 font-bold" : ""}>{eco.dueDate}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="freeze" className="mt-4 space-y-4">
          {DESIGN_FREEZE.map(df => {
            const done = df.items.filter(i => i.done).length;
            const pct = Math.round(done / df.items.length * 100);
            return (
              <Card key={df.gate}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> {df.gate} — {df.name}</CardTitle>
                    <Badge className={pct === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{pct}% ({done}/{df.items.length})</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{df.project}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {df.items.map(item => (
                      <div key={item.name} className={`flex items-center gap-2 p-2 rounded-md border ${item.done ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
                        {item.done ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-gray-400" />}
                        <span className={`text-sm ${item.done ? "text-green-700" : ""}`}>{item.name}</span>
                      </div>
                    ))}
                  </div>
                  <Progress value={pct} className="mt-3 h-2" />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
