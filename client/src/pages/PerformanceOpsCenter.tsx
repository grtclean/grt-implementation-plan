/**
 * 绩效运营中心 (Performance Operations Center)
 *
 * 全流程闭环：
 *  ① 目标制定 — 查看/创建年度目标协定，维度设定
 *  ② KPI分解  — KPI库管理，岗位KPI分配，从年度计划级联
 *  ③ 执行跟踪 — 月度评审录入，检查点进度
 *  ④ 人为微调 — 维度权重调整，检查点校准，调整审批
 *  ⑤ 综合评分 — 客观+主观混合计算，绩效薪资档位映射
 *  ⑥ 团队总览 — 分布统计，ABCD占比，批量计算
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Target, BarChart3, Settings, Sliders, Calculator, Users,
  ChevronRight, CheckCircle2, Clock, AlertTriangle, Star,
  Plus, Send, TrendingUp, Award, Layers, FileText,
  ThumbsUp, ThumbsDown, RefreshCw, Eye, Shield,
} from "lucide-react";

export default function PerformanceOpsCenter() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("goals");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">{isZh ? "绩效运营中心" : "Performance Ops Center"}</h1>
        <p className="text-sm text-muted-foreground">{isZh ? "目标制定 → KPI分解 → 执行跟踪 → 人为微调 → 系统化评分" : "Goals → KPIs → Track → Adjust → Score"}</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="goals" className="gap-1.5"><Target className="w-4 h-4" />{isZh ? "目标制定" : "Goals"}</TabsTrigger>
          <TabsTrigger value="kpi" className="gap-1.5"><Layers className="w-4 h-4" />{isZh ? "KPI分解" : "KPIs"}</TabsTrigger>
          <TabsTrigger value="track" className="gap-1.5"><BarChart3 className="w-4 h-4" />{isZh ? "执行跟踪" : "Track"}</TabsTrigger>
          <TabsTrigger value="adjust" className="gap-1.5"><Sliders className="w-4 h-4" />{isZh ? "人为微调" : "Adjust"}</TabsTrigger>
          <TabsTrigger value="score" className="gap-1.5"><Calculator className="w-4 h-4" />{isZh ? "综合评分" : "Score"}</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="w-4 h-4" />{isZh ? "团队总览" : "Team"}</TabsTrigger>
        </TabsList>

        <TabsContent value="goals"><GoalsTab /></TabsContent>
        <TabsContent value="kpi"><KpiTab /></TabsContent>
        <TabsContent value="track"><TrackTab /></TabsContent>
        <TabsContent value="adjust"><AdjustTab /></TabsContent>
        <TabsContent value="score"><ScoreTab /></TabsContent>
        <TabsContent value="team"><TeamTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ Tab ①: 目标制定 ═══
function GoalsTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [, navigate] = useLocation();
  const year = new Date().getFullYear();

  // 获取当前用户年度协定
  const { user } = useAuth();
  const goalQ = trpc.annualGoalIncentive.dashboard.employeeSummary.useQuery(
    { employeeId: user?.id ?? 0, year },
    { enabled: !!user?.id, retry: false },
  );
  const goal = goalQ.data as any;
  const agreement = goal?.agreement;
  const dimensions = (goal?.dimensions as any[]) || [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{year} {isZh ? "年度目标协定" : "Annual Goal Agreement"}</h3>
        <Button size="sm" variant="outline" onClick={() => navigate("/annual-goal-agreement")}>
          <FileText className="w-3.5 h-3.5 mr-1" />{isZh ? "完整协定页面" : "Full Page"}
        </Button>
      </div>

      {!agreement ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
          <CardContent className="p-6 text-center">
            <Target className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-medium">{isZh ? "尚未创建年度目标协定" : "No annual goal agreement yet"}</p>
            <Button className="mt-3" onClick={() => navigate("/annual-goal-agreement")}>
              <Plus className="w-4 h-4 mr-1" />{isZh ? "创建协定" : "Create Agreement"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={agreement.status === "active" ? "default" : "secondary"}>{agreement.status}</Badge>
                {agreement.signedAt && <span className="text-xs text-muted-foreground">{isZh ? "签署于" : "Signed"}: {new Date(agreement.signedAt).toLocaleDateString()}</span>}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-xs text-muted-foreground">{isZh ? "绩效层级" : "Levels"}</span><p className="font-mono font-bold">D→C→B→A</p></div>
                <div><span className="text-xs text-muted-foreground">{isZh ? "奖金月数" : "Bonus"}</span><p className="font-mono font-bold">0/1/2/3</p></div>
                <div><span className="text-xs text-muted-foreground">{isZh ? "职业路径" : "Career"}</span><p className="font-semibold">{agreement.careerPathAccepted ? (isZh ? "已选升级×2" : "Upgrade×2") : (isZh ? "标准" : "Standard")}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* 维度列表 */}
          <h4 className="text-sm font-semibold">{isZh ? "绩效维度" : "Performance Dimensions"} ({dimensions.length})</h4>
          <div className="space-y-2">
            {dimensions.map((d: any) => {
              const score = Number(d.currentScore || 0);
              const weight = Number(d.weight || 0);
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.dimensionName}</span>
                      <Badge variant="outline" className="text-[10px]">{weight}%</Badge>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${Math.min(score, 100)}%` }} />
                    </div>
                  </div>
                  <span className="font-mono font-bold text-lg w-12 text-right">{score}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══ Tab ②: KPI分解 ═══
function KpiTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("internal_process");
  const [newUnit, setNewUnit] = useState("count");

  const kpiQ = trpc.performanceOps.kpiLibrary.list.useQuery({}, { retry: false });
  const kpis = (kpiQ.data as any[]) || [];

  const createMut = trpc.performanceOps.kpiLibrary.create.useMutation({
    onSuccess: () => { toast({ title: isZh ? "KPI已创建" : "KPI Created" }); setNewCode(""); setNewName(""); utils.performanceOps.kpiLibrary.list.invalidate(); },
  });

  const typeLabels: Record<string, string> = {
    financial: isZh ? "财务" : "Financial",
    customer: isZh ? "客户" : "Customer",
    internal_process: isZh ? "内部流程" : "Process",
    learning_growth: isZh ? "学习成长" : "Growth",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 创建KPI */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "新增KPI指标" : "Add KPI"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-xs font-medium">{isZh ? "编码" : "Code"}</label><Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="KPI-FIN-001" /></div>
            <div><label className="text-xs font-medium">{isZh ? "名称" : "Name"}</label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={isZh ? "如: 项目毛利率" : "e.g. Gross Margin"} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">{isZh ? "类型(BSC)" : "Type"}</label>
                <select className="w-full h-9 text-sm border rounded px-2" value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{isZh ? "单位" : "Unit"}</label>
                <select className="w-full h-9 text-sm border rounded px-2" value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                  <option value="count">{isZh ? "数量" : "Count"}</option>
                  <option value="percent">%</option>
                  <option value="currency">¥</option>
                  <option value="days">{isZh ? "天" : "Days"}</option>
                </select>
              </div>
            </div>
            <Button className="w-full" onClick={() => newCode && newName && createMut.mutate({ kpiCode: newCode, kpiName: newName, kpiType: newType, unit: newUnit })} disabled={!newCode || !newName}>
              <Plus className="w-4 h-4 mr-1" />{isZh ? "添加KPI" : "Add KPI"}
            </Button>
          </CardContent>
        </Card>

        {/* KPI库列表 */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-sm font-semibold">{isZh ? "KPI指标库" : "KPI Library"} ({kpis.length})</h3>
          {kpis.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{isZh ? "暂无KPI指标" : "No KPIs"}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {kpis.map((kpi: any) => (
              <div key={kpi.id} className="p-3 rounded-lg border flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{kpi.kpi_name || kpi.kpiName}</p>
                  <div className="flex gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{kpi.kpi_code || kpi.kpiCode}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{typeLabels[kpi.kpi_type || kpi.kpiType] || "—"}</Badge>
                    <Badge variant="outline" className="text-[10px]">{kpi.unit || "—"}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ Tab ③: 执行跟踪 ═══
function TrackTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();

  const [empId, setEmpId] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");

  const reviewsQ = trpc.performanceOps.monthlyReview.listByEmployee.useQuery(
    { employeeId: Number(empId), limit: 12 },
    { enabled: !!empId && Number(empId) > 0, retry: false },
  );
  const reviews = (reviewsQ.data as any[]) || [];

  const upsertMut = trpc.performanceOps.monthlyReview.upsert.useMutation({
    onSuccess: () => { toast({ title: isZh ? "评审已保存" : "Review Saved" }); utils.performanceOps.monthlyReview.listByEmployee.invalidate(); },
  });

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 录入月度评审 */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />{isZh ? "月度绩效评审" : "Monthly Review"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">{isZh ? "员工ID" : "Employee ID"}</label><Input type="number" value={empId} onChange={(e) => setEmpId(e.target.value)} /></div>
            <div><label className="text-xs font-medium">{isZh ? "月份" : "Month"}</label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
          </div>
          <div><label className="text-xs font-medium">{isZh ? "综合评分 (0-100)" : "Score (0-100)"}</label><Input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} placeholder="85" /></div>
          <div><label className="text-xs font-medium">{isZh ? "主管评语" : "Manager Comments"}</label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} /></div>
          <Button className="w-full" onClick={() => empId && score && upsertMut.mutate({ employeeId: Number(empId), reviewMonth: month, overallScore: Number(score), managerComments: comments || undefined, status: "submitted" })} disabled={!empId || !score}>
            <Send className="w-4 h-4 mr-1" />{isZh ? "保存评审" : "Save Review"}
          </Button>
        </CardContent>
      </Card>

      {/* 历史评审 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{isZh ? "历史月度评审" : "Review History"}</h3>
        {reviews.length === 0 && empId && <p className="text-sm text-muted-foreground text-center py-8">{isZh ? "暂无评审记录" : "No reviews"}</p>}
        {reviews.map((r: any) => (
          <div key={r.id || r.review_month} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">{r.review_month || r.reviewMonth}</p>
              {(r.manager_comments || r.managerComments) && <p className="text-xs text-muted-foreground line-clamp-1">{r.manager_comments || r.managerComments}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold text-lg ${Number(r.overall_score || r.overallScore) >= 80 ? "text-green-600" : Number(r.overall_score || r.overallScore) >= 60 ? "text-blue-600" : "text-amber-600"}`}>
                {r.overall_score || r.overallScore}
              </span>
              <Badge variant="outline" className="text-[10px]">{r.status || "—"}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ Tab ④: 人为微调 ═══
function AdjustTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";
  const utils = trpc.useUtils();

  const [dimId, setDimId] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [reason, setReason] = useState("");

  const adjustWeightMut = trpc.performanceOps.adjustment.adjustDimensionWeight.useMutation({
    onSuccess: () => { toast({ title: isZh ? "权重已调整" : "Weight Adjusted" }); setDimId(""); setNewWeight(""); setReason(""); },
  });

  const [cpId, setCpId] = useState("");
  const [cpScore, setCpScore] = useState("");
  const [cpLevel, setCpLevel] = useState("B");
  const [cpComment, setCpComment] = useState("");

  const calibrateMut = trpc.performanceOps.adjustment.calibrateCheckpoint.useMutation({
    onSuccess: () => { toast({ title: isZh ? "检查点已校准" : "Checkpoint Calibrated" }); setCpId(""); setCpScore(""); },
  });

  // 待审批调整
  const pendingQ = trpc.performanceOps.adjustment.listPending.useQuery(undefined, { retry: false });
  const pending = (pendingQ.data as any[]) || [];

  const approveMut = trpc.performanceOps.adjustment.approveAdjustment.useMutation({
    onSuccess: () => { toast({ title: isZh ? "已审批" : "Approved" }); utils.performanceOps.adjustment.listPending.invalidate(); },
  });

  return (
    <div className="mt-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 维度权重微调 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sliders className="w-4 h-4" />{isZh ? "维度权重微调" : "Dimension Weight"}</CardTitle>
            <CardDescription>{isZh ? "直接调整某维度的权重占比" : "Directly adjust dimension weight"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">{isZh ? "维度ID" : "Dimension ID"}</label><Input type="number" value={dimId} onChange={(e) => setDimId(e.target.value)} /></div>
              <div><label className="text-xs font-medium">{isZh ? "新权重(%)" : "New Weight(%)"}</label><Input type="number" min="0" max="100" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} /></div>
            </div>
            <div><label className="text-xs font-medium">{isZh ? "调整原因" : "Reason"}</label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isZh ? "如: 业务重心转移" : "e.g. Business focus shift"} /></div>
            <Button className="w-full" onClick={() => dimId && newWeight && adjustWeightMut.mutate({ dimensionId: Number(dimId), newWeight: Number(newWeight), reason: reason || undefined })} disabled={!dimId || !newWeight}>
              <Sliders className="w-4 h-4 mr-1" />{isZh ? "确认调整" : "Apply"}
            </Button>
          </CardContent>
        </Card>

        {/* 检查点校准 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />{isZh ? "检查点得分校准" : "Checkpoint Calibration"}</CardTitle>
            <CardDescription>{isZh ? "手动覆盖检查点得分和绩效等级" : "Override checkpoint score & level"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">{isZh ? "检查点ID" : "Checkpoint ID"}</label><Input type="number" value={cpId} onChange={(e) => setCpId(e.target.value)} /></div>
              <div><label className="text-xs font-medium">{isZh ? "校准分数" : "Score"}</label><Input type="number" min="0" max="100" value={cpScore} onChange={(e) => setCpScore(e.target.value)} /></div>
            </div>
            <div>
              <label className="text-xs font-medium">{isZh ? "绩效等级" : "Level"}</label>
              <div className="flex gap-2 mt-1">
                {["A", "B", "C", "D"].map((l) => (
                  <Button key={l} size="sm" variant={cpLevel === l ? "default" : "outline"} onClick={() => setCpLevel(l)}>{l}</Button>
                ))}
              </div>
            </div>
            <div><label className="text-xs font-medium">{isZh ? "校准说明" : "Comment"}</label><Input value={cpComment} onChange={(e) => setCpComment(e.target.value)} /></div>
            <Button className="w-full" onClick={() => cpId && cpScore && calibrateMut.mutate({ checkpointId: Number(cpId), overallScore: Number(cpScore), performanceLevel: cpLevel, managerComments: cpComment || undefined })} disabled={!cpId || !cpScore}>
              <Shield className="w-4 h-4 mr-1" />{isZh ? "确认校准" : "Calibrate"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 待审批调整 */}
      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "待审批调整" : "Pending Adjustments"} ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{a.adjustment_type || a.adjustmentType} · {isZh ? "协定" : "Agreement"} #{a.agreement_id || a.agreementId}</p>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => approveMut.mutate({ adjustmentId: a.id, approved: true })}><ThumbsUp className="w-3.5 h-3.5 text-green-600" /></Button>
                  <Button size="sm" variant="outline" onClick={() => approveMut.mutate({ adjustmentId: a.id, approved: false })}><ThumbsDown className="w-3.5 h-3.5 text-red-600" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══ Tab ⑤: 综合评分 ═══
function ScoreTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const [empId, setEmpId] = useState("");
  const [subGrade, setSubGrade] = useState("B");
  const [objWeight, setObjWeight] = useState("50");

  const scoreQ = trpc.performanceOps.scoring.calculateComposite.useQuery(
    { employeeId: Number(empId), subjectiveGrade: subGrade, objectiveWeight: Number(objWeight) },
    { enabled: !!empId && Number(empId) > 0, retry: false },
  );
  const result = scoreQ.data;

  const tierColors: Record<string, string> = {
    "A档(优秀)": "text-green-600", "B档(良好)": "text-blue-600",
    "C档(合格)": "text-amber-600", "D档(待改进)": "text-red-600",
  };

  return (
    <div className="mt-4 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />{isZh ? "综合绩效计算器" : "Composite Score Calculator"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium">{isZh ? "员工ID" : "Employee ID"}</label><Input type="number" value={empId} onChange={(e) => setEmpId(e.target.value)} /></div>
            <div>
              <label className="text-xs font-medium">{isZh ? "主观评级" : "Subjective Grade"}</label>
              <div className="flex gap-1 mt-1">
                {["S", "A", "B", "C", "D"].map((g) => (
                  <Button key={g} size="sm" variant={subGrade === g ? "default" : "outline"} onClick={() => setSubGrade(g)} className="px-2.5">{g}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{isZh ? "客观权重%" : "Obj Weight%"}</label>
              <Input type="number" min="0" max="100" value={objWeight} onChange={(e) => setObjWeight(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-0.5">{isZh ? `主观${100 - Number(objWeight)}%` : `Subj ${100 - Number(objWeight)}%`}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">{isZh ? "综合绩效分" : "Composite Score"}</p>
              <p className={`text-5xl font-bold ${tierColors[result.performanceTier] || "text-foreground"}`}>{result.compositeScore}</p>
              <Badge className="mt-2 text-sm px-3 py-1">{result.performanceTier}</Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{isZh ? "客观分(目标完成)" : "Objective"}</p>
                <p className="text-2xl font-bold text-blue-600">{result.objectiveScore}</p>
                <p className="text-[10px] text-muted-foreground">{isZh ? `权重${result.objectiveWeight}%` : `Weight ${result.objectiveWeight}%`}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{isZh ? "主观分(管理评级)" : "Subjective"}</p>
                <p className="text-2xl font-bold text-purple-600">{result.subjectiveScore}</p>
                <p className="text-[10px] text-muted-foreground">{isZh ? `评级${result.subjectiveGrade} · 权重${100 - result.objectiveWeight}%` : `Grade ${result.subjectiveGrade} · ${100 - result.objectiveWeight}%`}</p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 text-center">
              <Award className="w-5 h-5 mx-auto text-green-600 mb-1" />
              <p className="text-sm font-semibold text-green-700">{isZh ? "年终奖金" : "Annual Bonus"}: <span className="text-lg">{result.bonusMonths}</span> {isZh ? "个月" : "months"}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══ Tab ⑥: 团队总览 ═══
function TeamTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const distQ = trpc.performanceOps.scoring.teamDistribution.useQuery({}, { retry: false });
  const dist = distQ.data as any;

  const tiers = [
    { key: "tier_a", label: "A", color: "#16a34a", bgColor: "#dcfce7" },
    { key: "tier_b", label: "B", color: "#2563eb", bgColor: "#dbeafe" },
    { key: "tier_c", label: "C", color: "#ea580c", bgColor: "#ffedd5" },
    { key: "tier_d", label: "D", color: "#dc2626", bgColor: "#fee2e2" },
  ];
  const total = Number(dist?.total || 0);

  return (
    <div className="mt-4 space-y-6">
      {/* 分布统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiers.map((t) => {
          const val = Number(dist?.[t.key] || 0);
          const pct = total > 0 ? ((val / total) * 100).toFixed(0) : "0";
          return (
            <Card key={t.key} style={{ borderColor: t.color + "40" }}>
              <CardContent className="p-4 text-center" style={{ backgroundColor: t.bgColor + "40" }}>
                <p className="text-3xl font-bold" style={{ color: t.color }}>{val}</p>
                <p className="text-xs text-muted-foreground">{t.label}{isZh ? "档" : " Tier"} ({pct}%)</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 总览 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "参评人数" : "Total"}</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "团队均分" : "Team Avg"}</p>
              <p className="text-3xl font-bold text-blue-600">{dist?.overall_avg ? Number(dist.overall_avg).toFixed(1) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "优秀率" : "A Rate"}</p>
              <p className="text-3xl font-bold text-green-600">{total > 0 ? ((Number(dist?.tier_a || 0) / total) * 100).toFixed(0) : "—"}%</p>
            </div>
          </div>

          {/* 分布条 */}
          {total > 0 && (
            <div className="mt-6 h-8 rounded-full overflow-hidden flex">
              {tiers.map((t) => {
                const val = Number(dist?.[t.key] || 0);
                const pct = (val / total) * 100;
                if (pct <= 0) return null;
                return (
                  <div key={t.key} className="h-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${pct}%`, backgroundColor: t.color }}>
                    {pct >= 10 ? `${t.label} ${pct.toFixed(0)}%` : t.label}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

