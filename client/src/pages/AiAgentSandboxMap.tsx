/**
 * AI Agent Sandbox Map — 数字助理沙盘
 * Interactive topology of 6 digital agent personas with I/O flow editing,
 * M0-M12 lifecycle simulation, and KPI dashboard.
 *
 * Tabs: 沙盘总览 | 数据流图 | 逻辑配置 | 模拟运行 | KPI仪表板
 */
import { useState, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Map,
  Network,
  Settings2,
  Play,
  BarChart3,
  Users,
  Briefcase,
  Cog,
  Factory,
  Headphones,
  FolderKanban,
  TrendingUp,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  ChevronRight,
  Edit3,
  Save,
  RotateCcw,
  CircleDot,
  Activity,
  Target,
} from "lucide-react";

// ── Agent Persona Definitions ──

interface AgentPersona {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  level: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  borderColor: string;
  workbench: string;
  workbenchPath: string;
  routerCount: number;
  inputs: AgentIO[];
  outputs: AgentIO[];
  kpis: AgentKPI[];
}

interface AgentIO {
  id: string;
  label: string;
  type: "data" | "signal" | "approval" | "feedback";
  source?: string; // agent id
  target?: string; // agent id
  dataType: string;
  description: string;
}

interface AgentKPI {
  name: string;
  formula: string;
  unit: string;
  green: string;
  red: string;
  currentValue?: number;
}

interface SimStep {
  id: number;
  stage: string;
  agent: string;
  action: string;
  router: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  detail?: string;
}

const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: "sales",
    name: "销售数字助理",
    nameEn: "Sales DA",
    role: "bu_sales (L2)",
    level: "L2",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    workbench: "SalesCRMWorkbench",
    workbenchPath: "/sales-crm",
    routerCount: 10,
    inputs: [
      { id: "s-in-1", label: "客户询盘", type: "data", dataType: "Lead", description: "来自网站/展会/电话的客户询盘", source: "external" },
      { id: "s-in-2", label: "市场信号", type: "signal", dataType: "MarketSignal", description: "行业趋势、竞品情报", source: "external" },
      { id: "s-in-3", label: "交付反馈", type: "feedback", dataType: "DeliveryFeedback", description: "来自服务DA的客户满意度反馈", source: "service" },
    ],
    outputs: [
      { id: "s-out-1", label: "报价单", type: "data", dataType: "Quotation", description: "技术方案 + 商务报价", target: "project" },
      { id: "s-out-2", label: "合同/订单", type: "data", dataType: "Contract", description: "签约合同转项目立项", target: "project" },
      { id: "s-out-3", label: "客户需求", type: "data", dataType: "Requirements", description: "技术需求规格书传递给设计DA", target: "design" },
    ],
    kpis: [
      { name: "线索转化率", formula: "won / total * 100", unit: "%", green: ">15%", red: "<8%" },
      { name: "管道速度", formula: "avg(won_date - created)", unit: "天", green: "<30", red: ">60" },
      { name: "报价赢率", formula: "won_quotes / total", unit: "%", green: ">25%", red: "<10%" },
      { name: "响应时间", formula: "avg(first_response)", unit: "小时", green: "<4", red: ">24" },
      { name: "拜访完成率", formula: "done / planned", unit: "%", green: ">80%", red: "<60%" },
    ],
  },
  {
    id: "design",
    name: "设计数字助理",
    nameEn: "Design DA",
    role: "bu_mech/bu_elec (L2)",
    level: "L2",
    icon: Cog,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    workbench: "PdmWorkbench + DrawingLibrary",
    workbenchPath: "/pdm",
    routerCount: 14,
    inputs: [
      { id: "d-in-1", label: "需求规格", type: "data", dataType: "Requirements", description: "来自PM的项目需求定义", source: "project" },
      { id: "d-in-2", label: "ECR请求", type: "feedback", dataType: "ECR", description: "来自服务DA的现场工程变更请求", source: "service" },
      { id: "d-in-3", label: "标准约束", type: "signal", dataType: "Standards", description: "ISO/IATF/CE标准要求", source: "external" },
    ],
    outputs: [
      { id: "d-out-1", label: "冻结图纸", type: "data", dataType: "FrozenDrawings", description: "设计冻结审批通过的BDO图纸集", target: "production" },
      { id: "d-out-2", label: "BOM基线", type: "data", dataType: "BOMBaseline", description: "审批通过的物料清单基线", target: "production" },
      { id: "d-out-3", label: "设计评审", type: "approval", dataType: "DesignReview", description: "设计评审结果 → 门控判定", target: "project" },
      { id: "d-out-4", label: "PLC程序", type: "data", dataType: "PLCProgram", description: "PLC/HMI程序发布给生产", target: "production" },
    ],
    kpis: [
      { name: "图纸发布率", formula: "released / total", unit: "%", green: ">70%", red: "<40%" },
      { name: "设计冻结率", formula: "frozen / total", unit: "%", green: "100% at M5", red: "<100%" },
      { name: "评审周转", formula: "avg(reviewed - requested)", unit: "小时", green: "<48", red: ">96" },
      { name: "ECO周期", formula: "avg(close - submit)", unit: "天", green: "<14", red: ">30" },
      { name: "返工次数", formula: "avg(totalVersions)", unit: "次", green: "<3", red: ">5" },
      { name: "就绪分数", formula: "passed / 7 * 100", unit: "%", green: "100%", red: "<100%" },
      { name: "BOM准确率", formula: "1 - deviations / items", unit: "%", green: ">98%", red: "<95%" },
    ],
  },
  {
    id: "production",
    name: "生产数字助理",
    nameEn: "Production DA",
    role: "team_lead (L2)",
    level: "L2",
    icon: Factory,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    workbench: "ShopfloorMasterBoard",
    workbenchPath: "/shopfloor-master-board",
    routerCount: 12,
    inputs: [
      { id: "p-in-1", label: "BOM+图纸", type: "data", dataType: "ReleasedBOM", description: "来自设计DA的发布BOM和冻结图纸", source: "design" },
      { id: "p-in-2", label: "PLC程序", type: "data", dataType: "PLCProgram", description: "来自设计DA的PLC/HMI发布版本", source: "design" },
      { id: "p-in-3", label: "工单指令", type: "signal", dataType: "WorkOrder", description: "来自项目DA的生产工单和排程", source: "project" },
    ],
    outputs: [
      { id: "p-out-1", label: "实际偏差", type: "data", dataType: "AsBuiltDeviation", description: "实际装配 vs 设计基线偏差记录", target: "design" },
      { id: "p-out-2", label: "质量数据", type: "data", dataType: "QualityData", description: "FAT测试结果、OEE、首检报告", target: "service" },
      { id: "p-out-3", label: "完工报告", type: "signal", dataType: "CompletionReport", description: "工单完成通知 → 交付调度", target: "service" },
    ],
    kpis: [
      { name: "OEE", formula: "A * P * Q", unit: "%", green: ">85%", red: "<65%" },
      { name: "首检合格率", formula: "good / total", unit: "%", green: ">95%", red: "<90%" },
      { name: "节拍偏差", formula: "|actual-std|/std", unit: "%", green: "<10%", red: ">25%" },
      { name: "偏差数(Critical)", formula: "critical_count", unit: "个", green: "0", red: ">0" },
      { name: "工单完成率", formula: "completed / planned", unit: "%", green: ">90%", red: "<80%" },
    ],
  },
  {
    id: "service",
    name: "服务数字助理",
    nameEn: "Service DA",
    role: "cs_engineer (L2)",
    level: "L2",
    icon: Headphones,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    workbench: "AfterSalesWorkbench",
    workbenchPath: "/after-sales-workbench",
    routerCount: 8,
    inputs: [
      { id: "sv-in-1", label: "设备序列号", type: "data", dataType: "EquipmentSerial", description: "来自生产DA的设备出厂信息", source: "production" },
      { id: "sv-in-2", label: "质量报告", type: "data", dataType: "QualityReport", description: "来自生产DA的FAT/SAT测试报告", source: "production" },
      { id: "sv-in-3", label: "客户反馈", type: "feedback", dataType: "CustomerFeedback", description: "客户现场使用反馈和投诉", source: "external" },
    ],
    outputs: [
      { id: "sv-out-1", label: "ECR请求", type: "feedback", dataType: "ECR", description: "现场问题 → 工程变更请求 → 设计DA", target: "design" },
      { id: "sv-out-2", label: "现场洞察", type: "data", dataType: "FieldInsight", description: "反复出现的故障模式分析", target: "design" },
      { id: "sv-out-3", label: "满意度", type: "feedback", dataType: "CSAT", description: "客户满意度评分反馈给销售DA", target: "sales" },
    ],
    kpis: [
      { name: "工单解决时间", formula: "avg(resolved - created)", unit: "小时", green: "<48", red: ">120" },
      { name: "客户满意度", formula: "avg(csat)", unit: "分", green: ">4.0", red: "<3.0" },
      { name: "重复问题率", formula: "repeat / total", unit: "%", green: "<5%", red: ">15%" },
      { name: "备件满足率", formula: "in_stock / requested", unit: "%", green: ">90%", red: "<70%" },
      { name: "质保成本比", formula: "warranty / revenue", unit: "%", green: "<3%", red: ">5%" },
    ],
  },
  {
    id: "project",
    name: "项目数字助理",
    nameEn: "Project DA",
    role: "bu_pm (L3)",
    level: "L3",
    icon: FolderKanban,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
    workbench: "Project360Cockpit",
    workbenchPath: "/project-360",
    routerCount: 10,
    inputs: [
      { id: "pj-in-1", label: "销售订单", type: "data", dataType: "SalesOrder", description: "来自销售DA的签约合同/订单", source: "sales" },
      { id: "pj-in-2", label: "设计评审", type: "approval", dataType: "GateReview", description: "来自设计DA的门控评审结果", source: "design" },
      { id: "pj-in-3", label: "生产进度", type: "signal", dataType: "ProductionProgress", description: "来自生产DA的工单完成进度", source: "production" },
    ],
    outputs: [
      { id: "pj-out-1", label: "里程碑计划", type: "data", dataType: "MilestonePlan", description: "M0-M12阶段计划分发给所有DA", target: "all" },
      { id: "pj-out-2", label: "资源请求", type: "signal", dataType: "ResourceRequest", description: "人力/设备/预算请求 → 管理DA", target: "management" },
      { id: "pj-out-3", label: "风险预警", type: "signal", dataType: "RiskAlert", description: "项目风险升级通知 → 管理DA", target: "management" },
    ],
    kpis: [
      { name: "里程碑准时率", formula: "on_time / total", unit: "%", green: ">85%", red: "<70%" },
      { name: "门控通过率", formula: "passed / attempted", unit: "%", green: ">80%", red: "<60%" },
      { name: "资源利用率", formula: "allocated / available", unit: "%", green: "70-90%", red: ">100%" },
      { name: "预算偏差", formula: "(actual-planned)/planned", unit: "%", green: "<5%", red: ">15%" },
      { name: "风险缓解率", formula: "mitigated / total", unit: "%", green: ">80%", red: "<60%" },
    ],
  },
  {
    id: "management",
    name: "管理数字助理",
    nameEn: "Management DA",
    role: "bu_gm/director (L4)",
    level: "L4",
    icon: Briefcase,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    workbench: "CeoExecutiveCockpit",
    workbenchPath: "/ceo-cockpit",
    routerCount: 8,
    inputs: [
      { id: "m-in-1", label: "全局KPI", type: "data", dataType: "KPIDashboard", description: "来自所有DA的汇总KPI指标", source: "all" },
      { id: "m-in-2", label: "资源请求", type: "signal", dataType: "ResourceRequest", description: "来自项目DA的资源/预算请求", source: "project" },
      { id: "m-in-3", label: "风险预警", type: "signal", dataType: "RiskEscalation", description: "来自项目DA的升级风险", source: "project" },
    ],
    outputs: [
      { id: "m-out-1", label: "战略决策", type: "approval", dataType: "Decision", description: "资源分配、预算审批、优先级决策", target: "project" },
      { id: "m-out-2", label: "OKR目标", type: "data", dataType: "OKR", description: "季度/年度战略目标下发", target: "all" },
      { id: "m-out-3", label: "组织调整", type: "signal", dataType: "OrgChange", description: "组织架构/人员调整指令", target: "all" },
    ],
    kpis: [
      { name: "人均产值", formula: "revenue / headcount", unit: "万元", green: "YoY增长", red: "YoY下降" },
      { name: "项目健康度", formula: "green / total", unit: "%", green: ">75%", red: "<50%" },
      { name: "跨BU协作率", formula: "cross_bu / total", unit: "%", green: ">20%", red: "<10%" },
      { name: "创新指数", formula: "new / total_products", unit: "%", green: ">15%", red: "<5%" },
      { name: "员工敬业度", formula: "avg(engagement)", unit: "分", green: ">4.0", red: "<3.0" },
    ],
  },
];

// ── M0-M12 Simulation Steps ──

const SIMULATION_STEPS: SimStep[] = [
  { id: 1, stage: "M0", agent: "sales", action: "创建线索", router: "crm.createLead", status: "pending" },
  { id: 2, stage: "M1", agent: "sales", action: "合同签约", router: "crm.convertToOpportunity", status: "pending" },
  { id: 3, stage: "M1", agent: "project", action: "项目立项", router: "project.create", status: "pending" },
  { id: 4, stage: "M2", agent: "project", action: "阶段门设置", router: "projectGate.createGate", status: "pending" },
  { id: 5, stage: "M3", agent: "design", action: "创建图纸", router: "plm.createDocument", status: "pending" },
  { id: 6, stage: "M3", agent: "design", action: "上传版本", router: "plm.uploadVersion", status: "pending" },
  { id: 7, stage: "M4", agent: "design", action: "提交审核", router: "plm.submitReview", status: "pending" },
  { id: 8, stage: "M4", agent: "design", action: "审核通过", router: "plm.recordDecision", status: "pending" },
  { id: 9, stage: "M5", agent: "design", action: "配置基线", router: "pdm.baseline.create", status: "pending" },
  { id: 10, stage: "M5", agent: "design", action: "制造就绪", router: "pdm.readiness.runChecks", status: "pending" },
  { id: 11, stage: "M6", agent: "production", action: "生产工单", router: "production.createWorkOrder", status: "pending" },
  { id: 12, stage: "M7", agent: "production", action: "工序执行", router: "processSteps.recordStep", status: "pending" },
  { id: 13, stage: "M8", agent: "production", action: "偏差记录", router: "pdm.asBuilt.create", status: "pending" },
  { id: 14, stage: "M9", agent: "production", action: "FAT测试", router: "fatSat.createTest", status: "pending" },
  { id: 15, stage: "M10", agent: "service", action: "SAT交付", router: "fatSat.recordSATResult", status: "pending" },
  { id: 16, stage: "M11", agent: "service", action: "服务工单", router: "customerTicket.create", status: "pending" },
  { id: 17, stage: "M12", agent: "service", action: "现场洞察", router: "pdm.fieldInsight.autoDetect", status: "pending" },
  { id: 18, stage: "M12+", agent: "service", action: "创建ECR", router: "pdm.fieldInsight.createEcoFromInsight", status: "pending", detail: "闭环 → 设计DA" },
];

// ── Helpers ──

function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      {label ?? "加载中..."}
    </div>
  );
}

function getAgentById(id: string) {
  return AGENT_PERSONAS.find((a) => a.id === id);
}

const ioTypeColors: Record<string, string> = {
  data: "bg-blue-100 text-blue-700",
  signal: "bg-yellow-100 text-yellow-700",
  approval: "bg-green-100 text-green-700",
  feedback: "bg-purple-100 text-purple-700",
};

const ioTypeLabels: Record<string, string> = {
  data: "数据",
  signal: "信号",
  approval: "审批",
  feedback: "反馈",
};

// ══════════════════════════════════════════════════════
// Tab 1: 沙盘总览 — Sandbox Overview
// ══════════════════════════════════════════════════════

function OverviewTab({ onSelectAgent }: { onSelectAgent: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_PERSONAS.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card
              key={agent.id}
              className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${agent.borderColor}`}
              onClick={() => onSelectAgent(agent.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${agent.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${agent.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <CardDescription className="text-xs">{agent.nameEn} | {agent.role}</CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">{agent.level}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="font-bold">{agent.inputs.length}</p>
                    <p className="text-muted-foreground">输入</p>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="font-bold">{agent.outputs.length}</p>
                    <p className="text-muted-foreground">输出</p>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="font-bold">{agent.kpis.length}</p>
                    <p className="text-muted-foreground">KPI</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {agent.kpis.slice(0, 3).map((kpi) => (
                    <Badge key={kpi.name} variant="outline" className="text-[10px]">{kpi.name}</Badge>
                  ))}
                  {agent.kpis.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">+{agent.kpis.length - 3}</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{agent.routerCount} routers</span>
                  <span>{agent.workbench}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="w-4 h-4" /> Agent 连接矩阵
          </CardTitle>
          <CardDescription>数据流方向: 行 → 列 (输出 → 输入)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium">FROM ↓ / TO →</th>
                  {AGENT_PERSONAS.map((a) => (
                    <th key={a.id} className="p-2 text-center font-medium">{a.name.replace("数字助理", "")}</th>
                  ))}
                  <th className="p-2 text-center font-medium">外部</th>
                </tr>
              </thead>
              <tbody>
                {AGENT_PERSONAS.map((from) => (
                  <tr key={from.id} className="border-t">
                    <td className="p-2 font-medium">{from.name.replace("数字助理", "")}</td>
                    {AGENT_PERSONAS.map((to) => {
                      const connections = from.outputs.filter((o) => o.target === to.id);
                      return (
                        <td key={to.id} className="p-2 text-center">
                          {from.id === to.id ? (
                            <span className="text-gray-300">—</span>
                          ) : connections.length > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              {connections.map((c) => (
                                <Badge key={c.id} className={`text-[9px] ${ioTypeColors[c.type]}`}>
                                  {c.label}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      {from.outputs.filter((o) => !AGENT_PERSONAS.find((a) => a.id === o.target)).length > 0 ? "✓" : "·"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 2: 数据流图 — Data Flow (M0-M12)
// ══════════════════════════════════════════════════════

function DataFlowTab() {
  const stages = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M12+"];
  const agentOrder = ["sales", "project", "design", "production", "service"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">M0→M12 数字助理协同数据流</CardTitle>
          <CardDescription>每个阶段的主要Agent活动与数据交接</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="flex gap-1 mb-2">
                <div className="w-20 shrink-0 text-xs font-medium text-muted-foreground">阶段</div>
                {agentOrder.map((aId) => {
                  const agent = getAgentById(aId)!;
                  const Icon = agent.icon;
                  return (
                    <div key={aId} className={`flex-1 text-center p-1.5 rounded-t ${agent.bgColor}`}>
                      <Icon className={`w-4 h-4 mx-auto ${agent.color}`} />
                      <p className="text-[10px] font-medium mt-0.5">{agent.name.replace("数字助理", "")}</p>
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              {stages.map((stage) => {
                const stageSteps = SIMULATION_STEPS.filter((s) => s.stage === stage);
                return (
                  <div key={stage} className="flex gap-1 border-t">
                    <div className="w-20 shrink-0 flex items-center">
                      <Badge variant="outline" className="text-[10px]">{stage}</Badge>
                    </div>
                    {agentOrder.map((aId) => {
                      const steps = stageSteps.filter((s) => s.agent === aId);
                      return (
                        <div key={aId} className="flex-1 p-1.5 min-h-[40px]">
                          {steps.map((step) => (
                            <div key={step.id} className="text-[10px] p-1 rounded bg-muted/50 mb-0.5">
                              <span className="font-medium">{step.action}</span>
                              {step.detail && (
                                <span className="text-muted-foreground ml-1">({step.detail})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Handoff Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">关键数据交接点</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { from: "Sales → Project", stage: "M1", data: "合同/订单", type: "data" as const },
              { from: "Project → Design", stage: "M2", data: "需求规格", type: "data" as const },
              { from: "Design → Production", stage: "M5", data: "冻结图纸 + BOM基线 + PLC", type: "data" as const },
              { from: "Production → Service", stage: "M9", data: "FAT报告 + 设备序列号", type: "data" as const },
              { from: "Service → Design", stage: "M12+", data: "ECR + 现场洞察 (闭环)", type: "feedback" as const },
              { from: "Project → Management", stage: "持续", data: "风险预警 + 资源请求", type: "signal" as const },
              { from: "Management → All", stage: "持续", data: "OKR目标 + 战略决策", type: "approval" as const },
            ].map((handoff, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border rounded text-sm">
                <Badge variant="outline" className="text-xs shrink-0">{handoff.stage}</Badge>
                <span className="font-medium whitespace-nowrap">{handoff.from}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{handoff.data}</span>
                <Badge className={`text-[10px] ${ioTypeColors[handoff.type]}`}>
                  {ioTypeLabels[handoff.type]}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 3: 逻辑配置 — Logic Config (Editable I/O)
// ══════════════════════════════════════════════════════

function LogicConfigTab() {
  const [selectedAgent, setSelectedAgent] = useState("sales");
  const [editingIO, setEditingIO] = useState<AgentIO | null>(null);
  const [editForm, setEditForm] = useState({ label: "", description: "", type: "data" as string });

  const agent = getAgentById(selectedAgent)!;
  const Icon = agent.icon;

  const handleEditStart = (io: AgentIO) => {
    setEditingIO(io);
    setEditForm({ label: io.label, description: io.description, type: io.type });
  };

  return (
    <div className="space-y-4">
      {/* Agent Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {AGENT_PERSONAS.map((a) => {
          const AIcon = a.icon;
          return (
            <Button
              key={a.id}
              variant={selectedAgent === a.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAgent(a.id)}
              className="gap-1"
            >
              <AIcon className="w-4 h-4" />
              {a.name.replace("数字助理", "")}
            </Button>
          );
        })}
      </div>

      {/* Agent Config Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180 text-green-500" />
              输入 ({agent.inputs.length})
            </CardTitle>
            <CardDescription>该Agent接收的数据源</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agent.inputs.map((io) => {
                const sourceAgent = getAgentById(io.source ?? "");
                return (
                  <div key={io.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${ioTypeColors[io.type]}`}>{ioTypeLabels[io.type]}</Badge>
                        <span className="font-medium text-sm">{io.label}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEditStart(io)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{io.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-muted-foreground">来源:</span>
                      {sourceAgent ? (
                        <Badge variant="outline" className="text-[10px]">{sourceAgent.name.replace("数字助理", "")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">外部系统</Badge>
                      )}
                      <span className="text-muted-foreground ml-2">数据类型:</span>
                      <span className="font-mono text-[10px]">{io.dataType}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-blue-500" />
              输出 ({agent.outputs.length})
            </CardTitle>
            <CardDescription>该Agent产出的数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agent.outputs.map((io) => {
                const targetAgent = getAgentById(io.target ?? "");
                return (
                  <div key={io.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${ioTypeColors[io.type]}`}>{ioTypeLabels[io.type]}</Badge>
                        <span className="font-medium text-sm">{io.label}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEditStart(io)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{io.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-muted-foreground">目标:</span>
                      {targetAgent ? (
                        <Badge variant="outline" className="text-[10px]">{targetAgent.name.replace("数字助理", "")}</Badge>
                      ) : io.target === "all" ? (
                        <Badge variant="outline" className="text-[10px]">全部Agent</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">外部系统</Badge>
                      )}
                      <span className="text-muted-foreground ml-2">数据类型:</span>
                      <span className="font-mono text-[10px]">{io.dataType}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            KPI 配置 ({agent.kpis.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">KPI名称</th>
                  <th className="py-2 pr-3 font-medium">公式</th>
                  <th className="py-2 pr-3 font-medium">单位</th>
                  <th className="py-2 pr-3 font-medium">
                    <span className="text-green-600">正常</span>
                  </th>
                  <th className="py-2 font-medium">
                    <span className="text-red-600">预警</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {agent.kpis.map((kpi) => (
                  <tr key={kpi.name} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{kpi.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{kpi.formula}</td>
                    <td className="py-2 pr-3">{kpi.unit}</td>
                    <td className="py-2 pr-3">
                      <Badge className="text-[10px] bg-green-100 text-green-700">{kpi.green}</Badge>
                    </td>
                    <td className="py-2">
                      <Badge className="text-[10px] bg-red-100 text-red-700">{kpi.red}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit I/O Dialog */}
      <Dialog open={!!editingIO} onOpenChange={(open) => { if (!open) setEditingIO(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑 I/O 定义</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium">标签</label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">类型</label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">数据</SelectItem>
                  <SelectItem value="signal">信号</SelectItem>
                  <SelectItem value="approval">审批</SelectItem>
                  <SelectItem value="feedback">反馈</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              注: 逻辑配置修改将在下次模拟运行时生效。当前为前端沙盘配置，持久化存储需后端支持。
            </p>
            <Button className="w-full" onClick={() => setEditingIO(null)}>
              <Save className="w-4 h-4 mr-1" /> 保存配置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 4: 模拟运行 — Simulation Run
// ══════════════════════════════════════════════════════

function SimulationTab() {
  const [steps, setSteps] = useState<SimStep[]>(() =>
    SIMULATION_STEPS.map((s) => ({ ...s }))
  );
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const runSimulation = useCallback(() => {
    setRunning(true);
    setCurrentStep(0);
    setSteps(SIMULATION_STEPS.map((s) => ({ ...s, status: "pending" })));

    let idx = 0;
    const tick = () => {
      if (idx >= SIMULATION_STEPS.length) {
        setRunning(false);
        return;
      }
      setCurrentStep(idx);
      setSteps((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...s, status: "running" } : s
        )
      );

      setTimeout(() => {
        // Simulate pass/fail (95% pass rate)
        const passed = Math.random() > 0.05;
        setSteps((prev) =>
          prev.map((s, i) =>
            i === idx ? { ...s, status: passed ? "passed" : "failed" } : s
          )
        );
        idx++;
        setTimeout(tick, 200);
      }, 300);
    };
    tick();
  }, []);

  const resetSimulation = () => {
    setSteps(SIMULATION_STEPS.map((s) => ({ ...s, status: "pending" })));
    setCurrentStep(-1);
    setRunning(false);
  };

  const passed = steps.filter((s) => s.status === "passed").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const total = steps.length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button onClick={runSimulation} disabled={running} className="gap-1">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "模拟中..." : "运行 M0→M12 全流程模拟"}
        </Button>
        <Button variant="outline" onClick={resetSimulation} disabled={running} className="gap-1">
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
        {!running && passed + failed > 0 && (
          <div className="flex items-center gap-3 ml-auto text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" /> {passed}/{total} 通过
            </span>
            {failed > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" /> {failed} 失败
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {(running || passed + failed > 0) && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${failed > 0 ? "bg-orange-500" : "bg-green-500"}`}
            style={{ width: `${((passed + failed) / total) * 100}%` }}
          />
        </div>
      )}

      {/* Step List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">18步全生命周期模拟</CardTitle>
          <CardDescription>Sales → Project → Design → Production → Service → Design (闭环)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {steps.map((step, i) => {
              const agent = getAgentById(step.agent)!;
              const Icon = agent.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded text-sm transition-colors ${
                    step.status === "running" ? "bg-blue-50 border border-blue-200" :
                    step.status === "passed" ? "bg-green-50/50" :
                    step.status === "failed" ? "bg-red-50/50" : ""
                  }`}
                >
                  <Badge variant="outline" className="text-[10px] w-10 justify-center shrink-0">{step.stage}</Badge>

                  {/* Status Icon */}
                  {step.status === "pending" && <CircleDot className="w-4 h-4 text-gray-300 shrink-0" />}
                  {step.status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
                  {step.status === "passed" && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {step.status === "failed" && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}

                  {/* Agent */}
                  <div className={`flex items-center gap-1 w-24 shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${agent.color}`} />
                    <span className="text-xs">{agent.name.replace("数字助理", "")}</span>
                  </div>

                  {/* Action */}
                  <span className="font-medium flex-1">{step.action}</span>

                  {/* Router */}
                  <span className="text-xs text-muted-foreground font-mono">{step.router}</span>

                  {/* Detail */}
                  {step.detail && (
                    <Badge variant="outline" className="text-[10px] text-purple-600">{step.detail}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 5: KPI仪表板 — Agent KPI Dashboard
// ══════════════════════════════════════════════════════

function KpiDashboardTab() {
  const plmStats = trpc.plm.getStats.useQuery({});

  return (
    <div className="space-y-6">
      {/* Agent KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_PERSONAS.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card key={agent.id} className={`border-l-4 ${agent.borderColor}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${agent.color}`} />
                  <CardTitle className="text-sm">{agent.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {agent.kpis.map((kpi) => {
                    // Use real data where available
                    let value: string | number = "—";
                    if (agent.id === "design" && kpi.name === "图纸发布率" && plmStats.data) {
                      const total = plmStats.data.total;
                      value = total > 0 ? `${Math.round((plmStats.data.released / total) * 100)}%` : "0%";
                    } else if (agent.id === "design" && kpi.name === "设计冻结率" && plmStats.data) {
                      value = `${plmStats.data.freezeRate}%`;
                    } else if (agent.id === "design" && kpi.name === "评审周转" && plmStats.data) {
                      value = plmStats.data.inReview > 0 ? `${plmStats.data.inReview} 待审` : "0 待审";
                    }

                    return (
                      <div key={kpi.name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{kpi.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{value}</span>
                          <span className="text-[10px] text-muted-foreground">({kpi.unit})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Real-time Design DA Metrics (from PLM) */}
      {plmStats.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              设计DA实时指标 (PLM数据)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{plmStats.data.total}</p>
                <p className="text-xs text-muted-foreground">图纸总数</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{plmStats.data.released}</p>
                <p className="text-xs text-muted-foreground">已发布</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">{plmStats.data.inReview}</p>
                <p className="text-xs text-muted-foreground">评审中</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">{plmStats.data.frozen}</p>
                <p className="text-xs text-muted-foreground">已冻结</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-50">
                <p className="text-2xl font-bold text-emerald-600">{plmStats.data.freezeRate}%</p>
                <p className="text-xs text-muted-foreground">冻结率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System-Wide Metrics Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI健康度指标说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>正常 (Green)</span>
              <span className="text-xs text-muted-foreground">— 达标，无需干预</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>关注 (Yellow)</span>
              <span className="text-xs text-muted-foreground">— 接近阈值，需关注</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>预警 (Red)</span>
              <span className="text-xs text-muted-foreground">— 超过阈值，需立即行动</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span>未接入 (Gray)</span>
              <span className="text-xs text-muted-foreground">— 数据源待接入</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Agent Detail Drawer
// ══════════════════════════════════════════════════════

function AgentDetailDrawer({
  agentId,
  onClose,
}: {
  agentId: string | null;
  onClose: () => void;
}) {
  if (!agentId) return null;
  const agent = getAgentById(agentId);
  if (!agent) return null;

  const Icon = agent.icon;

  return (
    <Dialog open={!!agentId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${agent.bgColor} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${agent.color}`} />
            </div>
            {agent.name}
            <Badge variant="outline">{agent.level}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">角色:</span> <span className="ml-1">{agent.role}</span></div>
            <div><span className="text-muted-foreground">工作台:</span> <span className="ml-1">{agent.workbench}</span></div>
            <div><span className="text-muted-foreground">Router数:</span> <span className="ml-1">{agent.routerCount}</span></div>
            <div><span className="text-muted-foreground">路径:</span> <span className="ml-1 font-mono text-xs">{agent.workbenchPath}</span></div>
          </div>

          {/* I/O */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2 text-green-600">输入 ({agent.inputs.length})</h4>
              {agent.inputs.map((io) => (
                <div key={io.id} className="text-xs p-2 border rounded mb-1">
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[9px] ${ioTypeColors[io.type]}`}>{ioTypeLabels[io.type]}</Badge>
                    <span className="font-medium">{io.label}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{io.description}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 text-blue-600">输出 ({agent.outputs.length})</h4>
              {agent.outputs.map((io) => (
                <div key={io.id} className="text-xs p-2 border rounded mb-1">
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[9px] ${ioTypeColors[io.type]}`}>{ioTypeLabels[io.type]}</Badge>
                    <span className="font-medium">{io.label}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{io.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div>
            <h4 className="font-medium text-sm mb-2">KPI指标 ({agent.kpis.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-2 text-left">指标</th>
                    <th className="py-1 pr-2 text-left">公式</th>
                    <th className="py-1 pr-2 text-center">正常</th>
                    <th className="py-1 text-center">预警</th>
                  </tr>
                </thead>
                <tbody>
                  {agent.kpis.map((kpi) => (
                    <tr key={kpi.name} className="border-b last:border-0">
                      <td className="py-1 pr-2 font-medium">{kpi.name}</td>
                      <td className="py-1 pr-2 font-mono">{kpi.formula}</td>
                      <td className="py-1 pr-2 text-center text-green-600">{kpi.green}</td>
                      <td className="py-1 text-center text-red-600">{kpi.red}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════

export default function AiAgentSandboxMap() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map className="w-6 h-6" />
          AI Agent 沙盘
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          6大数字助理拓扑 — 输入输出关系、M0-M12生命周期流、逻辑配置、模拟运行
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview" className="gap-1">
            <Network className="w-4 h-4" />沙盘总览
          </TabsTrigger>
          <TabsTrigger value="dataflow" className="gap-1">
            <Activity className="w-4 h-4" />数据流图
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1">
            <Settings2 className="w-4 h-4" />逻辑配置
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-1">
            <Play className="w-4 h-4" />模拟运行
          </TabsTrigger>
          <TabsTrigger value="kpi" className="gap-1">
            <BarChart3 className="w-4 h-4" />KPI仪表板
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab onSelectAgent={setSelectedAgentId} />
        </TabsContent>
        <TabsContent value="dataflow"><DataFlowTab /></TabsContent>
        <TabsContent value="config"><LogicConfigTab /></TabsContent>
        <TabsContent value="simulation"><SimulationTab /></TabsContent>
        <TabsContent value="kpi"><KpiDashboardTab /></TabsContent>
      </Tabs>

      <AgentDetailDrawer agentId={selectedAgentId} onClose={() => setSelectedAgentId(null)} />
    </div>
  );
}
