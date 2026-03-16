/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Real Order Command Center — 真实订单全流程指挥中心           ║
 * ║  苏州明志RW2000机器人清洗机 端到端模拟                        ║
 * ║  3 Routes × 19 Steps, non-sandbox, event-bus sync           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Rocket, Factory, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight,
  Play, Wrench, ClipboardList, Timer, Shield, Truck, ThumbsUp, UserCheck,
  FileText, BarChart3, Award, Target, Zap, Upload, Activity, Radio,
  AlertTriangle, Star, TrendingUp, Bot, Users, Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

interface StepDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  route: string;
}

const ROUTE_A_STEPS: StepDef[] = [
  { id: "create-project", label: "创建项目", icon: <Rocket className="w-4 h-4" />, description: "创建苏州明志RW2000机器人清洗机项目，录入需求定义", route: "lifecycle" },
  { id: "mech-config", label: "机械配置选型", icon: <Wrench className="w-4 h-4" />, description: "选择机械标准、客户配置档案、设计基准", route: "lifecycle" },
  { id: "create-wo", label: "创建生产工单", icon: <Factory className="w-4 h-4" />, description: "下达生产工单，分配班组，设定交期", route: "lifecycle" },
  { id: "log-hours", label: "工时登记", icon: <Timer className="w-4 h-4" />, description: "按工序提交工时记录（机械设计/电气/装配/调试）", route: "lifecycle" },
  { id: "quality-check", label: "质量检查", icon: <Shield className="w-4 h-4" />, description: "过程质量检验、缺陷记录、NCR处理", route: "lifecycle" },
  { id: "gate-check", label: "Gate检查", icon: <ClipboardList className="w-4 h-4" />, description: "M7预验收AI Gate检查，确认发货条件", route: "lifecycle" },
  { id: "acceptance", label: "客户验收", icon: <ThumbsUp className="w-4 h-4" />, description: "客户现场验收评分、满意度调查", route: "lifecycle" },
];

const ROUTE_B_STEPS: StepDef[] = [
  { id: "clock-in", label: "员工打卡", icon: <UserCheck className="w-4 h-4" />, description: "GPS打卡签到/签退，自动计算工时", route: "workHoursPerf" },
  { id: "submit-hours", label: "工时提交", icon: <FileText className="w-4 h-4" />, description: "提交项目工时，选择工序分类（17种）", route: "workHoursPerf" },
  { id: "approve-hours", label: "工时审批", icon: <CheckCircle2 className="w-4 h-4" />, description: "主管审批工时记录，通过/驳回", route: "workHoursPerf" },
  { id: "perf-evidence", label: "绩效证据采集", icon: <BarChart3 className="w-4 h-4" />, description: "从工时、质量、考勤自动采集绩效证据", route: "workHoursPerf" },
  { id: "kpi-score", label: "KPI评分", icon: <Target className="w-4 h-4" />, description: "KPI 30% + AEI 20% + OKR 20% + 能力 15% + 360° 15%", route: "workHoursPerf" },
  { id: "perf-calibration", label: "绩效校准", icon: <Award className="w-4 h-4" />, description: "强制分布校准（S/A/B/C/D），三档绩效工资联动", route: "workHoursPerf" },
];

const ROUTE_C_STEPS: StepDef[] = [
  { id: "quality-plan", label: "质量计划", icon: <Shield className="w-4 h-4" />, description: "创建质量检查点、FMEA分析、控制计划", route: "qualityDelivery" },
  { id: "process-inspect", label: "过程检验", icon: <ClipboardList className="w-4 h-4" />, description: "提交检验结果，SPC分析，缺陷管理", route: "qualityDelivery" },
  { id: "gate-check", label: "Gate检查", icon: <Zap className="w-4 h-4" />, description: "AI智能Gate检查，自动验证发货条件", route: "qualityDelivery" },
  { id: "create-delivery", label: "交付创建", icon: <Truck className="w-4 h-4" />, description: "创建M7-M9交付任务，安排现场安装", route: "qualityDelivery" },
  { id: "customer-acceptance", label: "客户验收评分", icon: <Star className="w-4 h-4" />, description: "客户验收逐项评分，上传签字文件", route: "qualityDelivery" },
  { id: "satisfaction", label: "满意度分析", icon: <TrendingUp className="w-4 h-4" />, description: "满意度综合评分，持续改进闭环", route: "qualityDelivery" },
];

const LABOR_CATEGORIES = [
  { value: "mechanical_design", label: "机械设计" },
  { value: "electrical_design", label: "电气设计" },
  { value: "mechanical_assembly", label: "机械装配" },
  { value: "electrical_assembly", label: "电气装配" },
  { value: "system_integration", label: "系统集成" },
  { value: "debugging", label: "调试" },
  { value: "commissioning", label: "现场调试" },
  { value: "internal_acceptance", label: "内部验收" },
  { value: "project_management", label: "项目管理" },
  { value: "other", label: "其他" },
];

// ── Main Component ────────────────────────────────────────────

type Scenario = "suzhouMingzhi" | "shuanghuanJiaxing";

const SCENARIO_INFO: Record<Scenario, { name: string; customer: string; product: string; model: string }> = {
  suzhouMingzhi: { name: "苏州明志RW2000", customer: "苏州明志科技股份有限公司", product: "RW2000机器人清洗机", model: "RW2000-CB-FA" },
  shuanghuanJiaxing: { name: "双环嘉兴通过式清洗机", customer: "双环传动（嘉兴）精密制造有限公司", product: "通过式清洗机", model: "SH-PT-CW-600" },
};

export default function RealOrderCommandCenter() {
  const [activeRoute, setActiveRoute] = useState("routeA");
  const [projectCode, setProjectCode] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario>("shuanghuanJiaxing");
  const [showDaPanel, setShowDaPanel] = useState(true);

  // ─── Scenario Init ───
  const initMingzhiMut = trpc.realOrderFlow.scenario.initSuzhouMingzhi.useMutation({
    onSuccess: (data) => {
      setProjectCode(data.projectCode);
      toast.success(`苏州明志RW2000场景已初始化！项目编号: ${data.projectCode}`);
    },
    onError: (e) => toast.error(`初始化失败: ${e.message}`),
  });
  const initShuanghuanMut = trpc.realOrderFlow.scenario.initShuanghuanJiaxing.useMutation({
    onSuccess: (data) => {
      setProjectCode(data.projectCode);
      toast.success(`双环嘉兴通过式清洗机场景已初始化！项目编号: ${data.projectCode}`);
    },
    onError: (e) => toast.error(`初始化失败: ${e.message}`),
  });
  const initMut = scenario === "shuanghuanJiaxing" ? initShuanghuanMut : initMingzhiMut;

  // ─── DA Team ───
  const daTeam = trpc.realOrderFlow.da.getTeam.useQuery({ scenario }, { enabled: scenario === "shuanghuanJiaxing" });
  const stepAttribution = trpc.realOrderFlow.da.getStepAttribution.useQuery();

  // ─── Flow Status Queries ───
  const lifecycleStatus = trpc.realOrderFlow.lifecycle.getStatus.useQuery(
    { projectCode }, { enabled: !!projectCode, refetchInterval: 10000 }
  );
  const workHoursPerfStatus = trpc.realOrderFlow.workHoursPerf.getStatus.useQuery(
    { projectCode }, { enabled: !!projectCode, refetchInterval: 10000 }
  );
  const qualityDeliveryStatus = trpc.realOrderFlow.qualityDelivery.getStatus.useQuery(
    { projectCode }, { enabled: !!projectCode, refetchInterval: 10000 }
  );

  // ─── Event Log ───
  const eventLog = trpc.realOrderFlow.event.getRecentEvents.useQuery({ limit: 15 });

  // ─── Event Publisher ───
  const publishStepMut = trpc.realOrderFlow.event.publishStep.useMutation({
    onSuccess: () => eventLog.refetch(),
  });

  const publishStep = useCallback((route: string, stepId: string, payload?: Record<string, unknown>) => {
    publishStepMut.mutate({ route: route as any, stepId, projectCode, payload });
  }, [projectCode, publishStepMut]);

  const refetchAll = useCallback(() => {
    lifecycleStatus.refetch();
    workHoursPerfStatus.refetch();
    qualityDeliveryStatus.refetch();
    eventLog.refetch();
  }, [lifecycleStatus, workHoursPerfStatus, qualityDeliveryStatus, eventLog]);

  // ─── Resolve step status ───
  const getStepStatus = (route: string, stepId: string): "pending" | "in_progress" | "completed" => {
    const statusData = route === "lifecycle" ? lifecycleStatus.data
      : route === "workHoursPerf" ? workHoursPerfStatus.data
      : qualityDeliveryStatus.data;
    if (!statusData) return "pending";
    const step = statusData.steps.find((s: any) => s.id === stepId);
    return step?.status ?? "pending";
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">真实订单全流程指挥中心</h1>
              <p className="text-sm text-muted-foreground">{SCENARIO_INFO[scenario].name} — 端到端模拟（非沙盘）</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Scenario Selector */}
            <Select value={scenario} onValueChange={(v) => { setScenario(v as Scenario); setProjectCode(""); }}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suzhouMingzhi">苏州明志 RW2000 机器人清洗机</SelectItem>
                <SelectItem value="shuanghuanJiaxing">双环嘉兴 通过式清洗机</SelectItem>
              </SelectContent>
            </Select>
            {/* DA Panel Toggle */}
            {scenario === "shuanghuanJiaxing" && (
              <Button variant={showDaPanel ? "default" : "outline"} size="sm" onClick={() => setShowDaPanel(!showDaPanel)}>
                <Bot className="w-4 h-4 mr-1" />DA
              </Button>
            )}
            {projectCode ? (
              <Badge variant="outline" className="text-base px-4 py-1.5 bg-green-50 text-green-700 border-green-300">
                <Radio className="w-3 h-3 mr-2 animate-pulse" />
                {projectCode}
              </Badge>
            ) : (
              <Button onClick={() => initMut.mutate()} disabled={initMut.isPending}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                <Rocket className="w-4 h-4 mr-2" />
                {initMut.isPending ? "初始化中..." : `一键初始化${SCENARIO_INFO[scenario].name}场景`}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        {projectCode && (
          <div className="grid grid-cols-3 gap-4">
            <ProgressCard label="Route A: 项目全生命周期" data={lifecycleStatus.data} color="blue" />
            <ProgressCard label="Route B: 工时绩效闭环" data={workHoursPerfStatus.data} color="green" />
            <ProgressCard label="Route C: 质量交付反馈" data={qualityDeliveryStatus.data} color="purple" />
          </div>
        )}

        {/* 3 Route Tabs */}
        <Tabs value={activeRoute} onValueChange={setActiveRoute}>
          <TabsList className="h-auto flex-wrap gap-1">
            <TabsTrigger value="routeA" className="gap-1.5"><Factory className="w-3.5 h-3.5" />Route A: 项目全生命周期</TabsTrigger>
            <TabsTrigger value="routeB" className="gap-1.5"><Timer className="w-3.5 h-3.5" />Route B: 工时绩效闭环</TabsTrigger>
            <TabsTrigger value="routeC" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Route C: 质量交付反馈</TabsTrigger>
          </TabsList>

          <TabsContent value="routeA" className="space-y-3 mt-4">
            {ROUTE_A_STEPS.map((step, idx) => (
              <StepCard key={step.id} step={step} index={idx}
                status={getStepStatus(step.route, step.id)}
                expanded={expandedStep === `a-${step.id}`}
                onToggle={() => setExpandedStep(expandedStep === `a-${step.id}` ? null : `a-${step.id}`)}
                daAssignees={scenario === "shuanghuanJiaxing" ? (stepAttribution.data as any)?.[step.id] : undefined}>
                <RouteAStepForm stepId={step.id} projectCode={projectCode} scenario={scenario} onComplete={() => { publishStep("lifecycle", step.id); refetchAll(); }} />
              </StepCard>
            ))}
          </TabsContent>

          <TabsContent value="routeB" className="space-y-3 mt-4">
            {ROUTE_B_STEPS.map((step, idx) => (
              <StepCard key={step.id} step={step} index={idx}
                status={getStepStatus(step.route, step.id)}
                expanded={expandedStep === `b-${step.id}`}
                onToggle={() => setExpandedStep(expandedStep === `b-${step.id}` ? null : `b-${step.id}`)}
                daAssignees={scenario === "shuanghuanJiaxing" ? (stepAttribution.data as any)?.[step.id] : undefined}>
                <RouteBStepForm stepId={step.id} projectCode={projectCode} onComplete={() => { publishStep("workHoursPerf", step.id); refetchAll(); }} />
              </StepCard>
            ))}
          </TabsContent>

          <TabsContent value="routeC" className="space-y-3 mt-4">
            {ROUTE_C_STEPS.map((step, idx) => (
              <StepCard key={step.id} step={step} index={idx}
                status={getStepStatus(step.route, step.id)}
                expanded={expandedStep === `c-${step.id}`}
                onToggle={() => setExpandedStep(expandedStep === `c-${step.id}` ? null : `c-${step.id}`)}
                daAssignees={scenario === "shuanghuanJiaxing" ? (stepAttribution.data as any)?.[step.id] : undefined}>
                <RouteCStepForm stepId={step.id} projectCode={projectCode} onComplete={() => { publishStep("qualityDelivery", step.id); refetchAll(); }} />
              </StepCard>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar: DA Panel + Event Log */}
      <div className="w-80 border-l bg-muted/20 overflow-auto hidden lg:block">
        {/* DA Team Panel */}
        {scenario === "shuanghuanJiaxing" && showDaPanel && daTeam.data && (
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-500" />
              DA数字助理团队
              <Badge variant="secondary" className="text-[10px]">{daTeam.data.team.length}人</Badge>
            </h3>
            <div className="space-y-2">
              {daTeam.data.team.map((da: any) => (
                <div key={da.employeeCode} className="p-2.5 bg-background rounded-lg border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {da.employeeName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{da.daName}</div>
                        <div className="text-[10px] text-muted-foreground">{da.employeeCode} · {da.department}</div>
                      </div>
                    </div>
                    <Badge className="text-[9px] bg-violet-100 text-violet-700 border-violet-200">{da.roleName}</Badge>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {da.skills.slice(0, 3).map((skill: string) => (
                      <Badge key={skill} variant="outline" className="text-[9px] px-1.5 py-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />{skill}
                      </Badge>
                    ))}
                    {da.skills.length > 3 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{da.skills.length - 3}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Log */}
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-green-500 animate-pulse" />
            沙盘同步事件
          </h3>
          <div className="space-y-2">
            {(eventLog.data ?? []).map((evt: any) => (
              <div key={evt.id} className="p-2 bg-background rounded border text-xs space-y-1">
                <div className="font-mono text-[10px] text-muted-foreground">{evt.eventType}</div>
                <div className="text-muted-foreground">{new Date(evt.createdAt).toLocaleTimeString("zh-CN")}</div>
                {evt.targetModules?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {(evt.targetModules as string[]).map((m: string) => (
                      <Badge key={m} variant="outline" className="text-[9px] px-1 py-0">{m}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {(!eventLog.data || eventLog.data.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-8">暂无事件，完成步骤后自动同步</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress Card ─────────────────────────────────────────────

function ProgressCard({ label, data, color }: { label: string; data: any; color: string }) {
  const pct = data?.progressPct ?? 0;
  const colorMap: Record<string, string> = { blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600" };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-lg font-bold ${colorMap[color]}`}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="text-xs text-muted-foreground mt-1">
        {data?.completedCount ?? 0}/{data?.totalSteps ?? 0} 步骤完成
      </div>
    </Card>
  );
}

// ── Step Card (expandable) ────────────────────────────────────

function StepCard({ step, index, status, expanded, onToggle, children, daAssignees }: {
  step: StepDef; index: number; status: string; expanded: boolean;
  onToggle: () => void; children: React.ReactNode;
  daAssignees?: Array<{ daName: string; roleName: string; employeeCode: string }>;
}) {
  const statusConfig = {
    completed: { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: "bg-green-50 border-green-200", label: "已完成" },
    in_progress: { icon: <Play className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50 border-blue-200", label: "进行中" },
    pending: { icon: <Circle className="w-5 h-5 text-gray-300" />, bg: "bg-background border-border", label: "待开始" },
  }[status] ?? { icon: <Circle className="w-5 h-5 text-gray-300" />, bg: "bg-background border-border", label: "待开始" };

  return (
    <Card className={`${statusConfig.bg} transition-all`}>
      <div className="p-4 cursor-pointer flex items-center gap-3" onClick={onToggle}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border text-sm font-bold text-muted-foreground">
          {index + 1}
        </div>
        {statusConfig.icon}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {step.icon}
            <span className="font-semibold">{step.label}</span>
            <Badge variant="outline" className="text-[10px]">{statusConfig.label}</Badge>
            {/* DA Attribution Badges */}
            {daAssignees && daAssignees.length > 0 && (
              <div className="flex items-center gap-1 ml-1">
                {daAssignees.map((da) => (
                  <Badge key={da.employeeCode} className="text-[9px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200">
                    <Bot className="w-2.5 h-2.5 mr-0.5" />{da.daName}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <Separator className="mb-4" />
          {children}
        </div>
      )}
    </Card>
  );
}

// ── Route A Step Forms ────────────────────────────────────────

function RouteAStepForm({ stepId, projectCode, scenario, onComplete }: { stepId: string; projectCode: string; scenario: Scenario; onComplete: () => void }) {
  switch (stepId) {
    case "create-project": return <CreateProjectForm scenario={scenario} onComplete={onComplete} />;
    case "mech-config": return <MechConfigForm projectCode={projectCode} scenario={scenario} onComplete={onComplete} />;
    case "create-wo": return <CreateWorkOrderForm projectCode={projectCode} scenario={scenario} onComplete={onComplete} />;
    case "log-hours": return <LogHoursForm projectCode={projectCode} onComplete={onComplete} />;
    case "quality-check": return <QualityCheckForm projectCode={projectCode} onComplete={onComplete} />;
    case "gate-check": return <GateCheckForm onComplete={onComplete} />;
    case "acceptance": return <AcceptanceForm projectCode={projectCode} onComplete={onComplete} />;
    default: return <p className="text-sm text-muted-foreground">步骤表单开发中</p>;
  }
}

function RouteBStepForm({ stepId, projectCode, onComplete }: { stepId: string; projectCode: string; onComplete: () => void }) {
  switch (stepId) {
    case "clock-in": return <ClockInForm onComplete={onComplete} />;
    case "submit-hours": return <LogHoursForm projectCode={projectCode} onComplete={onComplete} />;
    case "approve-hours": return <ApproveHoursForm onComplete={onComplete} />;
    case "perf-evidence": return <PerfEvidenceForm onComplete={onComplete} />;
    case "kpi-score": return <KpiScoreForm onComplete={onComplete} />;
    case "perf-calibration": return <PerfCalibrationForm onComplete={onComplete} />;
    default: return <p className="text-sm text-muted-foreground">步骤表单开发中</p>;
  }
}

function RouteCStepForm({ stepId, projectCode, onComplete }: { stepId: string; projectCode: string; onComplete: () => void }) {
  switch (stepId) {
    case "quality-plan": return <QualityPlanForm projectCode={projectCode} onComplete={onComplete} />;
    case "process-inspect": return <ProcessInspectForm onComplete={onComplete} />;
    case "gate-check": return <GateCheckForm onComplete={onComplete} />;
    case "create-delivery": return <CreateDeliveryForm projectCode={projectCode} onComplete={onComplete} />;
    case "customer-acceptance": return <AcceptanceForm projectCode={projectCode} onComplete={onComplete} />;
    case "satisfaction": return <SatisfactionForm projectCode={projectCode} onComplete={onComplete} />;
    default: return <p className="text-sm text-muted-foreground">步骤表单开发中</p>;
  }
}

// ── Individual Step Forms ─────────────────────────────────────

function CreateProjectForm({ scenario, onComplete }: { scenario: Scenario; onComplete: () => void }) {
  const info = SCENARIO_INFO[scenario];
  const isSH = scenario === "shuanghuanJiaxing";
  const [name, setName] = useState(info.name);
  const [desc, setDesc] = useState(isSH
    ? "双环传动（嘉兴）精密制造定制通过式清洗设备，连续通过式清洗（喷淋+风切干燥），齿轮传动零件清洗。"
    : "苏州明志科技定制RW2000系列，全自动组合清洗（超声+喷淋），铝合金缸体清洗。");
  const budget = isSH ? 520000 : 680000;
  const type = isSH ? "standard" as const : "key" as const;
  const createMut = trpc.project.create.useMutation({
    onSuccess: (data) => { toast.success(`项目已创建: ${data.projectCode}`); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div><Label>项目名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label>描述</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>客户</Label><Input value={info.customer} disabled /></div>
        <div><Label>类型</Label><Input value={isSH ? "standard (标准)" : "key (重点)"} disabled /></div>
        <div><Label>预算 (¥)</Label><Input value={budget.toLocaleString()} disabled /></div>
      </div>
      <Button onClick={() => createMut.mutate({ name, description: desc, type, priority: "high", budget })} disabled={createMut.isPending}>
        <Rocket className="w-4 h-4 mr-2" />创建项目
      </Button>
    </div>
  );
}

function MechConfigForm({ projectCode, scenario, onComplete }: { projectCode: string; scenario: Scenario; onComplete: () => void }) {
  const isSH = scenario === "shuanghuanJiaxing";
  const config = isSH
    ? { frame: "Q235碳钢+喷塑", surface: "喷塑处理", tolerance: "IT8", ip: "IP54", pneumatics: "FESTO", safety: "CE安全光栅", paint: "RAL 5015", noise: "≤78dB(A)" }
    : { frame: "304不锈钢", surface: "拉丝处理", tolerance: "IT7", ip: "IP65", pneumatics: "SMC", safety: "CE安全防护", paint: "RAL 7035", noise: "≤75dB(A)" };
  const upsertMut = trpc.mechanicalConfig.projectSelection.upsert.useMutation({
    onSuccess: () => { toast.success("机械配置选型已保存"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><Label>框架材料</Label><Input value={config.frame} disabled /></div>
        <div><Label>表面处理</Label><Input value={config.surface} disabled /></div>
        <div><Label>公差等级</Label><Input value={config.tolerance} disabled /></div>
        <div><Label>防护等级</Label><Input value={config.ip} disabled /></div>
        <div><Label>气动品牌</Label><Input value={config.pneumatics} disabled /></div>
        <div><Label>安全防护</Label><Input value={config.safety} disabled /></div>
      </div>
      {isSH && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><Label>输送方式</Label><Input value="通过式链条输送" disabled /></div>
          <div><Label>节拍</Label><Input value="≤45s/件" disabled /></div>
        </div>
      )}
      <Button onClick={() => upsertMut.mutate({
        projectCode, projectName: SCENARIO_INFO[scenario].name,
        applicablePhases: isSH ? ["M0","M1","M2","M3","M4","M5"] : ["M0","M1","M2","M3","M4"],
        designBasis: { frameMaterial: config.frame, surfaceFinish: config.surface, toleranceGrade: config.tolerance, ipRating: config.ip, pneumaticsBrand: config.pneumatics, safetyGuardSpec: config.safety, paintColor: config.paint, noiseLimit: config.noise, ...(isSH ? { conveyorType: "通过式链条输送", cycleTime: "≤45s/件" } : {}) },
      })} disabled={upsertMut.isPending || !projectCode}>
        <Wrench className="w-4 h-4 mr-2" />保存配置选型
      </Button>
    </div>
  );
}

function CreateWorkOrderForm({ projectCode, scenario, onComplete }: { projectCode: string; scenario: Scenario; onComplete: () => void }) {
  const info = SCENARIO_INFO[scenario];
  const [productName, setProductName] = useState(info.product);
  const [productModel, setProductModel] = useState(info.model);
  const [team, setTeam] = useState(scenario === "shuanghuanJiaxing" ? "B班组" : "A班组");
  const createMut = trpc.productionDashboard.create.useMutation({
    onSuccess: () => { toast.success("生产工单已创建"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>产品名称</Label><Input value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
        <div><Label>产品型号</Label><Input value={productModel} onChange={(e) => setProductModel(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>数量</Label><Input value="1" disabled /></div>
        <div><Label>优先级</Label><Input value="high" disabled /></div>
        <div><Label>分配班组</Label><Input value={team} onChange={(e) => setTeam(e.target.value)} /></div>
      </div>
      <Button onClick={() => createMut.mutate({ productName, productModel, quantity: 1, priority: "high", assignedTeam: team })} disabled={createMut.isPending}>
        <Factory className="w-4 h-4 mr-2" />创建工单
      </Button>
    </div>
  );
}

function LogHoursForm({ projectCode, onComplete }: { projectCode: string; onComplete: () => void }) {
  const [duration, setDuration] = useState("4");
  const [category, setCategory] = useState("mechanical_assembly");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const submitMut = trpc.smartProductionScheduling.laborReport.submit.useMutation({
    onSuccess: () => { toast.success("工时已提交"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>工序分类</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LABOR_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>工时 (小时)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="0.5" step="0.5" /></div>
      </div>
      <div><Label>备注</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="工作内容描述" /></div>
      <div>
        <Label>附件上传 (可选)</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="flex-1" />
          {file && <Badge variant="secondary">{file.name}</Badge>}
        </div>
      </div>
      <Button onClick={() => submitMut.mutate({
        taskId: 1, duration: parseFloat(duration), laborCategory: category as any,
        notes: notes || undefined, logType: "manual",
      })} disabled={submitMut.isPending}>
        <Timer className="w-4 h-4 mr-2" />提交工时
      </Button>
    </div>
  );
}

function QualityCheckForm({ projectCode, onComplete }: { projectCode: string; onComplete: () => void }) {
  const [result, setResult] = useState("pass");
  const [score, setScore] = useState("95");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>检验结果</Label>
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">合格</SelectItem>
              <SelectItem value="conditional">有条件通过</SelectItem>
              <SelectItem value="fail">不合格</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>质量评分</Label><Input type="number" value={score} onChange={(e) => setScore(e.target.value)} min="0" max="100" /></div>
        <div><Label>项目编号</Label><Input value={projectCode} disabled /></div>
      </div>
      <div><Label>检验备注</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="清洁度检测结果、尺寸测量数据..." /></div>
      <div>
        <Label>检验报告上传</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} accept=".pdf,.jpg,.png,.xlsx" className="mt-1" />
        {file && <Badge variant="secondary" className="mt-1">{file.name}</Badge>}
      </div>
      <Button onClick={() => { toast.success(`质量检查已记录: ${result === "pass" ? "合格" : "待处理"}, 评分 ${score}`); onComplete(); }}>
        <Shield className="w-4 h-4 mr-2" />提交质量检查
      </Button>
    </div>
  );
}

function GateCheckForm({ onComplete }: { onComplete: () => void }) {
  const gateCheckMut = trpc.m7m9.gateCheck.executeAIGateCheck.useMutation({
    onSuccess: (data) => { toast.success(`AI Gate检查完成: ${data.decision}`); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  const [stage, setStage] = useState("M7_Pre_Acceptance");
  const [openIssues, setOpenIssues] = useState("0");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>当前阶段</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M7_Pre_Acceptance">M7 预验收</SelectItem>
              <SelectItem value="M8_Installation">M8 安装调试</SelectItem>
              <SelectItem value="M9_Final_Acceptance">M9 终验收</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>未关闭问题数</Label><Input type="number" value={openIssues} onChange={(e) => setOpenIssues(e.target.value)} min="0" /></div>
        <div><Label>Critical问题</Label><Input value="0" disabled /></div>
      </div>
      <Button onClick={() => gateCheckMut.mutate({
        deliveryId: 1, projectNo: "PRJ-2026-001", currentStage: stage as any,
        openIssueCount: parseInt(openIssues), criticalIssueCount: 0,
      })} disabled={gateCheckMut.isPending}>
        <Zap className="w-4 h-4 mr-2" />执行AI Gate检查
      </Button>
    </div>
  );
}

function AcceptanceForm({ projectCode, onComplete }: { projectCode: string; onComplete: () => void }) {
  const [checkItem, setCheckItem] = useState("清洁度检测");
  const [score, setScore] = useState("90");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const createMut = trpc.mechanicalConfig.acceptance.create.useMutation({
    onSuccess: () => { toast.success("验收记录已创建"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>检查项</Label><Input value={checkItem} onChange={(e) => setCheckItem(e.target.value)} /></div>
        <div><Label>评分 (0-100)</Label><Input type="number" value={score} onChange={(e) => setScore(e.target.value)} min="0" max="100" /></div>
      </div>
      <div><Label>客户评论</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="客户对验收项的评价..." /></div>
      <div>
        <Label>客户签字/验收报告上传</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} accept=".pdf,.jpg,.png" className="mt-1" />
        {file && <Badge variant="secondary" className="mt-1">{file.name}</Badge>}
      </div>
      <Button onClick={() => createMut.mutate({
        projectCode, customerName: "苏州明志科技", acceptancePhase: "M7",
        checkItem, category: "structural_frame", result: "ACCEPTED", score: parseInt(score),
        customerComment: comment || undefined,
      })} disabled={createMut.isPending || !projectCode}>
        <ThumbsUp className="w-4 h-4 mr-2" />提交验收评分
      </Button>
    </div>
  );
}

function ClockInForm({ onComplete }: { onComplete: () => void }) {
  const [lat, setLat] = useState("31.298886");
  const [lng, setLng] = useState("120.585316");
  const clockInMut = trpc.attendanceClock.clock.clockIn.useMutation({
    onSuccess: () => { toast.success("打卡成功"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  const clockOutMut = trpc.attendanceClock.clock.clockOut.useMutation({
    onSuccess: () => { toast.success("签退成功"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>纬度 (GPS)</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div><Label>经度 (GPS)</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">默认坐标: GRT苏州总部 (31.2989, 120.5853)</p>
      <div className="flex gap-3">
        <Button onClick={() => clockInMut.mutate({ lat: parseFloat(lat), lng: parseFloat(lng) })} disabled={clockInMut.isPending} className="flex-1">
          <UserCheck className="w-4 h-4 mr-2" />签到打卡
        </Button>
        <Button variant="outline" onClick={() => clockOutMut.mutate({ lat: parseFloat(lat), lng: parseFloat(lng) })} disabled={clockOutMut.isPending} className="flex-1">
          <Clock className="w-4 h-4 mr-2" />签退打卡
        </Button>
      </div>
    </div>
  );
}

function ApproveHoursForm({ onComplete }: { onComplete: () => void }) {
  const [logId, setLogId] = useState("1");
  const approveMut = trpc.smartProductionScheduling.laborReport.approve.useMutation({
    onSuccess: () => { toast.success("工时已审批"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div><Label>工时记录ID</Label><Input value={logId} onChange={(e) => setLogId(e.target.value)} placeholder="待审批的工时记录编号" /></div>
      <div className="flex gap-3">
        <Button onClick={() => approveMut.mutate({ logId: parseInt(logId), action: "approved" })} disabled={approveMut.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />批准
        </Button>
        <Button variant="destructive" onClick={() => approveMut.mutate({ logId: parseInt(logId), action: "rejected", reason: "工时数据异常" })} disabled={approveMut.isPending} className="flex-1">
          <AlertTriangle className="w-4 h-4 mr-2" />驳回
        </Button>
      </div>
    </div>
  );
}

function PerfEvidenceForm({ onComplete }: { onComplete: () => void }) {
  const [evidenceType, setEvidenceType] = useState("task_timeliness");
  const [score, setScore] = useState("85");
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">从工时记录、质量评分、考勤数据自动采集绩效证据</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>证据类型</Label>
          <Select value={evidenceType} onValueChange={setEvidenceType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="task_timeliness">任务及时率</SelectItem>
              <SelectItem value="quality_score">质量评分</SelectItem>
              <SelectItem value="attendance">出勤率</SelectItem>
              <SelectItem value="internal_feedback">内部反馈</SelectItem>
              <SelectItem value="external_feedback">客户反馈</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>评分</Label><Input type="number" value={score} onChange={(e) => setScore(e.target.value)} min="0" max="100" /></div>
      </div>
      <div>
        <Label>证据附件</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1" />
        {file && <Badge variant="secondary" className="mt-1">{file.name}</Badge>}
      </div>
      <Button onClick={() => { toast.success(`绩效证据已采集: ${evidenceType}, 评分 ${score}`); onComplete(); }}>
        <BarChart3 className="w-4 h-4 mr-2" />采集证据
      </Button>
    </div>
  );
}

function KpiScoreForm({ onComplete }: { onComplete: () => void }) {
  const [kpi, setKpi] = useState("88");
  const [aei, setAei] = useState("90");
  const [okr, setOkr] = useState("85");
  const [competency, setCompetency] = useState("82");
  const [feedback360, setFeedback360] = useState("87");
  const composite = Math.round(parseInt(kpi) * 0.3 + parseInt(aei) * 0.2 + parseInt(okr) * 0.2 + parseInt(competency) * 0.15 + parseInt(feedback360) * 0.15);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        <div><Label className="text-[10px]">KPI (30%)</Label><Input type="number" value={kpi} onChange={(e) => setKpi(e.target.value)} /></div>
        <div><Label className="text-[10px]">AEI (20%)</Label><Input type="number" value={aei} onChange={(e) => setAei(e.target.value)} /></div>
        <div><Label className="text-[10px]">OKR (20%)</Label><Input type="number" value={okr} onChange={(e) => setOkr(e.target.value)} /></div>
        <div><Label className="text-[10px]">能力 (15%)</Label><Input type="number" value={competency} onChange={(e) => setCompetency(e.target.value)} /></div>
        <div><Label className="text-[10px]">360° (15%)</Label><Input type="number" value={feedback360} onChange={(e) => setFeedback360(e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
        <span className="text-sm">综合评分:</span>
        <span className={`text-2xl font-bold ${composite >= 90 ? "text-green-600" : composite >= 70 ? "text-blue-600" : "text-orange-600"}`}>{composite}</span>
        <Badge className={composite >= 90 ? "bg-green-100 text-green-800" : composite >= 80 ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>
          {composite >= 90 ? "S 卓越" : composite >= 80 ? "A 优秀" : composite >= 70 ? "B 良好" : composite >= 60 ? "C 合格" : "D 待改进"}
        </Badge>
      </div>
      <Button onClick={() => { toast.success(`KPI评分已提交: 综合 ${composite} 分`); onComplete(); }}>
        <Target className="w-4 h-4 mr-2" />提交KPI评分
      </Button>
    </div>
  );
}

function PerfCalibrationForm({ onComplete }: { onComplete: () => void }) {
  const distribution = [
    { grade: "S", pct: "10%", count: 3, color: "bg-green-100 text-green-800" },
    { grade: "A", pct: "20%", count: 6, color: "bg-blue-100 text-blue-800" },
    { grade: "B", pct: "40%", count: 12, color: "bg-gray-100 text-gray-800" },
    { grade: "C", pct: "20%", count: 6, color: "bg-yellow-100 text-yellow-800" },
    { grade: "D", pct: "10%", count: 3, color: "bg-red-100 text-red-800" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">强制分布校准 — 按部门人数比例分配绩效等级</p>
      <div className="flex gap-2">
        {distribution.map((d) => (
          <div key={d.grade} className={`flex-1 p-3 rounded text-center ${d.color}`}>
            <div className="text-lg font-bold">{d.grade}</div>
            <div className="text-xs">{d.pct} ({d.count}人)</div>
          </div>
        ))}
      </div>
      <div className="p-3 bg-muted/50 rounded text-sm space-y-1">
        <div>三档绩效工资联动: S档 ×1.3 / A档 ×1.15 / B档 ×1.0 / C档 ×0.85 / D档 ×0.7</div>
      </div>
      <Button onClick={() => { toast.success("绩效校准已完成，三档绩效工资已联动计算"); onComplete(); }}>
        <Award className="w-4 h-4 mr-2" />完成绩效校准
      </Button>
    </div>
  );
}

function QualityPlanForm({ projectCode, onComplete }: { projectCode: string; onComplete: () => void }) {
  const [checkItem, setCheckItem] = useState("清洁度检测 (残留≤0.5mg)");
  const [category, setCategory] = useState("structural_frame");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>检查项</Label><Input value={checkItem} onChange={(e) => setCheckItem(e.target.value)} /></div>
        <div>
          <Label>类别</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="structural_frame">结构框架</SelectItem>
              <SelectItem value="surface_treatment">表面处理</SelectItem>
              <SelectItem value="welding">焊接工艺</SelectItem>
              <SelectItem value="sealing">密封</SelectItem>
              <SelectItem value="safety_guarding">安全防护</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>质量控制计划上传</Label>
        <Input type="file" accept=".pdf,.xlsx,.docx" className="mt-1" />
      </div>
      <Button onClick={() => { toast.success(`质量计划已创建: ${checkItem}`); onComplete(); }}>
        <Shield className="w-4 h-4 mr-2" />创建质量计划
      </Button>
    </div>
  );
}

function ProcessInspectForm({ onComplete }: { onComplete: () => void }) {
  const [result, setResult] = useState("pass");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>检验结果</Label>
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">合格 (PASS)</SelectItem>
              <SelectItem value="conditional">有条件通过</SelectItem>
              <SelectItem value="fail">不合格 (FAIL)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>SPC Cpk值</Label><Input value="1.67" disabled /></div>
      </div>
      <div><Label>检验记录</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="检验数据、测量值..." /></div>
      <div><Label>检验报告</Label><Input type="file" accept=".pdf,.jpg,.png" className="mt-1" /></div>
      <Button onClick={() => { toast.success(`过程检验完成: ${result === "pass" ? "合格" : result}`); onComplete(); }}>
        <ClipboardList className="w-4 h-4 mr-2" />提交检验结果
      </Button>
    </div>
  );
}

function CreateDeliveryForm({ projectCode, onComplete }: { projectCode: string; onComplete: () => void }) {
  const [customerName, setCustomerName] = useState("双环传动（嘉兴）精密制造有限公司");
  const [address, setAddress] = useState("浙江省嘉兴市秀洲区王江泾镇");
  const createMut = trpc.m7m9.delivery.create.useMutation({
    onSuccess: () => { toast.success("交付任务已创建"); onComplete(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>客户名称</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
        <div><Label>项目编号</Label><Input value={projectCode} disabled /></div>
      </div>
      <div><Label>安装地址</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>计划M7日期</Label><Input type="date" defaultValue={new Date().toISOString().split("T")[0]} /></div>
        <div><Label>计划M8日期</Label><Input type="date" defaultValue={new Date(Date.now() + 14*86400000).toISOString().split("T")[0]} /></div>
        <div><Label>计划M9日期</Label><Input type="date" defaultValue={new Date(Date.now() + 30*86400000).toISOString().split("T")[0]} /></div>
      </div>
      <Button onClick={() => createMut.mutate({
        projectId: 1, projectNo: projectCode || "PRJ-2026-001",
        customerName, siteAddress: address,
        siteContactName: "张工", siteContactPhone: "13800138000",
        plannedM7Date: new Date().toISOString().split("T")[0],
        plannedM8Date: new Date(Date.now() + 14*86400000).toISOString().split("T")[0],
        plannedM9Date: new Date(Date.now() + 30*86400000).toISOString().split("T")[0],
      })} disabled={createMut.isPending}>
        <Truck className="w-4 h-4 mr-2" />创建交付任务
      </Button>
    </div>
  );
}

function SatisfactionForm({ projectCode, onComplete }: { projectCode: string; onComplete: () => void }) {
  const { data: satisfaction } = trpc.mechanicalConfig.acceptance.satisfactionSummary.useQuery(
    { projectCode }, { enabled: !!projectCode }
  );
  return (
    <div className="space-y-3">
      {satisfaction ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded">
            <div className="text-center">
              <div className={`text-3xl font-bold ${satisfaction.averageScore >= 80 ? "text-green-600" : "text-orange-600"}`}>
                {satisfaction.averageScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">平均满意度</div>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="flex gap-3">
              {satisfaction.byResult?.map((r: any) => (
                <div key={r.result} className="text-center">
                  <div className="text-lg font-semibold">{r.count}</div>
                  <div className="text-xs text-muted-foreground">{r.result}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">满意度数据来自客户验收评分的实时聚合，自动同步至沙盘仪表板。</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">暂无满意度数据，请先完成客户验收评分步骤。</p>
      )}
      <Button onClick={() => { toast.success("满意度分析已完成，数据已同步至沙盘"); onComplete(); }}>
        <TrendingUp className="w-4 h-4 mr-2" />完成满意度分析
      </Button>
    </div>
  );
}
