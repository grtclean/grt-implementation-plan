import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Loader2, BarChart3, Sparkles, ClipboardCheck,
  ArrowRight, TrendingUp, Target, Bug, Plus,
} from "lucide-react";

// ============================================================
// Types & Mock Data
// ============================================================

interface RootCause { category: string; cause: string; probability: number; }
interface InspectionItem { id: string; name: string; method: string; frequency: string; standard: string; stage: string; }
interface QualityMetric { label: string; value: number; target: number; unit: string; trend: "up" | "down" | "stable"; }
interface CAPAItem { id: string; type: "CA" | "PA"; title: string; status: "open" | "in_progress" | "closed"; priority: string; assignee: string; dueDate: string; }

const MOCK_CAUSES: RootCause[] = [
  { category: "人员", cause: "操作员未按SOP设定清洗参数", probability: 35 },
  { category: "机器", cause: "超声波换能器功率衰减", probability: 25 },
  { category: "材料", cause: "清洗液浓度偏低（低于3%）", probability: 20 },
  { category: "方法", cause: "清洗时间不足（<5分钟）", probability: 10 },
  { category: "环境", cause: "环境温度过低影响清洗效果", probability: 5 },
  { category: "测量", cause: "检测设备校准偏差", probability: 5 },
];

const MOCK_INSPECTION: InspectionItem[] = [
  { id: "i1", name: "清洁度重量法检测", method: "称重法", frequency: "每批次", standard: "残留<2mg", stage: "M8" },
  { id: "i2", name: "颗粒度检测", method: "颗粒计数", frequency: "每批次", standard: "≤500um颗粒<100个", stage: "M8" },
  { id: "i3", name: "表面荧光检测", method: "UV荧光", frequency: "抽检10%", standard: "无荧光残留", stage: "M8" },
  { id: "i4", name: "尺寸精度复检", method: "三坐标", frequency: "首件+抽检", standard: "公差IT7级", stage: "M7" },
  { id: "i5", name: "干燥完整性验证", method: "目测+仪器", frequency: "每件", standard: "无水渍残留", stage: "M7" },
  { id: "i6", name: "设备运行参数记录", method: "PLC数据", frequency: "连续", standard: "参数在控", stage: "M7" },
  { id: "i7", name: "FAT性能测试", method: "综合测试", frequency: "全检", standard: "按合同指标", stage: "M8" },
  { id: "i8", name: "SAT现场验证", method: "实际工况", frequency: "全检", standard: "客户标准", stage: "M11" },
];

const MOCK_METRICS: QualityMetric[] = [
  { label: "一次合格率", value: 96.5, target: 98, unit: "%", trend: "up" },
  { label: "客户投诉率", value: 0.8, target: 1.0, unit: "%", trend: "down" },
  { label: "FAT通过率", value: 94.2, target: 95, unit: "%", trend: "stable" },
  { label: "返工率", value: 3.2, target: 2.0, unit: "%", trend: "down" },
  { label: "交付准时率", value: 91.8, target: 95, unit: "%", trend: "up" },
  { label: "CAPA闭环率", value: 87.5, target: 90, unit: "%", trend: "up" },
];

const MOCK_CAPA: CAPAItem[] = [
  { id: "CA-001", type: "CA", title: "USC-3000清洗不均匀问题纠正", status: "in_progress", priority: "高", assignee: "张工", dueDate: "2026-02-20" },
  { id: "CA-002", type: "CA", title: "喷嘴堵塞导致清洁度不达标", status: "open", priority: "高", assignee: "王工", dueDate: "2026-02-15" },
  { id: "PA-001", type: "PA", title: "引入清洗液在线浓度监测系统", status: "in_progress", priority: "中", assignee: "陈工", dueDate: "2026-03-01" },
  { id: "CA-003", type: "CA", title: "FAT测试急停功能延迟", status: "closed", priority: "高", assignee: "李工", dueDate: "2026-01-30" },
  { id: "PA-002", type: "PA", title: "建立供应商来料检验强化流程", status: "open", priority: "中", assignee: "赵工", dueDate: "2026-03-15" },
  { id: "PA-003", type: "PA", title: "工人操作认证体系升级", status: "in_progress", priority: "低", assignee: "周工", dueDate: "2026-04-01" },
];

const capaStatusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "待处理", color: "bg-red-500/20 text-red-400" },
  in_progress: { label: "进行中", color: "bg-blue-500/20 text-blue-400" },
  closed: { label: "已关闭", color: "bg-green-500/20 text-green-400" },
};

// ============================================================
// Component
// ============================================================

export default function AIQualityAssistant() {
  const [defectDesc, setDefectDesc] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedStage, setSelectedStage] = useState("all");

  const handleAnalyze = () => {
    if (!defectDesc.trim()) return;
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setShowAnalysis(true); }, 2000);
  };

  const filteredInspection = selectedStage === "all" ? MOCK_INSPECTION : MOCK_INSPECTION.filter(i => i.stage === selectedStage);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            AI质量助手
          </h1>
          <p className="text-muted-foreground mt-1">缺陷根因分析、检测计划生成与CAPA追踪管理</p>
        </div>

        <Tabs defaultValue="defect" className="space-y-4">
          <TabsList>
            <TabsTrigger value="defect"><Bug className="w-4 h-4 mr-1" />缺陷分析</TabsTrigger>
            <TabsTrigger value="inspection"><ClipboardCheck className="w-4 h-4 mr-1" />检测计划</TabsTrigger>
            <TabsTrigger value="metrics"><BarChart3 className="w-4 h-4 mr-1" />质量报告</TabsTrigger>
            <TabsTrigger value="capa"><Target className="w-4 h-4 mr-1" />CAPA追踪</TabsTrigger>
          </TabsList>

          {/* Defect Analysis */}
          <TabsContent value="defect" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">缺陷描述输入</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="描述缺陷现象，例如：USC-3000清洗后工件表面仍有油污残留，清洁度检测超标..." value={defectDesc} onChange={e => setDefectDesc(e.target.value)} rows={3} />
                <Button onClick={handleAnalyze} disabled={analyzing || !defectDesc.trim()}>
                  {analyzing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />分析中...</> : <><Sparkles className="w-4 h-4 mr-1" />根因分析</>}
                </Button>
              </CardContent>
            </Card>

            {showAnalysis && (
              <Card className="border-primary">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />鱼骨图分析结果</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">AI基于历史数据和专家知识库分析的可能根因（按概率排序）：</p>
                  <div className="space-y-2">
                    {MOCK_CAUSES.map(c => (
                      <div key={c.cause} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Badge variant="outline" className="min-w-[60px] justify-center">{c.category}</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.cause}</p>
                          <Progress value={c.probability} className="h-1.5 mt-1" />
                        </div>
                        <span className="text-sm font-bold text-primary">{c.probability}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3">
                    <p className="font-medium text-sm mb-1">建议措施:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>立即检查操作员是否遵循SOP-CL-001设定参数</li>
                      <li>安排换能器功率测试，确认输出功率在额定范围内</li>
                      <li>取样检测清洗液浓度，补充至标准范围</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inspection Plan */}
          <TabsContent value="inspection" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="选择阶段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部阶段</SelectItem>
                  <SelectItem value="M7">M7 装配调试</SelectItem>
                  <SelectItem value="M8">M8 FAT验收</SelectItem>
                  <SelectItem value="M11">M11 SAT验收</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm"><Sparkles className="w-4 h-4 mr-1" />AI生成检测计划</Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b">
                      <th className="text-left py-2 px-3">检测项目</th><th className="text-left py-2 px-3">方法</th><th className="text-left py-2 px-3">频次</th><th className="text-left py-2 px-3">标准</th><th className="text-left py-2 px-3">阶段</th>
                    </tr></thead>
                    <tbody>{filteredInspection.map(item => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{item.name}</td>
                        <td className="py-2 px-3">{item.method}</td>
                        <td className="py-2 px-3">{item.frequency}</td>
                        <td className="py-2 px-3">{item.standard}</td>
                        <td className="py-2 px-3"><Badge variant="outline">{item.stage}</Badge></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Metrics */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_METRICS.map(m => {
                const isGood = m.label.includes("投诉") || m.label.includes("返工") ? m.value <= m.target : m.value >= m.target;
                return (
                  <Card key={m.label}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{m.label}</span>
                        <TrendingUp className={`w-4 h-4 ${m.trend === "up" ? "text-green-500" : m.trend === "down" ? "text-red-500 rotate-180" : "text-yellow-500"}`} />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${isGood ? "text-green-500" : "text-red-500"}`}>{m.value}</span>
                        <span className="text-sm text-muted-foreground">{m.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={(m.value / m.target) * 100} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">目标: {m.target}{m.unit}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* CAPA Tracking */}
          <TabsContent value="capa" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-red-400">待处理: {MOCK_CAPA.filter(c => c.status === "open").length}</Badge>
                <Badge variant="outline" className="text-blue-400">进行中: {MOCK_CAPA.filter(c => c.status === "in_progress").length}</Badge>
                <Badge variant="outline" className="text-green-400">已关闭: {MOCK_CAPA.filter(c => c.status === "closed").length}</Badge>
              </div>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />新建CAPA</Button>
            </div>
            <div className="space-y-3">
              {MOCK_CAPA.map(item => {
                const statusCfg = capaStatusConfig[item.status];
                return (
                  <Card key={item.id} className={item.status === "open" ? "border-red-500/30" : ""}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono">{item.id}</Badge>
                            <Badge className={item.type === "CA" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}>{item.type === "CA" ? "纠正措施" : "预防措施"}</Badge>
                            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                            <Badge variant="outline">{item.priority}</Badge>
                          </div>
                          <p className="font-medium text-sm mt-1">{item.title}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                            <span>负责人: {item.assignee}</span>
                            <span>截止: {item.dueDate}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost"><ArrowRight className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

