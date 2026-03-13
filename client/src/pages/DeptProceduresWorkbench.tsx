import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ScrollText, FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Users, BarChart3, GitBranch, ChevronDown, ChevronRight, Plus,
  BookOpen, Shield, Edit, Eye, Calendar, Flag, Bell, Search,
  Check, RefreshCw, XCircle,
} from "lucide-react";

// ─── demo: Department list ────────────────────────────────────────────────────
const DEPARTMENTS = [
  "总裁办", "事业部", "AI数智部", "财务部", "人事行政部",
  "质量部", "生产部", "研发部", "采购部", "仓库物流部",
]; // demo

// ─── demo: Procedure types ────────────────────────────────────────────────────
const PROC_TYPES = ["核心流程", "规章制度", "合规要求", "异常处理"] as const; // demo
type ProcType = typeof PROC_TYPES[number];

// ─── demo: Compliance heatmap data (department × type → rate%) ────────────────
const COMPLIANCE_RATES: Record<string, Record<ProcType, number>> = {
  "总裁办":    { "核心流程": 98, "规章制度": 100, "合规要求": 97, "异常处理": 95 },
  "事业部":    { "核心流程": 92, "规章制度": 88,  "合规要求": 91, "异常处理": 79 },
  "AI数智部":  { "核心流程": 95, "规章制度": 96,  "合规要求": 98, "异常处理": 94 },
  "财务部":    { "核心流程": 99, "规章制度": 100, "合规要求": 100,"异常处理": 97 },
  "人事行政部":{ "核心流程": 96, "规章制度": 97,  "合规要求": 95, "异常处理": 88 },
  "质量部":    { "核心流程": 94, "规章制度": 92,  "合规要求": 97, "异常处理": 85 },
  "生产部":    { "核心流程": 82, "规章制度": 80,  "合规要求": 78, "异常处理": 65 },
  "研发部":    { "核心流程": 90, "规章制度": 87,  "合规要求": 93, "异常处理": 83 },
  "采购部":    { "核心流程": 85, "规章制度": 83,  "合规要求": 89, "异常处理": 72 },
  "仓库物流部":{ "核心流程": 78, "规章制度": 75,  "合规要求": 80, "异常处理": 58 },
}; // demo

function complianceColor(rate: number) {
  if (rate >= 95) return "bg-green-100 text-green-800";
  if (rate >= 80) return "bg-blue-100 text-blue-800";
  if (rate >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

// ─── demo: Procedures list ────────────────────────────────────────────────────
interface Procedure {
  id: string;
  code: string;
  title: string;
  department: string;
  type: ProcType;
  status: "draft" | "effective" | "archived";
  version: string;
  owner: string;
  effectiveDate: string;
  ackProgress: number; // 0-100
  summary: string;
  penaltyRules: string;
}

const PROCEDURES: Procedure[] = [
  { id: "P001", code: "GRT-OA-001", title: "公文管理及用印规范", department: "总裁办", type: "核心流程", status: "effective", version: "V2.1", owner: "倪亚东", effectiveDate: "2025-01-01", ackProgress: 97, summary: "规范公文起草、审批、用印及归档流程，确保公司对外文件的合规性与一致性。", penaltyRules: "未按规程用印，首次警告；二次以上记过处分。" }, // demo
  { id: "P002", code: "GRT-BU-001", title: "项目立项及里程碑管理", department: "事业部", type: "核心流程", status: "effective", version: "V3.0", owner: "周辉", effectiveDate: "2025-03-01", ackProgress: 88, summary: "明确项目从立项申请、评审、资源分配到各阶段里程碑验收的完整管理流程。", penaltyRules: "里程碑未按时汇报，项目经理绩效扣减5分/次。" }, // demo
  { id: "P003", code: "GRT-AI-001", title: "AI模型上线审批流程", department: "AI数智部", type: "合规要求", status: "effective", version: "V1.2", owner: "倪微薇", effectiveDate: "2025-06-01", ackProgress: 96, summary: "规定AI算法模型在生产环境部署前必须通过数据安全、模型性能、伦理合规三重审批。", penaltyRules: "未经审批擅自上线，取消当月绩效奖金。" }, // demo
  { id: "P004", code: "GRT-FIN-001", title: "费用报销管理制度", department: "财务部", type: "规章制度", status: "effective", version: "V4.0", owner: "黄晓兰", effectiveDate: "2024-07-01", ackProgress: 100, summary: "规定各类费用报销的申请条件、审批权限、凭证要求及时限，杜绝虚假报销。", penaltyRules: "虚假报销按金额3倍追缴，并予以处分。" }, // demo
  { id: "P005", code: "GRT-HR-001", title: "员工入职及试用期管理", department: "人事行政部", type: "核心流程", status: "effective", version: "V2.3", owner: "徐家乐", effectiveDate: "2025-02-01", ackProgress: 95, summary: "明确新员工入职手续、岗位培训、试用期考核及转正流程。", penaltyRules: "未完成入职培训即上岗，责任部门负责人警告处分。" }, // demo
  { id: "P006", code: "GRT-QA-001", title: "产品质量异常处理规程", department: "质量部", type: "异常处理", status: "effective", version: "V1.5", owner: "张洵", effectiveDate: "2025-01-15", ackProgress: 85, summary: "规定质量异常的识别、上报、8D分析、改善验证及关闭的标准操作程序。", penaltyRules: "漏报或迟报质量异常，相关责任人扣绩效10分。" }, // demo
  { id: "P007", code: "GRT-MFG-001", title: "生产安全操作规程", department: "生产部", type: "合规要求", status: "effective", version: "V5.0", owner: "韩保程", effectiveDate: "2024-04-01", ackProgress: 80, summary: "规定生产现场安全操作标准、防护装备使用要求及紧急事故处置程序。", penaltyRules: "违反安全规程，依情节轻重给予警告至停岗处理。" }, // demo
  { id: "P008", code: "GRT-RND-001", title: "设计变更控制程序", department: "研发部", type: "核心流程", status: "effective", version: "V2.0", owner: "曹庆伟", effectiveDate: "2025-04-01", ackProgress: 90, summary: "规范产品设计变更的提出、评估、审批、实施及验证全流程，确保工程更改受控。", penaltyRules: "未经ECO审批擅自变更设计，责任人记大过一次。" }, // demo
  { id: "P009", code: "GRT-PUR-001", title: "供应商准入及评估管理", department: "采购部", type: "规章制度", status: "effective", version: "V3.1", owner: "沈迎凤", effectiveDate: "2025-05-01", ackProgress: 83, summary: "规定新供应商资质审核、样品认可、年度评分及淘汰机制，保障供应链质量。", penaltyRules: "绕过准入流程采购，取消采购人员当月采购佣金。" }, // demo
  { id: "P010", code: "GRT-WH-001", title: "物料出入库管理规范", department: "仓库物流部", type: "核心流程", status: "effective", version: "V2.2", owner: "徐家乐", effectiveDate: "2024-11-01", ackProgress: 75, summary: "明确物料接收、检验、存储、发料、退料及盘点的操作标准和系统录入要求。", penaltyRules: "账实不符，责任人扣绩效5分/次，累计3次以上降级处理。" }, // demo
  { id: "P011", code: "GRT-HR-002", title: "薪酬保密管理规定", department: "人事行政部", type: "规章制度", status: "effective", version: "V1.0", owner: "徐家乐", effectiveDate: "2025-08-01", ackProgress: 92, summary: "规定员工薪酬信息的保密义务，禁止相互打探、泄露薪酬数据。", penaltyRules: "违反薪酬保密，书面警告；情节严重者解除劳动合同。" }, // demo
  { id: "P012", code: "GRT-AI-002", title: "数据安全与隐私保护规程", department: "AI数智部", type: "合规要求", status: "draft", version: "V0.9", owner: "倪微薇", effectiveDate: "", ackProgress: 0, summary: "草拟中：规范公司数据分类分级、访问控制、传输加密及泄露应急处置要求。", penaltyRules: "待定" }, // demo
]; // demo

// ─── demo: Pending acknowledgements ──────────────────────────────────────────
interface PendingAck {
  id: string;
  title: string;
  department: string;
  priority: "high" | "medium" | "low";
  deadline: string;
  procedureId: string;
}

const PENDING_ACKS: PendingAck[] = [
  { id: "A001", title: "生产安全操作规程 (V5.0)", department: "生产部", priority: "high", deadline: "2026-03-15", procedureId: "P007" },
  { id: "A002", title: "产品质量异常处理规程 (V1.5)", department: "质量部", priority: "high", deadline: "2026-03-16", procedureId: "P006" },
  { id: "A003", title: "项目立项及里程碑管理 (V3.0)", department: "事业部", priority: "medium", deadline: "2026-03-20", procedureId: "P002" },
  { id: "A004", title: "物料出入库管理规范 (V2.2)", department: "仓库物流部", priority: "medium", deadline: "2026-03-22", procedureId: "P010" },
  { id: "A005", title: "供应商准入及评估管理 (V3.1)", department: "采购部", priority: "low", deadline: "2026-03-25", procedureId: "P009" },
  { id: "A006", title: "费用报销管理制度 (V4.0)", department: "财务部", priority: "low", deadline: "2026-03-28", procedureId: "P004" },
  { id: "A007", title: "设计变更控制程序 (V2.0)", department: "研发部", priority: "medium", deadline: "2026-03-18", procedureId: "P008" },
  { id: "A008", title: "薪酬保密管理规定 (V1.0)", department: "人事行政部", priority: "high", deadline: "2026-03-14", procedureId: "P011" },
]; // demo

// ─── demo: Version history ────────────────────────────────────────────────────
interface Version {
  ver: string;
  date: string;
  changeType: "新增" | "修订" | "废止";
  summary: string;
  approver: string;
}

const VERSION_HISTORY: Record<string, Version[]> = {
  "P004": [
    { ver: "V1.0", date: "2020-01-01", changeType: "新增", summary: "初始版本，建立费用报销基本框架", approver: "倪亚东" },
    { ver: "V2.0", date: "2022-07-01", changeType: "修订", summary: "增加差旅费标准，调整审批层级", approver: "黄晓兰" },
    { ver: "V3.0", date: "2023-07-01", changeType: "修订", summary: "引入在线报销流程，取消纸质单据", approver: "倪亚东" },
    { ver: "V4.0", date: "2024-07-01", changeType: "修订", summary: "新增AI自动审核规则，强化反腐条款", approver: "倪亚东" },
  ],
  "P007": [
    { ver: "V1.0", date: "2018-04-01", changeType: "新增", summary: "建立生产安全基本操作规程", approver: "韩保程" },
    { ver: "V2.0", date: "2020-06-01", changeType: "修订", summary: "加入半导体清洗设备特殊安全要求", approver: "倪亚东" },
    { ver: "V3.0", date: "2021-09-01", changeType: "修订", summary: "引入5S管理要求，更新急救流程", approver: "徐家乐" },
    { ver: "V4.0", date: "2023-01-15", changeType: "修订", summary: "新增UWB定位安全预警联动规则", approver: "韩保程" },
    { ver: "V5.0", date: "2024-04-01", changeType: "修订", summary: "全面升级符合IATF16949安全附录要求", approver: "倪亚东" },
  ],
  "P008": [
    { ver: "V1.0", date: "2023-01-01", changeType: "新增", summary: "建立初版设计变更管理体系", approver: "曹庆伟" },
    { ver: "V2.0", date: "2025-04-01", changeType: "修订", summary: "引入PLM系统联动，增加成本影响评估模块", approver: "倪亚东" },
  ],
}; // demo

// ─── demo: Exception records ──────────────────────────────────────────────────
interface ExceptionRecord {
  id: string;
  title: string;
  procedureCode: string;
  department: string;
  severity: "minor" | "major" | "critical";
  status: "待处理" | "调查中" | "已解决" | "已关闭";
  reportedBy: string;
  reportedDate: string;
  description: string;
}

const EXCEPTIONS: ExceptionRecord[] = [
  { id: "E001", title: "仓库未按规程执行实物盘点", procedureCode: "GRT-WH-001", department: "仓库物流部", severity: "major", status: "调查中", reportedBy: "张洵", reportedDate: "2026-03-08", description: "3月例行稽查发现B库区连续2周未完成每日进出库系统录入，账实差异率达4.7%。" },
  { id: "E002", title: "采购绕过供应商准入直接下单", procedureCode: "GRT-PUR-001", department: "采购部", severity: "critical", status: "待处理", reportedBy: "倪亚东", reportedDate: "2026-03-10", description: "发现某紧急采购单未经供应商资质审核即完成付款，金额约18万元，涉及一家未注册供应商。" },
  { id: "E003", title: "生产线操作人员未佩戴护目镜", procedureCode: "GRT-MFG-001", department: "生产部", severity: "minor", status: "已解决", reportedBy: "韩保程", reportedDate: "2026-03-05", description: "班前巡检中发现2名操作员在化学清洗液喷淋区域未按规定佩戴防护眼镜，已当场纠正并记录。" },
]; // demo

// ─── demo: KPI linkage data ───────────────────────────────────────────────────
interface KpiLink {
  procedureCode: string;
  procedureTitle: string;
  department: string;
  kpiName: string;
  target: string;
  weight: string;
}

const KPI_LINKS: KpiLink[] = [
  { procedureCode: "GRT-QA-001", procedureTitle: "产品质量异常处理规程", department: "质量部", kpiName: "质量异常关闭及时率", target: "≥95%", weight: "15%" },
  { procedureCode: "GRT-QA-001", procedureTitle: "产品质量异常处理规程", department: "质量部", kpiName: "8D报告完成率", target: "100%", weight: "10%" },
  { procedureCode: "GRT-MFG-001", procedureTitle: "生产安全操作规程", department: "生产部", kpiName: "安全事故次数", target: "0次", weight: "20%" },
  { procedureCode: "GRT-BU-001", procedureTitle: "项目立项及里程碑管理", department: "事业部", kpiName: "里程碑准时完成率", target: "≥90%", weight: "20%" },
  { procedureCode: "GRT-FIN-001", procedureTitle: "费用报销管理制度", department: "财务部", kpiName: "报销差错率", target: "≤0.5%", weight: "10%" },
  { procedureCode: "GRT-PUR-001", procedureTitle: "供应商准入及评估管理", department: "采购部", kpiName: "合格供应商占比", target: "≥85%", weight: "15%" },
  { procedureCode: "GRT-WH-001", procedureTitle: "物料出入库管理规范", department: "仓库物流部", kpiName: "库存账实准确率", target: "≥99%", weight: "20%" },
  { procedureCode: "GRT-HR-001", procedureTitle: "员工入职及试用期管理", department: "人事行政部", kpiName: "试用期转正达标率", target: "≥90%", weight: "10%" },
  { procedureCode: "GRT-RND-001", procedureTitle: "设计变更控制程序", department: "研发部", kpiName: "ECO审批周期", target: "≤5工作日", weight: "15%" },
  { procedureCode: "GRT-AI-001", procedureTitle: "AI模型上线审批流程", department: "AI数智部", kpiName: "模型合规率", target: "100%", weight: "25%" },
]; // demo

// ─── Helper: status/priority/severity badge ───────────────────────────────────
function StatusBadge({ status }: { status: Procedure["status"] }) {
  const map = {
    draft:     { label: "草稿", className: "bg-gray-100 text-gray-600" },
    effective: { label: "生效中", className: "bg-green-100 text-green-700" },
    archived:  { label: "已归档", className: "bg-slate-100 text-slate-500" },
  };
  const { label, className } = map[status];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function TypeBadge({ type }: { type: ProcType }) {
  const map: Record<ProcType, string> = {
    "核心流程": "bg-blue-100 text-blue-700",
    "规章制度": "bg-purple-100 text-purple-700",
    "合规要求": "bg-orange-100 text-orange-700",
    "异常处理": "bg-red-100 text-red-600",
  };
  return <Badge className={`text-xs ${map[type]}`}>{type}</Badge>;
}

function PriorityBadge({ priority }: { priority: PendingAck["priority"] }) {
  const map = {
    high:   { label: "紧急", className: "bg-red-100 text-red-700" },
    medium: { label: "普通", className: "bg-yellow-100 text-yellow-700" },
    low:    { label: "低",   className: "bg-gray-100 text-gray-500" },
  };
  const { label, className } = map[priority];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function SeverityBadge({ severity }: { severity: ExceptionRecord["severity"] }) {
  const map = {
    minor:    { label: "轻微", className: "bg-gray-100 text-gray-600" },
    major:    { label: "严重", className: "bg-yellow-100 text-yellow-800" },
    critical: { label: "重大", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = map[severity];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function ExStatusBadge({ status }: { status: ExceptionRecord["status"] }) {
  const map: Record<ExceptionRecord["status"], string> = {
    "待处理": "bg-red-100 text-red-700",
    "调查中": "bg-yellow-100 text-yellow-800",
    "已解决": "bg-blue-100 text-blue-700",
    "已关闭": "bg-gray-100 text-gray-500",
  };
  return <Badge className={`text-xs ${map[status]}`}>{status}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DeptProceduresWorkbench() {
  const { t } = useLanguage();

  // Tab 2 filters
  const [deptFilter, setDeptFilter] = useState<string>("全部");
  const [typeFilter, setTypeFilter] = useState<string>("全部");
  const [statusFilter, setStatusFilter] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProc, setExpandedProc] = useState<string | null>(null);

  // Tab 3 acknowledged set
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  // Tab 4 version selector
  const [selectedProcForVersion, setSelectedProcForVersion] = useState("P004");

  // Tab 5 exception dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [newException, setNewException] = useState({ title: "", department: "质量部", severity: "minor", description: "" });

  // Tab 6 kpi dept filter
  const [kpiDeptFilter, setKpiDeptFilter] = useState("全部");

  // Tab 7 editor form
  const [editorForm, setEditorForm] = useState({
    department: "事业部",
    type: "核心流程",
    code: "",
    title: "",
    summary: "",
    content: "",
    priority: "medium",
    roles: "",
    legalBasis: "",
    industryStd: "",
    reviewFreq: "年度",
  });

  // Derived filtered procedures
  const filteredProcedures = PROCEDURES.filter(p => {
    if (deptFilter !== "全部" && p.department !== deptFilter) return false;
    if (typeFilter !== "全部" && p.type !== typeFilter) return false;
    if (statusFilter !== "全部") {
      const map: Record<string, string> = { draft: "草稿", effective: "生效中", archived: "已归档" };
      if (map[p.status] !== statusFilter) return false;
    }
    if (searchQuery && !p.title.includes(searchQuery) && !p.code.includes(searchQuery)) return false;
    return true;
  });

  const pendingCount = PENDING_ACKS.filter(a => !acknowledged.has(a.id)).length;

  // Procedures with version history available
  const versionedProcs = PROCEDURES.filter(p => VERSION_HISTORY[p.id]);

  function handleAck(id: string) {
    setAcknowledged(prev => new Set([...prev, id]));
  }

  function generateCode() {
    const deptCodes: Record<string, string> = {
      "总裁办": "OA", "事业部": "BU", "AI数智部": "AI", "财务部": "FIN",
      "人事行政部": "HR", "质量部": "QA", "生产部": "MFG", "研发部": "RND",
      "采购部": "PUR", "仓库物流部": "WH",
    };
    const prefix = deptCodes[editorForm.department] || "XX";
    const num = String(Math.floor(Math.random() * 900) + 100);
    setEditorForm(f => ({ ...f, code: `GRT-${prefix}-${num}` }));
  }

  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <ScrollText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">企业制度管理工作台</h1>
          <p className="text-muted-foreground text-sm">
            部门制度 · 合规要求 · 版本管控 · 异常处理 · KPI关联
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">制度总览</TabsTrigger>
          <TabsTrigger value="procedures">部门制度</TabsTrigger>
          <TabsTrigger value="pending">
            待确认
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions">版本管理</TabsTrigger>
          <TabsTrigger value="exceptions">异常记录</TabsTrigger>
          <TabsTrigger value="kpi">KPI关联</TabsTrigger>
          <TabsTrigger value="editor">制度编辑</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════
            Tab 1: 制度总览
        ═══════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "制度总数",   value: "73", icon: FileText,     color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "生效中",     value: "73", icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50" },
              { label: "待确认",     value: String(pendingCount), icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "异常记录",   value: "3",  icon: AlertTriangle, color: "text-red-600",  bg: "bg-red-50" },
            ].map(card => (
              <Card key={card.label}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Compliance heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                合规热力图 — 各部门 × 制度类型确认率
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-3 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> ≥95%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> 80–94%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> 60–79%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> &lt;60%</span>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">部门</TableHead>
                    {PROC_TYPES.map(t => (
                      <TableHead key={t} className="text-center">{t}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEPARTMENTS.map(dept => (
                    <TableRow key={dept}>
                      <TableCell className="font-medium text-sm">{dept}</TableCell>
                      {PROC_TYPES.map(type => {
                        const rate = COMPLIANCE_RATES[dept][type];
                        return (
                          <TableCell key={type} className="text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${complianceColor(rate)}`}>
                              {rate}%
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 2: 部门制度
        ═══════════════════════════════════════════ */}
        <TabsContent value="procedures" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索制度编号或名称..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部部门</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部类型</SelectItem>
                {PROC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部状态</SelectItem>
                <SelectItem value="草稿">草稿</SelectItem>
                <SelectItem value="生效中">生效中</SelectItem>
                <SelectItem value="已归档">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">共 {filteredProcedures.length} 条制度</p>

          {/* Procedure cards */}
          <div className="space-y-3">
            {filteredProcedures.map(proc => (
              <Card key={proc.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{proc.code}</span>
                        <TypeBadge type={proc.type} />
                        <StatusBadge status={proc.status} />
                        <Badge variant="outline" className="text-xs">{proc.version}</Badge>
                      </div>
                      <CardTitle className="text-base">{proc.title}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedProc(expandedProc === proc.id ? null : proc.id)}
                    >
                      {expandedProc === proc.id
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {proc.department}</span>
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> 负责人: {proc.owner}</span>
                    {proc.effectiveDate && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> 生效: {proc.effectiveDate}</span>
                    )}
                  </div>
                </CardHeader>
                {proc.status === "effective" && (
                  <CardContent className="pt-0 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">确认进度</span>
                      <Progress value={proc.ackProgress} className="h-1.5 flex-1" />
                      <span className="text-xs font-semibold">{proc.ackProgress}%</span>
                    </div>
                  </CardContent>
                )}
                {expandedProc === proc.id && (
                  <CardContent className="border-t bg-muted/20 pt-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">制度摘要</p>
                        <p>{proc.summary}</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">违规处理规则</p>
                        <p className="text-red-700 bg-red-50 p-2 rounded text-xs">{proc.penaltyRules}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 3: 待确认
        ═══════════════════════════════════════════ */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-yellow-500" />
                我的待确认制度
                <Badge className="bg-yellow-100 text-yellow-800 ml-1">
                  {pendingCount} 项待处理
                </Badge>
              </CardTitle>
              <CardDescription>请在截止日期前阅读并确认以下制度，确认后不可撤销</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PENDING_ACKS.map(ack => {
                const done = acknowledged.has(ack.id);
                return (
                  <div
                    key={ack.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      done ? "border-green-200 bg-green-50/50 opacity-60" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <PriorityBadge priority={ack.priority} />
                        <span className="text-sm font-medium">{ack.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ack.department}</span>
                        <span className="flex items-center gap-1"><Flag className="h-3 w-3" />截止: {ack.deadline}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={done ? "outline" : "default"}
                      className={done ? "text-green-600 border-green-300" : ""}
                      disabled={done}
                      onClick={() => handleAck(ack.id)}
                    >
                      {done
                        ? <><Check className="h-3 w-3 mr-1" />已确认</>
                        : "我已阅读并理解"}
                    </Button>
                  </div>
                );
              })}
              {pendingCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p>所有制度均已确认，感谢您的配合！</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 4: 版本管理
        ═══════════════════════════════════════════ */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-indigo-500" />
                版本历史时间轴
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedProcForVersion} onValueChange={setSelectedProcForVersion}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="选择制度" />
                </SelectTrigger>
                <SelectContent>
                  {versionedProcs.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {VERSION_HISTORY[selectedProcForVersion] && (
                <div className="relative pl-8">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {[...VERSION_HISTORY[selectedProcForVersion]].reverse().map((ver, i) => {
                      const isLatest = i === 0;
                      const typeColor: Record<Version["changeType"], string> = {
                        "新增": "bg-green-100 text-green-700",
                        "修订": "bg-blue-100 text-blue-700",
                        "废止": "bg-red-100 text-red-700",
                      };
                      return (
                        <div key={ver.ver} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-5 w-3 h-3 rounded-full border-2 ${isLatest ? "bg-indigo-500 border-indigo-300" : "bg-white border-border"}`} />
                          <div className={`ml-2 p-3 rounded-lg border ${isLatest ? "border-indigo-200 bg-indigo-50/30" : "bg-card"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-sm">{ver.ver}</span>
                              {isLatest && <Badge className="bg-indigo-100 text-indigo-700 text-xs">当前版本</Badge>}
                              <Badge className={`text-xs ${typeColor[ver.changeType]}`}>{ver.changeType}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">{ver.date}</span>
                            </div>
                            <p className="text-sm">{ver.summary}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Shield className="h-3 w-3" />审批人: {ver.approver}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 5: 异常记录
        ═══════════════════════════════════════════ */}
        <TabsContent value="exceptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">制度执行异常记录</h3>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />报告异常
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>报告制度执行异常</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>异常标题</Label>
                    <Input
                      placeholder="简要描述异常情况..."
                      value={newException.title}
                      onChange={e => setNewException(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>所属部门</Label>
                    <Select value={newException.department} onValueChange={v => setNewException(f => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>严重程度</Label>
                    <Select value={newException.severity} onValueChange={v => setNewException(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">轻微</SelectItem>
                        <SelectItem value="major">严重</SelectItem>
                        <SelectItem value="critical">重大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>详细描述</Label>
                    <Textarea
                      placeholder="请详细描述异常情况、发现时间、涉及人员..."
                      rows={4}
                      value={newException.description}
                      onChange={e => setNewException(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setReportDialogOpen(false)}>取消</Button>
                    <Button onClick={() => setReportDialogOpen(false)}>提交异常</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status pipeline legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>状态流程:</span>
            {["待处理", "调查中", "已解决", "已关闭"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1">
                <Badge className={`text-xs ${
                  s === "待处理" ? "bg-red-100 text-red-700" :
                  s === "调查中" ? "bg-yellow-100 text-yellow-800" :
                  s === "已解决" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{s}</Badge>
                {i < arr.length - 1 && <span>→</span>}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {EXCEPTIONS.map(exc => (
              <Card key={exc.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <SeverityBadge severity={exc.severity} />
                        <ExStatusBadge status={exc.status} />
                        <span className="text-xs font-mono text-muted-foreground">{exc.procedureCode}</span>
                      </div>
                      <CardTitle className="text-base">{exc.title}</CardTitle>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span><Users className="h-3 w-3 inline mr-1" />{exc.department}</span>
                    <span><Shield className="h-3 w-3 inline mr-1" />报告人: {exc.reportedBy}</span>
                    <span><Calendar className="h-3 w-3 inline mr-1" />{exc.reportedDate}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{exc.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 6: KPI关联
        ═══════════════════════════════════════════ */}
        <TabsContent value="kpi" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={kpiDeptFilter} onValueChange={setKpiDeptFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部部门</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              共 {KPI_LINKS.filter(k => kpiDeptFilter === "全部" || k.department === kpiDeptFilter).length} 条关联
            </span>
          </div>

          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>制度编码</TableHead>
                    <TableHead>制度名称</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>KPI指标</TableHead>
                    <TableHead>目标值</TableHead>
                    <TableHead className="text-right">权重</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {KPI_LINKS
                    .filter(k => kpiDeptFilter === "全部" || k.department === kpiDeptFilter)
                    .map((k, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{k.procedureCode}</TableCell>
                        <TableCell className="text-sm">{k.procedureTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{k.department}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{k.kpiName}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700 text-xs">{k.target}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{k.weight}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            Tab 7: 制度编辑 (for managers)
        ═══════════════════════════════════════════ */}
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="h-4 w-4 text-indigo-500" />
                制度草案编辑器
              </CardTitle>
              <CardDescription>仅限部门经理及以上职级使用。保存草稿后需提交审批方可生效。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1.5">
                  <Label>所属部门 <span className="text-red-500">*</span></Label>
                  <Select value={editorForm.department} onValueChange={v => setEditorForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <Label>制度类型 <span className="text-red-500">*</span></Label>
                  <Select value={editorForm.type} onValueChange={v => setEditorForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Code (auto-generated) */}
                <div className="space-y-1.5">
                  <Label>制度编码</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="GRT-XX-000"
                      value={editorForm.code}
                      onChange={e => setEditorForm(f => ({ ...f, code: e.target.value }))}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={generateCode}>
                      <RefreshCw className="h-3 w-3 mr-1" />自动生成
                    </Button>
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label>优先级</Label>
                  <Select value={editorForm.priority} onValueChange={v => setEditorForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高优先级</SelectItem>
                      <SelectItem value="medium">普通</SelectItem>
                      <SelectItem value="low">低优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>制度名称 <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="例：XX部门XX管理规定"
                    value={editorForm.title}
                    onChange={e => setEditorForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Summary */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>制度摘要</Label>
                  <Textarea
                    placeholder="用2-3句话概括本制度的核心目的和管控范围..."
                    rows={2}
                    value={editorForm.summary}
                    onChange={e => setEditorForm(f => ({ ...f, summary: e.target.value }))}
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>制度正文 <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="请输入完整制度条款内容。建议使用条款编号（1. 目的；2. 适用范围；3. 职责；4. 具体规定；5. 违规处理）..."
                    rows={8}
                    value={editorForm.content}
                    onChange={e => setEditorForm(f => ({ ...f, content: e.target.value }))}
                  />
                </div>

                {/* Applicable roles */}
                <div className="space-y-1.5">
                  <Label>适用岗位/角色</Label>
                  <Input
                    placeholder="例：全体员工 / 部门经理以上 / 生产操作员"
                    value={editorForm.roles}
                    onChange={e => setEditorForm(f => ({ ...f, roles: e.target.value }))}
                  />
                </div>

                {/* Review frequency */}
                <div className="space-y-1.5">
                  <Label>复审周期</Label>
                  <Select value={editorForm.reviewFreq} onValueChange={v => setEditorForm(f => ({ ...f, reviewFreq: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="季度">季度复审</SelectItem>
                      <SelectItem value="年度">年度复审</SelectItem>
                      <SelectItem value="两年">两年一次</SelectItem>
                      <SelectItem value="事件驱动">事件驱动</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Legal basis */}
                <div className="space-y-1.5">
                  <Label>法律依据</Label>
                  <Input
                    placeholder="例：《劳动合同法》第XX条"
                    value={editorForm.legalBasis}
                    onChange={e => setEditorForm(f => ({ ...f, legalBasis: e.target.value }))}
                  />
                </div>

                {/* Industry standard */}
                <div className="space-y-1.5">
                  <Label>行业标准</Label>
                  <Input
                    placeholder="例：IATF 16949:2016 / ISO 9001:2015"
                    value={editorForm.industryStd}
                    onChange={e => setEditorForm(f => ({ ...f, industryStd: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t mt-4">
                <Button variant="outline" className="gap-1">
                  <BookOpen className="h-4 w-4" />保存草稿
                </Button>
                <Button className="gap-1">
                  <CheckCircle2 className="h-4 w-4" />提交审批
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
