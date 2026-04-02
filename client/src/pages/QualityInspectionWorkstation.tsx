/**
 * 质量工程师工作台 — M6 生产质检阶段
 * 金晓锋(质量主管): 来料检验 · 过程巡检 · 首件确认 · 终检 · 8D/CAPA
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
  ShieldCheck, ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Eye,
  Clock, Search, FileText, BarChart3, Microscope, Target, ArrowRight,
  ThumbsUp, ThumbsDown, Camera
} from "lucide-react";

const IQC_QUEUE = [
  { id: "IQC-026-045", material: "深沟球轴承6205", supplier: "NSK轴承中国", po: "PO-2025-00012", qty: 100, sampleSize: 8, method: "AQL 1.0", items: ["外径", "内径", "游隙", "旋转噪音", "外观"], status: "pending" },
  { id: "IQC-026-044", material: "45#钢棒Φ25", supplier: "上海宝钢特钢", po: "PO-2025-00001", qty: 200, sampleSize: 5, method: "全检尺寸", items: ["直径公差", "长度", "表面粗糙度", "硬度", "材质证明"], status: "inspecting" },
  { id: "IQC-026-043", material: "接触器CJX2-32", supplier: "施耐德电气", po: "PO-2025-00023", qty: 20, sampleSize: 3, method: "功能检验", items: ["动作电压", "绝缘电阻", "触点接触", "外观"], status: "completed", result: "PASS" },
];

const PROCESS_INSPECTIONS = [
  { id: "PI-026-012", project: "博世华域-GRT-S3 #1", process: "T3-焊接", station: "焊接工位A", worker: "操作工张三", checkpoints: 6, passed: 5, failed: 1, issue: "焊缝气孔(局部)", status: "issue_found" },
  { id: "PI-026-011", project: "博世华域-GRT-S3 #2", process: "T5-装配", station: "装配工位B", worker: "操作工李四", checkpoints: 8, passed: 8, failed: 0, issue: "", status: "passed" },
  { id: "PI-026-010", project: "博世华域-GRT-S3 #3", process: "T2-机加工", station: "CNC-03", worker: "操作工王五", checkpoints: 5, passed: 5, failed: 0, issue: "", status: "passed" },
];

const FIRST_ARTICLE = [
  { id: "FAI-026-008", project: "博世华域-GRT-S3", part: "清洗篮框架", drawing: "GRT-S3-DET-015", dims: 12, measured: 12, inSpec: 11, outSpec: 1, status: "conditional", note: "挂钩孔位偏移0.3mm(公差±0.5)" },
  { id: "FAI-026-007", project: "舍弗勒-齿轮轴整线", part: "主轴箱体", drawing: "SCH-MSB-001", dims: 25, measured: 25, inSpec: 25, outSpec: 0, status: "approved", note: "" },
];

const FINAL_INSPECTION = [
  { id: "FI-026-003", project: "博世华域-GRT-S3 #1", product: "GRT-S3超声波清洗机", categories: [
    { name: "机械精度", items: 8, pass: 7, fail: 1 },
    { name: "电气安全", items: 6, pass: 6, fail: 0 },
    { name: "功能测试", items: 10, pass: 9, fail: 1 },
    { name: "清洁度", items: 4, pass: 4, fail: 0 },
    { name: "外观包装", items: 5, pass: 5, fail: 0 },
  ], overallPass: 31, overallFail: 2, result: "CONDITIONAL", date: "2026-03-29" },
];

const QC_STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  inspecting: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  passed: "bg-green-100 text-green-700",
  issue_found: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  conditional: "bg-yellow-100 text-yellow-700",
  PASS: "bg-green-100 text-green-700",
  CONDITIONAL: "bg-yellow-100 text-yellow-700",
  FAIL: "bg-red-100 text-red-700",
};

export default function QualityInspectionWorkstation() {
  const { language } = useLanguage();
  const [tab, setTab] = useState("iqc");

  const pendingIqc = IQC_QUEUE.filter(q => q.status !== "completed").length;
  const issuesFound = PROCESS_INSPECTIONS.filter(p => p.status === "issue_found").length;
  const fpy = Math.round(PROCESS_INSPECTIONS.reduce((s, p) => s + p.passed, 0) / PROCESS_INSPECTIONS.reduce((s, p) => s + p.checkpoints, 0) * 100);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-green-600" />{language === "zh" ? "质量工程师工作台" : "Quality Engineer Workstation"}</h1>
          <p className="text-muted-foreground mt-1">{language === "zh" ? "M6阶段 · IQC来料→过程巡检→首件→终检→8D/CAPA" : "M6 · IQC→In-Process→FAI→Final→8D"}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "IQC待检", value: pendingIqc, icon: ClipboardCheck, color: "text-orange-600 border-l-orange-500" },
          { label: "过程异常", value: issuesFound, icon: AlertTriangle, color: issuesFound > 0 ? "text-red-600 border-l-red-500" : "text-green-600 border-l-green-500" },
          { label: "FPY直通率", value: `${fpy}%`, icon: Target, color: "text-blue-600 border-l-blue-500" },
          { label: "IQC合格率", value: "96%", icon: CheckCircle, color: "text-green-600 border-l-green-500" },
          { label: "开放8D", value: 1, icon: FileText, color: "text-purple-600 border-l-purple-500" },
          { label: "本月检验", value: 45, icon: Microscope, color: "text-sky-600 border-l-sky-500" },
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
          <TabsTrigger value="iqc"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "IQC来料" : "IQC"} {pendingIqc > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{pendingIqc}</Badge>}</TabsTrigger>
          <TabsTrigger value="process"><Microscope className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "过程巡检" : "In-Process"}</TabsTrigger>
          <TabsTrigger value="fai"><Eye className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "首件确认" : "FAI"}</TabsTrigger>
          <TabsTrigger value="final"><ShieldCheck className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "终检" : "Final"}</TabsTrigger>
        </TabsList>

        {/* IQC */}
        <TabsContent value="iqc" className="mt-4 space-y-3">
          {IQC_QUEUE.map(iqc => (
            <Card key={iqc.id} className={iqc.status === "inspecting" ? "border-purple-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{iqc.id}</span>
                    <span className="font-medium">{iqc.material}</span>
                    <Badge variant="outline" className="text-[10px]">{iqc.supplier}</Badge>
                  </div>
                  <Badge className={QC_STATUS_COLOR[iqc.result || iqc.status]}>{iqc.status === "pending" ? "待检" : iqc.status === "inspecting" ? "检验中" : iqc.result || "完成"}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                  <div><span className="text-muted-foreground">PO:</span> {iqc.po}</div>
                  <div><span className="text-muted-foreground">{language === "zh" ? "送检:" : "Qty:"}</span> {iqc.qty}</div>
                  <div><span className="text-muted-foreground">{language === "zh" ? "抽样:" : "Sample:"}</span> {iqc.sampleSize}</div>
                  <div><span className="text-muted-foreground">{language === "zh" ? "方法:" : "Method:"}</span> {iqc.method}</div>
                </div>
                {iqc.status !== "completed" && (
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {iqc.items.map(item => <Badge key={item} variant="outline" className="text-[10px]">{item}</Badge>)}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs bg-green-600"><ThumbsUp className="h-3 w-3 mr-1" />{language === "zh" ? "合格" : "Pass"}</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs"><ThumbsDown className="h-3 w-3 mr-1" />{language === "zh" ? "不合格" : "Fail"}</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"><Camera className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Process Inspection */}
        <TabsContent value="process" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{language === "zh" ? "巡检单" : "ID"}</TableHead>
                <TableHead>{language === "zh" ? "项目" : "Project"}</TableHead>
                <TableHead>{language === "zh" ? "工序" : "Process"}</TableHead>
                <TableHead>{language === "zh" ? "工位" : "Station"}</TableHead>
                <TableHead>{language === "zh" ? "检查项" : "Checks"}</TableHead>
                <TableHead>{language === "zh" ? "结果" : "Result"}</TableHead>
                <TableHead>{language === "zh" ? "异常" : "Issue"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {PROCESS_INSPECTIONS.map(pi => (
                  <TableRow key={pi.id} className={pi.status === "issue_found" ? "bg-red-50" : ""}>
                    <TableCell className="font-mono text-sm">{pi.id}</TableCell>
                    <TableCell className="text-sm">{pi.project}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{pi.process}</Badge></TableCell>
                    <TableCell className="text-sm">{pi.station}</TableCell>
                    <TableCell><span className="text-green-600">{pi.passed}</span>/<span className={pi.failed > 0 ? "text-red-600 font-bold" : ""}>{pi.checkpoints}</span></TableCell>
                    <TableCell><Badge className={QC_STATUS_COLOR[pi.status]}>{pi.status === "passed" ? "通过" : "发现异常"}</Badge></TableCell>
                    <TableCell className="text-sm text-red-600 max-w-[200px] truncate">{pi.issue || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* First Article Inspection */}
        <TabsContent value="fai" className="mt-4 space-y-3">
          {FIRST_ARTICLE.map(fai => (
            <Card key={fai.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{fai.id} — {fai.part}</CardTitle>
                  <Badge className={QC_STATUS_COLOR[fai.status]}>{fai.status === "approved" ? "已批准" : "有条件接收"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{fai.project} · {language === "zh" ? "图号:" : "Dwg:"} {fai.drawing}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div><p className="text-2xl font-bold">{fai.dims}</p><p className="text-xs text-muted-foreground">{language === "zh" ? "总尺寸" : "Total Dims"}</p></div>
                  <div><p className="text-2xl font-bold text-green-600">{fai.inSpec}</p><p className="text-xs text-muted-foreground">{language === "zh" ? "合格" : "In Spec"}</p></div>
                  <div><p className={`text-2xl font-bold ${fai.outSpec > 0 ? "text-red-600" : "text-green-600"}`}>{fai.outSpec}</p><p className="text-xs text-muted-foreground">{language === "zh" ? "超差" : "Out Spec"}</p></div>
                  <div><p className="text-2xl font-bold">{Math.round(fai.inSpec / fai.dims * 100)}%</p><p className="text-xs text-muted-foreground">{language === "zh" ? "合格率" : "Pass Rate"}</p></div>
                </div>
                {fai.note && <p className="mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">{fai.note}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Final Inspection */}
        <TabsContent value="final" className="mt-4 space-y-4">
          {FINAL_INSPECTION.map(fi => (
            <Card key={fi.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{fi.id} — {fi.product}</CardTitle>
                  <Badge className={`text-sm ${QC_STATUS_COLOR[fi.result]}`}>{fi.result}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{fi.project} · {fi.date}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {fi.categories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium">{cat.name}</span>
                    <Progress value={cat.pass / cat.items * 100} className={`flex-1 h-3 ${cat.fail > 0 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
                    <span className="text-sm w-16 text-right"><span className="text-green-600">{cat.pass}</span>/<span className={cat.fail > 0 ? "text-red-600" : ""}>{cat.items}</span></span>
                    {cat.fail > 0 ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">{language === "zh" ? `总计: ${fi.overallPass}通过 / ${fi.overallFail}不通过` : `Total: ${fi.overallPass} pass / ${fi.overallFail} fail`}</span>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600">{language === "zh" ? "放行出厂" : "Release"}</Button>
                    <Button size="sm" variant="outline">{language === "zh" ? "开8D报告" : "Open 8D"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
