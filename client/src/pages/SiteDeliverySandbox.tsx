/**
 * SiteDeliverySandbox — 设备现场交付与联调共创沙盘
 * Site Delivery & Joint Commissioning Sandbox
 *
 * CEO 设计的"通关五大战役 + 联合指挥部结盟"架构:
 *   Step 0: 联合指挥部结盟 (发货前30天) — 投产保障矩阵签核
 *   Step 1: 进场前置条件点亮 (发货前15天) — 基建/物资齐套
 *   Step 2: 物理就位与硬装确权 (Day 0) — 卸货/九位/安全宣誓
 *   Step 3: 带料联调与黑匣子记录 (Day +1~+7) — 参数寻优/清洁度打靶
 *   Step 4: 能力武装与量产交钥匙 (Day +21) — 培训/考核/点检表
 *   Step 5: M12 终局验收签字 — 全景履历书/财务结案
 *
 * Demo: GRT-MILLISON-8800T (重庆美利信 8800T超大型压铸岛输送线)
 */
import React, { useState, useMemo, useCallback } from "react";
import { useSandboxPageEnhancements } from "@/components/Sandbox/useSandboxPageEnhancements";
import ShortcutOverlay from "@/components/Sandbox/ShortcutOverlay";
import SandboxEventFlowPanel from "@/components/Sandbox/SandboxEventFlowPanel";
import {
  Shield, Lock, Unlock, CheckCircle2, Circle, ChevronRight,
  Users, Phone, Mail, AlertTriangle, FileText, Camera,
  BarChart3, Wrench, Award, Zap, Clock, ArrowRight,
  Building2, UserCheck, Download, Upload, Eye,
  Activity, Target, Package, TrendingUp, Star,
  MessageSquare, Send, Bot, AlertCircle, Info,
  Pen, Fingerprint, Crown, Siren, GraduationCap,
  ClipboardCheck, Inbox, ExternalLink, Filter,
  Plus, Trash2, Edit3, Save, X, ThumbsUp, Briefcase,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface Commander {
  role: string;
  name: string;
  phone: string;
  title: string;
  isGrt: boolean;
}

interface StageTask {
  id: string;
  label: string;
  details: string[];
  customerCommander: Commander;
  grtCommander: Commander;
  reportTo: string;
  deliverable: string;
  safeguard: string;
  grtSigned: boolean;
  customerSigned: boolean;
}

interface SopStep {
  key: string;
  label: string;
  labelEn: string;
  timeline: string;
  locked: boolean;
  completed: boolean;
  tasks: StageTask[];
}

interface AgentMessage {
  id: number;
  type: "alert" | "remind" | "info" | "safety";
  text: string;
  time: string;
}

interface ServiceEvaluation {
  id: string;
  category: string;
  content: string;
  rating: 1 | 2 | 3 | 4 | 5;
  evaluator: string;
  date: string;
}

interface EquipmentProject {
  id: string;
  code: string;
  name: string;
  status: "planning" | "in_progress" | "commissioning" | "completed" | "warranty";
  deliveryDate: string;
}

interface CustomerRequirement {
  id: string;
  source: "技术标书" | "客户邮件" | "现场口头" | "微信记录" | "会议纪要";
  title: string;
  content: string;
  priority: "critical" | "high" | "normal";
  relatedStep: number; // which SOP step this maps to
  status: "pending" | "accepted" | "clarifying" | "resolved";
  date: string;
  from: string;
}

// ═══════════════════════════════════════════════════════════
// Demo Data — GRT-MILLISON-8800T
// ═══════════════════════════════════════════════════════════

const PROJECT = {
  id: "GRT-MILLISON-8800T",
  name: "美利信 8800T 超大型压铸岛输送系统",
  customer: "重庆美利信科技股份有限公司",
  status: "waiting_sign" as const,
};

// Equipment project status mapping from DB stage to UI status
const STAGE_TO_STATUS: Record<string, EquipmentProject["status"]> = {
  M7_Pre_Acceptance: "planning",
  M8_Installation: "in_progress",
  M10_Site_Installation: "commissioning",
  M9_Final_Acceptance: "commissioning",
  Completed: "completed",
};

const PROJECT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  planning: { label: "规划中", cls: "bg-gray-700/50 text-gray-400 border-gray-600" },
  in_progress: { label: "执行中", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  commissioning: { label: "联调中", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  completed: { label: "已交付", cls: "bg-green-500/10 text-green-400 border-green-500/30" },
  warranty: { label: "质保期", cls: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
};

const DEMO_STEPS: SopStep[] = [
  {
    key: "step-0",
    label: "联合指挥部结盟",
    labelEn: "Command HQ Alliance",
    timeline: "发货前 30 天",
    locked: false,
    completed: false,
    tasks: [
      {
        id: "00",
        label: "投产联合保障与权责矩阵签核",
        details: ["明确双方指挥官人选", "系统自动拉通联络网", "高层战略护航签核"],
        customerCommander: { role: "客户项目主理人/厂长", name: "", phone: "", title: "项目主理人", isGrt: false },
        grtCommander: { role: "GRT 交付总指挥", name: "倪亚东", phone: "188-xxxx-xxxx", title: "交付总指挥", isGrt: true },
        reportTo: "双方CEO/总经理",
        deliverable: "《零公里交付联合保障与权责矩阵》",
        safeguard: "未见双方高层签核，后续所有步骤锁定",
        grtSigned: false,
        customerSigned: false,
      },
    ],
  },
  {
    key: "step-1",
    label: "进场前置条件点亮",
    labelEn: "Pre-Entry Readiness",
    timeline: "发货前 15 天",
    locked: true,
    completed: false,
    tasks: [
      {
        id: "01",
        label: "现场基建与扫雷放行",
        details: ["确认 380V 水电气、地基承重达标", "平面物流防干涉排查、卸货吊装协调", "场地清场与动线规划"],
        customerCommander: { role: "厂务/设备主管", name: "", phone: "", title: "厂务主管", isGrt: false },
        grtCommander: { role: "交付统筹 PM", name: "李建国", phone: "138-xxxx-xxxx", title: "交付PM", isGrt: true },
        reportTo: "设备总监 / 生产副总",
        deliverable: "《场地与动线具备发货条件确认书》",
        safeguard: "未见高管在系统内亮绿灯，GRT 拒绝发车！杜绝场地不匹配扯皮",
        grtSigned: true,
        customerSigned: false,
      },
      {
        id: "02",
        label: "试产辅料与物料齐套",
        details: ["特定真空泵油、清洗剂、滤芯入库", "首批试产毛坯件及配套夹具调拨到线", "耗材型号核实"],
        customerCommander: { role: "生产/物料主管", name: "", phone: "", title: "物料主管", isGrt: false },
        grtCommander: { role: "工艺规划师", name: "张工", phone: "137-xxxx-xxxx", title: "工艺规划师", isGrt: true },
        reportTo: "生产副总 / 采购总监",
        deliverable: "《辅料与试产物料入库清单》",
        safeguard: "辅料未齐套，联调计划自动延期预警",
        grtSigned: true,
        customerSigned: false,
      },
    ],
  },
  {
    key: "step-2",
    label: "物理就位与硬装确权",
    labelEn: "Physical Install & Safety",
    timeline: "Day 0",
    locked: true,
    completed: false,
    tasks: [
      {
        id: "03",
        label: "卸货就位与安全合规",
        details: ["卸货就位、九位找平打表", "危险源共识、拉设警戒线", "EHS 安全宣誓与合规确认"],
        customerCommander: { role: "车间调度/现场安全员(EHS)", name: "", phone: "", title: "安全员", isGrt: false },
        grtCommander: { role: "装配督导", name: "王工", phone: "139-xxxx-xxxx", title: "装配督导", isGrt: true },
        reportTo: "EHS安全总监 / 车间主任",
        deliverable: "《设备 IQ 静态就位与安全告知确权书》",
        safeguard: "高压危险工况验证中，系统自动全员推送安全弹窗",
        grtSigned: false,
        customerSigned: false,
      },
    ],
  },
  {
    key: "step-3",
    label: "深水区攻坚：工艺联调",
    labelEn: "Joint Commissioning",
    timeline: "Day +1 ~ +7",
    locked: true,
    completed: false,
    tasks: [
      {
        id: "04",
        label: "非标深水区联调与参数打靶",
        details: ["黑匣子参数寻优记录", "清洁度达成要素逐项签批", "工艺参数优化轨迹及责任共担", "消灭单方面指责"],
        customerCommander: { role: "现场工艺员/质量检验员", name: "", phone: "", title: "工艺员", isGrt: false },
        grtCommander: { role: "资深工艺专家", name: "赵博", phone: "136-xxxx-xxxx", title: "工艺专家", isGrt: true },
        reportTo: "质量总监(QA) — 每天推送调机轨迹，把暗箱变透明",
        deliverable: "《工艺寻优轨迹曲线 & 首件打靶报告》",
        safeguard: "让最挑剔的人，提前在系统内签批认可当前参数基线",
        grtSigned: false,
        customerSigned: false,
      },
    ],
  },
  {
    key: "step-4",
    label: "能力武装与量产交钥匙",
    labelEn: "Capability Transfer",
    timeline: "Day +21",
    locked: true,
    completed: false,
    tasks: [
      {
        id: "05",
        label: "人员赋能与资产移交",
        details: ["换型SOP培训（3D动画指导书）", "日常PM点检表自动生成", "操作工独立上岗防呆考核（100分制）", "资产移交单签核"],
        customerCommander: { role: "车间班组长/一线操作工", name: "", phone: "", title: "班组长", isGrt: false },
        grtCommander: { role: "培训讲师", name: "刘工", phone: "135-xxxx-xxxx", title: "安全与培训师", isGrt: true },
        reportTo: "HR培训主管 / 生产厂长",
        deliverable: "《客户操作员上岗资质矩阵 & 资产移交单》",
        safeguard: "消除厂长'买了机器没人会开'的恐惧",
        grtSigned: false,
        customerSigned: false,
      },
    ],
  },
  {
    key: "step-5",
    label: "M12 终局验收签字",
    labelEn: "Final Sign-off",
    timeline: "M12",
    locked: true,
    completed: false,
    tasks: [
      {
        id: "06",
        label: "综合全周期表现，触发财务结案",
        details: ["前4阶段评委已全部签批", "全景履历书自动生成", "尾款触发财务结案流程"],
        customerCommander: { role: "终极验收大 Boss", name: "", phone: "", title: "张总", isGrt: false },
        grtCommander: { role: "战区总指挥", name: "倪亚东", phone: "188-xxxx-xxxx", title: "交付总指挥", isGrt: true },
        reportTo: "双方最高层",
        deliverable: "《GRT 零公里交付全景履历书》",
        safeguard: "水到渠成：前4个阶段的评委都已点赞，终验秒过，尾款秒批",
        grtSigned: false,
        customerSigned: false,
      },
    ],
  },
];

const DEMO_AGENT_MESSAGES: AgentMessage[] = [
  { id: 1, type: "alert", text: "尊敬的客户，距离设备进场仅剩 3 天，系统检测到【真空泵油型号 LVO130】尚未确认入库。为避免停工待料，请尽快核实。", time: "10:30" },
  { id: 2, type: "safety", text: "高压危险工况验证中，请确认已拉设警戒线并穿戴防护服。Step 2 安全宣誓待签核。", time: "09:15" },
  { id: 3, type: "remind", text: "Step 1 厂务主管尚未在系统内确认 380V 电源接通。请提醒张三主管尽快操作，否则发货计划将自动延期。", time: "昨天" },
  { id: 4, type: "info", text: "《场地与动线具备发货条件确认书》已由 GRT 李建国签核，等待客户侧确认。", time: "3天前" },
];

// ═══════════════════════════════════════════════════════════
// Demo Data — Customer Pre-Acceptance Requirements
// ═══════════════════════════════════════════════════════════

const DEMO_CUSTOMER_REQUIREMENTS: CustomerRequirement[] = [
  {
    id: "REQ-001",
    source: "技术标书",
    title: "清洁度要求: 冲头区域颗粒物 ≤ 50μm",
    content: "参考美利信技术标书 TS-8800-REV03 第 7.3 节：冲头区域清洁度等级须达到 ISO 16232 Level-6 (≤50μm)，验收前须连续 3 批 Cpk ≥ 1.67。",
    priority: "critical",
    relatedStep: 3,
    status: "accepted",
    date: "2026-01-15",
    from: "张工 (美利信技术负责人)",
  },
  {
    id: "REQ-002",
    source: "客户邮件",
    title: "换型时间不超过 45 分钟 (A→B 夹具)",
    content: "美利信生产部王总 2026-02-03 邮件要求：A→B 夹具换型全流程（含加热+首件检验）不超过 45min。超时需提交改善方案。",
    priority: "high",
    relatedStep: 4,
    status: "accepted",
    date: "2026-02-03",
    from: "王总 (美利信生产副总)",
  },
  {
    id: "REQ-003",
    source: "微信记录",
    title: "进场日期调整至 3 月 20 日",
    content: "因车间地坪改造延期，客户厂务主管微信沟通要求进场日期从 3/10 调整至 3/20，吊装行车需提前 3 天预约。",
    priority: "high",
    relatedStep: 1,
    status: "resolved",
    date: "2026-02-28",
    from: "陈主管 (美利信厂务)",
  },
  {
    id: "REQ-004",
    source: "会议纪要",
    title: "操作工培训须覆盖夜班 2 组 (共 8 人)",
    content: "2026-02-20 项目启动会纪要第 5 条：培训须覆盖白/夜班共 4 组操作工，其中夜班 2 组 (8人) 需单独安排培训时段。",
    priority: "normal",
    relatedStep: 4,
    status: "pending",
    date: "2026-02-20",
    from: "李经理 (美利信生产调度)",
  },
  {
    id: "REQ-005",
    source: "技术标书",
    title: "喷淋系统压力稳定性 ±0.2bar 以内",
    content: "技术标书附件 A-12：喷淋系统在量产负载下压力波动须控制在 ±0.2bar 以内，连续运行 72h 无报警。与 Step 3 联调参数直接相关。",
    priority: "critical",
    relatedStep: 3,
    status: "clarifying",
    date: "2026-01-15",
    from: "张工 (美利信技术负责人)",
  },
  {
    id: "REQ-006",
    source: "现场口头",
    title: "设备基座螺栓须使用 12.9 级高强度",
    content: "2026-03-01 现场勘察时客户 EHS 口头要求：8800T 机台基座固定螺栓须使用 12.9 级高强度螺栓，并提供扭矩检测报告。",
    priority: "normal",
    relatedStep: 2,
    status: "accepted",
    date: "2026-03-01",
    from: "安全主管 (美利信 EHS)",
  },
];

const REQ_SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  "技术标书": { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400" },
  "客户邮件": { bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400" },
  "微信记录": { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400" },
  "会议纪要": { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400" },
  "现场口头": { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400" },
};

const REQ_PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "关键" },
  high: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "重要" },
  normal: { bg: "bg-gray-700/50 border-gray-600", text: "text-gray-400", label: "一般" },
};

const REQ_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "待确认" },
  accepted: { bg: "bg-green-500/10", text: "text-green-400", label: "已采纳" },
  clarifying: { bg: "bg-blue-500/10", text: "text-blue-400", label: "澄清中" },
  resolved: { bg: "bg-gray-700/50", text: "text-gray-500", label: "已关闭" },
};

// ═══════════════════════════════════════════════════════════
// Step status helpers
// ═══════════════════════════════════════════════════════════

function getStepStatus(step: SopStep): "locked" | "active" | "completed" {
  if (step.completed) return "completed";
  if (step.locked) return "locked";
  return "active";
}

const STEP_COLORS = {
  locked: { bg: "bg-gray-800/50", text: "text-gray-500", border: "border-gray-700/30", icon: "text-gray-600" },
  active: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30", icon: "text-cyan-400" },
  completed: { bg: "bg-green-500/10", text: "text-green-300", border: "border-green-500/30", icon: "text-green-400" },
};

const MSG_STYLES: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }>; cls: string }> = {
  alert: { icon: AlertCircle, cls: "border-red-500/30 bg-red-500/5 text-red-300" },
  safety: { icon: Siren, cls: "border-orange-500/30 bg-orange-500/5 text-orange-300" },
  remind: { icon: Clock, cls: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300" },
  info: { icon: Info, cls: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300" },
};

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function SiteDeliverySandbox() {
  const [steps] = useState(DEMO_STEPS);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const { shortcutOverlayOpen, setShortcutOverlayOpen, shortcuts, lastSaved, isSaving } = useSandboxPageEnhancements({
    sandboxShortcuts: [],
    autoSave: {
      data: { activeStepIdx },
      onSave: async (d) => { localStorage.setItem("grt-sb-delivery", JSON.stringify(d)); },
    },
  });
  const [agentInput, setAgentInput] = useState("");
  const [showAllReqs, setShowAllReqs] = useState(false);

  // ── tRPC queries — delivery list as equipment projects ──
  const deliveryListQuery = (trpc.m7m9 as any).delivery.list.useQuery(
    { page: 1, pageSize: 50 },
    { refetchOnWindowFocus: false }
  );

  // Map DB delivery rows → EquipmentProject shape for UI
  const equipProjects: EquipmentProject[] = useMemo(() => {
    if (!deliveryListQuery.data?.items) return [];
    return deliveryListQuery.data.items.map((row: any) => ({
      id: String(row.id),
      code: row.projectNo ?? row.deliveryCode ?? "",
      name: row.customerName ? `${row.customerName} — ${row.projectNo}` : row.projectNo ?? "",
      status: STAGE_TO_STATUS[row.currentStage] ?? "planning",
      deliveryDate: row.plannedM7Date
        ? new Date(row.plannedM7Date).toISOString().slice(0, 10)
        : "",
    }));
  }, [deliveryListQuery.data]);

  // ── tRPC queries — SAT records as service evaluations ──
  // We fetch the first delivery's SAT as evaluation source
  const firstDeliveryId = deliveryListQuery.data?.items?.[0]?.id;
  const satQuery = (trpc.m7m9 as any).sat.getByDelivery.useQuery(
    { deliveryId: Number(firstDeliveryId) },
    { enabled: !!firstDeliveryId, refetchOnWindowFocus: false }
  );

  // Map SAT records to ServiceEvaluation shape
  const evaluations: ServiceEvaluation[] = useMemo(() => {
    if (!satQuery.data) return [];
    const sat = satQuery.data;
    const results: ServiceEvaluation[] = [];
    if (sat.overallTestResult) {
      results.push({
        id: `SAT-${sat.id}`,
        category: "SAT 验收测试",
        content: `整体测试结果: ${sat.overallTestResult}. 通过: ${sat.testPassCount ?? 0}, 未通过: ${sat.testFailCount ?? 0}, 总计: ${sat.testTotalCount ?? 0}. Punch List 待处理: ${sat.punchListOpenCount ?? 0}`,
        rating: sat.overallTestResult === "pass" ? 5 : sat.overallTestResult === "conditional_pass" ? 3 : 1,
        evaluator: sat.customerFinalSignoffName ?? "待签核",
        date: sat.updatedAt ? new Date(sat.updatedAt).toISOString().slice(0, 10) : "",
      });
    }
    if (sat.approvalStatus) {
      results.push({
        id: `SAT-APPROVAL-${sat.id}`,
        category: "SAT 审批状态",
        content: `审批结果: ${sat.approvalStatus}. 审批人: ${sat.approvedByName ?? "N/A"}`,
        rating: sat.approvalStatus === "approved" ? 5 : sat.approvalStatus === "conditional" ? 4 : 2,
        evaluator: sat.approvedByName ?? "系统",
        date: sat.approvedAt ? new Date(sat.approvedAt).toISOString().slice(0, 10) : "",
      });
    }
    return results;
  }, [satQuery.data]);

  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectDraft, setEditProjectDraft] = useState<EquipmentProject | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState<EquipmentProject>({
    id: "", code: "", name: "", status: "planning", deliveryDate: "",
  });

  // ── Service evaluation local edit state ──
  const [editingEval, setEditingEval] = useState<string | null>(null);
  const [showAddEval, setShowAddEval] = useState(false);
  const [newEval, setNewEval] = useState<ServiceEvaluation>({
    id: "", category: "", content: "", rating: 5, evaluator: "", date: "",
  });

  // ── Active panel toggle (for center column) ──
  const [activePanel, setActivePanel] = useState<"sop" | "evaluation">("sop");

  const activeStep = steps[activeStepIdx];

  // Filter requirements related to current step, or show all
  const filteredReqs = useMemo(() => {
    if (showAllReqs) return DEMO_CUSTOMER_REQUIREMENTS;
    return DEMO_CUSTOMER_REQUIREMENTS.filter(r => r.relatedStep === activeStepIdx);
  }, [activeStepIdx, showAllReqs]);

  // ── tRPC mutations — delivery CRUD ──
  const createDeliveryMut = (trpc.m7m9 as any).delivery.create.useMutation({
    onSuccess: (data: any) => {
      toast.success(`交付项目已创建: ${data.deliveryCode}`);
      deliveryListQuery.refetch();
      setShowAddProject(false);
      setNewProject({ id: "", code: "", name: "", status: "planning", deliveryDate: "" });
    },
    onError: (err: any) => {
      toast.error(`创建失败: ${err.message}`);
    },
  });

  const updateDeliveryMut = (trpc.m7m9 as any).delivery.update.useMutation({
    onSuccess: () => {
      toast.success("交付项目已更新");
      deliveryListQuery.refetch();
      setEditingProject(null);
    },
    onError: (err: any) => {
      toast.error(`更新失败: ${err.message}`);
    },
  });

  const deleteDeliveryMut = (trpc.m7m9 as any).delivery.delete.useMutation({
    onSuccess: () => {
      toast.success("交付项目已取消");
      deliveryListQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(`删除失败: ${err.message}`);
    },
  });

  // ── tRPC mutations — SAT (evaluation persistence) ──
  const createSatMut = (trpc.m7m9 as any).sat.create.useMutation({
    onSuccess: (data: any) => {
      toast.success(`SAT 记录已创建: ${data.satCode}`);
      satQuery.refetch();
      setShowAddEval(false);
      setNewEval({ id: "", category: "", content: "", rating: 5, evaluator: "", date: "" });
    },
    onError: (err: any) => {
      toast.error(`SAT 创建失败: ${err.message}`);
    },
  });

  const customerSignoffMut = (trpc.m7m9 as any).sat.recordCustomerSignoff.useMutation({
    onSuccess: () => {
      toast.success("客户签核已记录");
      satQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(`签核失败: ${err.message}`);
    },
  });

  // ── Project CRUD handlers (wired to tRPC) ──
  const addProject = useCallback(() => {
    if (!newProject.code || !newProject.name) return;
    createDeliveryMut.mutate({
      projectId: Date.now(), // synthetic project ID
      projectNo: newProject.code,
      customerName: newProject.name,
      plannedM7Date: newProject.deliveryDate || undefined,
    });
  }, [newProject, createDeliveryMut]);

  const removeProject = useCallback((id: string) => {
    deleteDeliveryMut.mutate({ id: Number(id) });
  }, [deleteDeliveryMut]);

  const updateProject = useCallback((id: string, patch: Partial<EquipmentProject>) => {
    // Optimistic local state not needed since we refetch; persist to DB on save
    const updates: Record<string, any> = { id: Number(id) };
    if (patch.name !== undefined) updates.customerName = patch.name;
    if (patch.deliveryDate !== undefined) updates.plannedM7Date = patch.deliveryDate;
    if (patch.code !== undefined) updates.specialRequirements = `code:${patch.code}`;
    updateDeliveryMut.mutate(updates);
  }, [updateDeliveryMut]);

  // ── Evaluation CRUD (SAT-based) ──
  const addEvaluation = useCallback(() => {
    if (!newEval.category || !newEval.content) return;
    if (!firstDeliveryId) {
      toast.error("尚无交付项目，无法创建评价");
      return;
    }
    createSatMut.mutate({
      deliveryId: Number(firstDeliveryId),
    });
  }, [newEval, firstDeliveryId, createSatMut]);

  const removeEvaluation = useCallback((_id: string) => {
    toast.info("SAT 记录不可直接删除，请通过审批流程处理");
  }, []);

  const updateEvaluation = useCallback((id: string, _patch: Partial<ServiceEvaluation>) => {
    // SAT records are updated via specific procedures (recordTestResult, etc.)
    // For signoff, use the customerSignoff mutation
    const satId = id.replace("SAT-", "").replace("APPROVAL-", "");
    if (_patch.evaluator) {
      customerSignoffMut.mutate({
        satId: Number(satId),
        customerName: _patch.evaluator,
      });
    }
  }, [customerSignoffMut]);

  // Loading state
  const isLoading = deliveryListQuery.isLoading || satQuery.isLoading;

  return (
    <div className="h-full flex flex-col bg-[#080c14] text-gray-200 overflow-hidden">
      <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} commonShortcuts={shortcuts.commonShortcuts} sandboxShortcuts={shortcuts.sandboxShortcuts} sandboxTitle="现场交付" />
      <SandboxEventFlowPanel sandboxId="acceptance-tracking" className="mx-4 mt-2" />

      {/* ── Global loading overlay ── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#080c14]/80 flex items-center justify-center">
          <div className="flex items-center gap-3 text-cyan-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">加载交付数据...</span>
          </div>
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-800 bg-[#0a0f18]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-mono">{PROJECT.id}</span>
              <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-[10px]">
                待双方高层与专员签核
              </Badge>
              <Lock className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <h1 className="text-sm font-bold text-gray-100 mt-1">
              {PROJECT.name} — 顺利投产联合保障与权责矩阵
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              核心目标：明确零公里交付双边责任，杜绝现场推诿，保障设备一次性联调合格并准时投产
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500">{PROJECT.customer}</p>
            <p className="text-[10px] text-gray-600">基于 GRT System 底层防篡改验证</p>
          </div>
        </div>
        {/* Panel toggle tabs */}
        <div className="flex items-center gap-1 mt-3 border-t border-gray-800/50 pt-2">
          {([
            { key: "sop" as const, label: "交付联调 SOP", icon: Target },
            { key: "evaluation" as const, label: "客户服务评价 & 设备项目", icon: ThumbsUp },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActivePanel(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                activePanel === tab.key
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 border border-transparent"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] text-gray-600">
            设备项目: {equipProjects.length} 台 · 服务评价: {evaluations.length} 条
          </span>
        </div>
      </div>

      {/* ── Three-column layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* ══ LEFT: SOP Stepper ══ */}
        <aside className="w-[220px] shrink-0 border-r border-gray-800 bg-[#0a0f18] overflow-y-auto">
          <div className="p-3 border-b border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">联合作战向导</p>
            <p className="text-[10px] text-gray-600">通关六大战役 — 逐步点亮</p>
          </div>
          <div className="p-2 space-y-1">
            {steps.map((step, idx) => {
              const status = getStepStatus(step);
              const colors = STEP_COLORS[status];
              const isActive = idx === activeStepIdx;
              const StepIcon = status === "completed" ? CheckCircle2 : status === "locked" ? Lock : Circle;
              return (
                <button
                  key={step.key}
                  onClick={() => !step.locked && setActiveStepIdx(idx)}
                  disabled={step.locked}
                  className={cn(
                    "w-full text-left rounded-lg p-2.5 transition-all border",
                    isActive ? `${colors.bg} ${colors.border} ring-1 ring-cyan-500/20` : `border-transparent hover:bg-gray-800/30`,
                    step.locked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <StepIcon className={cn("h-4 w-4 mt-0.5 shrink-0", colors.icon)} />
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium", isActive ? colors.text : "text-gray-400")}>
                        Step {idx}: {step.label}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{step.timeline}</p>
                      {step.locked && idx > 0 && (
                        <p className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> 待前置任务完成
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress summary */}
          <div className="p-3 border-t border-gray-800 mt-auto">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1.5">
              <span>总体进度</span>
              <span>{steps.filter(s => s.completed).length} / {steps.length}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* ══ CENTER: Workspace ══ */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ═══ EVALUATION & PROJECTS PANEL ═══ */}
          {activePanel === "evaluation" && (
            <>
              {/* ── Equipment Projects (Dynamic List) ── */}
              <div className="rounded-xl border border-cyan-500/20 bg-[#0d1321] overflow-hidden">
                <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-cyan-300">设备项目台账</h3>
                      <p className="text-[10px] text-gray-500">
                        {PROJECT.customer} — 共 {equipProjects.length} 个设备项目
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1 bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={() => setShowAddProject(true)}
                  >
                    <Plus className="h-3 w-3" /> 添加项目
                  </Button>
                </div>

                {/* Add project form */}
                {showAddProject && (
                  <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5 space-y-3">
                    <p className="text-xs text-cyan-400 font-medium">新增设备项目</p>
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        placeholder="项目编码 (如 GRT-MILLISON-XXX)"
                        value={newProject.code}
                        onChange={e => setNewProject(p => ({ ...p, code: e.target.value }))}
                        className="h-8 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600 col-span-1"
                      />
                      <Input
                        placeholder="项目名称"
                        value={newProject.name}
                        onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                        className="h-8 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600 col-span-1"
                      />
                      <select
                        value={newProject.status}
                        onChange={e => setNewProject(p => ({ ...p, status: e.target.value as EquipmentProject["status"] }))}
                        className="h-8 text-xs bg-transparent border border-gray-700 text-gray-300 rounded-md px-2"
                      >
                        <option value="planning">规划中</option>
                        <option value="in_progress">执行中</option>
                        <option value="commissioning">联调中</option>
                        <option value="completed">已交付</option>
                        <option value="warranty">质保期</option>
                      </select>
                      <Input
                        type="date"
                        value={newProject.deliveryDate}
                        onChange={e => setNewProject(p => ({ ...p, deliveryDate: e.target.value }))}
                        className="h-8 text-xs bg-transparent border-gray-700 text-gray-300 col-span-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={addProject} disabled={createDeliveryMut.isPending}>
                        {createDeliveryMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 确认添加
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-gray-500" onClick={() => setShowAddProject(false)}>
                        <X className="h-3 w-3" /> 取消
                      </Button>
                    </div>
                  </div>
                )}

                {/* Project table */}
                {deliveryListQuery.isLoading ? (
                  <div className="p-6 text-center text-gray-600 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 加载交付项目...
                  </div>
                ) : equipProjects.length === 0 ? (
                  <div className="p-6 text-center text-gray-600 text-xs">
                    暂无交付项目，点击上方"添加项目"创建
                  </div>
                ) : (
                <div className="divide-y divide-gray-800/50">
                  {equipProjects.map((proj) => {
                    const st = PROJECT_STATUS_LABELS[proj.status];
                    const isEditing = editingProject === proj.id;
                    const draft = isEditing && editProjectDraft ? editProjectDraft : proj;
                    return (
                      <div key={proj.id} className="p-4 hover:bg-gray-800/20 transition-colors">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                value={draft.code}
                                onChange={e => setEditProjectDraft(d => d ? { ...d, code: e.target.value } : d)}
                                className="h-8 text-xs bg-transparent border-gray-700 text-gray-300"
                              />
                              <Input
                                value={draft.name}
                                onChange={e => setEditProjectDraft(d => d ? { ...d, name: e.target.value } : d)}
                                className="h-8 text-xs bg-transparent border-gray-700 text-gray-300"
                              />
                              <select
                                value={draft.status}
                                onChange={e => setEditProjectDraft(d => d ? { ...d, status: e.target.value as EquipmentProject["status"] } : d)}
                                className="h-8 text-xs bg-transparent border border-gray-700 text-gray-300 rounded-md px-2"
                              >
                                <option value="planning">规划中</option>
                                <option value="in_progress">执行中</option>
                                <option value="commissioning">联调中</option>
                                <option value="completed">已交付</option>
                                <option value="warranty">质保期</option>
                              </select>
                              <Input
                                type="date"
                                value={draft.deliveryDate}
                                onChange={e => setEditProjectDraft(d => d ? { ...d, deliveryDate: e.target.value } : d)}
                                className="h-8 text-xs bg-transparent border-gray-700 text-gray-300"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white"
                                disabled={updateDeliveryMut.isPending}
                                onClick={() => {
                                  if (!editProjectDraft) return;
                                  updateProject(proj.id, {
                                    name: editProjectDraft.name,
                                    deliveryDate: editProjectDraft.deliveryDate,
                                    code: editProjectDraft.code,
                                  });
                                }}
                              >
                                {updateDeliveryMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 保存
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-gray-500" onClick={() => { setEditingProject(null); setEditProjectDraft(null); }}>
                                <X className="h-3 w-3" /> 取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <span className="text-[10px] font-mono text-gray-500 w-16 shrink-0">{proj.id}</span>
                              <span className="text-xs font-mono text-cyan-400 w-44 shrink-0">{proj.code}</span>
                              <span className="text-xs text-gray-300 truncate">{proj.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-gray-500">{proj.deliveryDate}</span>
                              <Badge className={cn("text-[10px]", st?.cls ?? "bg-gray-700/50 text-gray-400 border-gray-600")}>{st?.label ?? proj.status}</Badge>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-600 hover:text-cyan-400" onClick={() => { setEditingProject(proj.id); setEditProjectDraft({ ...proj }); }}>
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-gray-600 hover:text-red-400"
                                  disabled={deleteDeliveryMut.isPending}
                                  onClick={() => removeProject(proj.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* ── Customer Service Evaluations ── */}
              <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-[#0d1321] to-[#1a1508] overflow-hidden">
                <div className="p-4 border-b border-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <ThumbsUp className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-300">客户服务评价</h3>
                      <p className="text-[10px] text-gray-500">
                        来自 {PROJECT.customer} 的分服务评价 — 共 {evaluations.length} 条
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                    onClick={() => setShowAddEval(true)}
                  >
                    <Plus className="h-3 w-3" /> 添加评价
                  </Button>
                </div>

                {/* Add evaluation form */}
                {showAddEval && (
                  <div className="p-4 border-b border-amber-500/10 bg-amber-500/5 space-y-3">
                    <p className="text-xs text-amber-400 font-medium">新增客户评价</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="评价类别 (如: 现场服务质量)"
                        value={newEval.category}
                        onChange={e => setNewEval(ev => ({ ...ev, category: e.target.value }))}
                        className="h-8 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600"
                      />
                      <Input
                        placeholder="评价人 (如: 美利信项目组)"
                        value={newEval.evaluator}
                        onChange={e => setNewEval(ev => ({ ...ev, evaluator: e.target.value }))}
                        className="h-8 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">评分:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button
                              key={s}
                              onClick={() => setNewEval(ev => ({ ...ev, rating: s as ServiceEvaluation["rating"] }))}
                              className={cn("p-0.5", s <= newEval.rating ? "text-amber-400" : "text-gray-600")}
                            >
                              <Star className="h-4 w-4" fill={s <= newEval.rating ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <textarea
                      placeholder="评价内容..."
                      value={newEval.content}
                      onChange={e => setNewEval(ev => ({ ...ev, content: e.target.value }))}
                      rows={3}
                      className="w-full text-xs bg-transparent border border-gray-700 text-gray-300 placeholder:text-gray-600 rounded-md p-2 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-[10px] gap-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={addEvaluation} disabled={createSatMut.isPending}>
                        {createSatMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} 确认添加
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-gray-500" onClick={() => setShowAddEval(false)}>
                        <X className="h-3 w-3" /> 取消
                      </Button>
                    </div>
                  </div>
                )}

                {/* Evaluation cards */}
                {satQuery.isLoading ? (
                  <div className="p-6 text-center text-gray-600 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 加载评价数据...
                  </div>
                ) : evaluations.length === 0 ? (
                  <div className="p-6 text-center text-gray-600 text-xs">
                    暂无 SAT 评价记录
                  </div>
                ) : (
                <div className="divide-y divide-gray-800/50">
                  {evaluations.map((ev) => {
                    const isEditing = editingEval === ev.id;
                    return (
                      <div key={ev.id} className="p-5 hover:bg-gray-800/10 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-mono text-gray-500">{ev.id}</span>
                              {isEditing ? (
                                <Input
                                  value={ev.category}
                                  onChange={e => updateEvaluation(ev.id, { category: e.target.value })}
                                  className="h-7 text-xs bg-transparent border-gray-700 text-amber-300 w-48"
                                />
                              ) : (
                                <span className="text-xs font-medium text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                  {ev.category}
                                </span>
                              )}
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <button
                                    key={s}
                                    disabled={!isEditing}
                                    onClick={() => isEditing && updateEvaluation(ev.id, { rating: s as ServiceEvaluation["rating"] })}
                                    className={cn(
                                      "p-0",
                                      s <= ev.rating ? "text-amber-400" : "text-gray-600",
                                      isEditing && "cursor-pointer hover:scale-110"
                                    )}
                                  >
                                    <Star className="h-3.5 w-3.5" fill={s <= ev.rating ? "currentColor" : "none"} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            {isEditing ? (
                              <textarea
                                value={ev.content}
                                onChange={e => updateEvaluation(ev.id, { content: e.target.value })}
                                rows={3}
                                className="w-full text-sm bg-transparent border border-gray-700 text-gray-200 rounded-md p-2 resize-none leading-relaxed"
                              />
                            ) : (
                              <p className="text-sm text-gray-200 leading-relaxed pl-1 border-l-2 border-amber-500/30 ml-1">
                                {ev.content}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
                              {isEditing ? (
                                <>
                                  <Input
                                    value={ev.evaluator}
                                    onChange={e => updateEvaluation(ev.id, { evaluator: e.target.value })}
                                    className="h-6 text-[10px] bg-transparent border-gray-700 text-gray-400 w-36"
                                    placeholder="评价人"
                                  />
                                  <Input
                                    type="date"
                                    value={ev.date}
                                    onChange={e => updateEvaluation(ev.id, { date: e.target.value })}
                                    className="h-6 text-[10px] bg-transparent border-gray-700 text-gray-400 w-36"
                                  />
                                </>
                              ) : (
                                <>
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ev.evaluator}</span>
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.date}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {isEditing ? (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:text-green-300" onClick={() => setEditingEval(null)}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-600 hover:text-amber-400" onClick={() => setEditingEval(ev.id)}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-600 hover:text-red-400" onClick={() => removeEvaluation(ev.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </>
          )}

          {/* ═══ SOP PANEL (original content) ═══ */}
          {activePanel === "sop" && (<>

          {/* Step header */}
          <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                    Step {activeStepIdx}
                  </span>
                  <h2 className="text-base font-bold text-gray-100">{activeStep.label}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">{activeStep.labelEn} — {activeStep.timeline}</p>
              </div>
              <Badge className={activeStep.locked
                ? "bg-gray-700/50 text-gray-400 border-gray-600"
                : activeStep.completed
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
              }>
                {activeStep.locked ? "锁定" : activeStep.completed ? "已完成" : "进行中"}
              </Badge>
            </div>
          </div>

          {/* ── Customer Pre-Acceptance Requirements Panel ── */}
          <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-[#0d1321] to-[#0f0d21] overflow-hidden">
            <div className="p-4 border-b border-indigo-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <Inbox className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-300">客户预验收需求承接</h3>
                  <p className="text-[10px] text-gray-500">
                    汇聚客户技术标书、邮件、现场口头等全渠道要求 — {DEMO_CUSTOMER_REQUIREMENTS.length} 项需求 · {DEMO_CUSTOMER_REQUIREMENTS.filter(r => r.status === "pending").length} 项待确认
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-7 text-[10px] gap-1",
                    showAllReqs
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-transparent border-gray-700 text-gray-500 hover:text-gray-300"
                  )}
                  onClick={() => setShowAllReqs(!showAllReqs)}
                >
                  <Filter className="h-3 w-3" />
                  {showAllReqs ? "全部需求" : `Step ${activeStepIdx} 相关`}
                </Button>
              </div>
            </div>

            {filteredReqs.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-xs">
                当前步骤暂无关联的客户需求
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {filteredReqs.map((req) => {
                  const srcStyle = REQ_SOURCE_STYLES[req.source] ?? REQ_SOURCE_STYLES["现场口头"];
                  const priStyle = REQ_PRIORITY_STYLES[req.priority];
                  const statStyle = REQ_STATUS_STYLES[req.status];
                  return (
                    <div key={req.id} className="p-4 hover:bg-gray-800/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-[10px] font-mono text-gray-500">{req.id}</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", srcStyle.bg, srcStyle.text)}>
                              {req.source}
                            </span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", priStyle.bg, priStyle.text)}>
                              {priStyle.label}
                            </span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded", statStyle.bg, statStyle.text)}>
                              {statStyle.label}
                            </span>
                            {!showAllReqs ? null : (
                              <span className="text-[9px] text-gray-600">→ Step {req.relatedStep}</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-200">{req.title}</p>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{req.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{req.from}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{req.date}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-600 hover:text-indigo-400 shrink-0"
                          title="查看原始文档"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Task cards — the RACI matrix */}
          {activeStep.tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-gray-800 bg-[#0d1321] overflow-hidden">

              {/* Task header */}
              <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    {task.id}. {task.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded border",
                      task.grtSigned ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-gray-800 text-gray-500 border-gray-700"
                    )}>
                      GRT: {task.grtSigned ? "已签" : "待签"}
                    </span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded border",
                      task.customerSigned ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    )}>
                      客户: {task.customerSigned ? "已签" : "待签核"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {task.details.map((d, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Two-column: Customer + GRT commanders */}
              <div className="grid grid-cols-2 divide-x divide-gray-800/50">

                {/* Customer side */}
                <div className="p-4 space-y-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="h-3 w-3" />
                    客户侧：现场输入与支持专员
                  </p>
                  <div className="rounded-lg bg-[#080c14] border border-gray-800 p-3 space-y-2">
                    <p className="text-[10px] text-gray-500">{task.customerCommander.role}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-gray-500" />
                        <Input
                          placeholder="输入姓名"
                          defaultValue={task.customerCommander.name}
                          className="h-7 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-500" />
                        <Input
                          placeholder="输入电话"
                          defaultValue={task.customerCommander.phone}
                          className="h-7 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <ArrowRight className="h-3 w-3 text-cyan-500" />
                    <span>汇报给: <span className="text-gray-400">{task.reportTo}</span></span>
                  </div>
                </div>

                {/* GRT side */}
                <div className="p-4 space-y-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-cyan-500" />
                    GRT侧：主责指挥官
                  </p>
                  <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3 space-y-1.5">
                    <p className="text-[10px] text-cyan-400">{task.grtCommander.role}</p>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3.5 w-3.5 text-cyan-500" />
                      <span className="text-sm font-medium text-cyan-300">{task.grtCommander.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-cyan-500" />
                      <span className="text-xs text-cyan-400 font-mono">{task.grtCommander.phone}</span>
                      <span className="text-[9px] text-gray-500">(企微直连)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliverable + Safeguard */}
              <div className="p-4 border-t border-gray-800/50 grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">系统交付物</p>
                    <p className="text-xs text-cyan-300 mt-0.5">{task.deliverable}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Siren className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">防呆机制</p>
                    <p className="text-xs text-orange-300 mt-0.5">{task.safeguard}</p>
                  </div>
                </div>
              </div>

              {/* Sign buttons */}
              <div className="p-4 border-t border-gray-800/50 bg-[#080c14] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "text-xs gap-1.5",
                      task.grtSigned
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800"
                    )}
                    disabled={task.grtSigned}
                  >
                    {task.grtSigned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Pen className="h-3.5 w-3.5" />}
                    GRT 签核
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "text-xs gap-1.5",
                      task.customerSigned
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-transparent border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    )}
                    disabled={task.customerSigned}
                  >
                    {task.customerSigned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Fingerprint className="h-3.5 w-3.5" />}
                    客户签核 (短信验证码)
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <Lock className="h-3 w-3" />
                  防篡改 · 时间戳锁账
                </div>
              </div>
            </div>
          ))}

          {/* Contextual workspace widgets based on step */}
          {activeStepIdx === 1 && (
            <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#0d1321] to-[#0a1628] p-5 space-y-3">
              <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                双向确认联名检查单 (E-Checklist)
              </h3>
              <p className="text-[10px] text-gray-500">客户现场主管在系统里打勾确认，绿灯亮起，GRT 才安排发货</p>
              <div className="space-y-2">
                {["380V 三相电源已接通并验证", "压缩空气管路已铺设到位 (≥6bar)", "冷却水循环系统已就绪", "地基承重已通过第三方检测", "设备卸货通道已清理 (宽≥3m, 高≥4m)", "吊装设备已预约 (≥25T 行车)", "试产毛坯件 50 件已到线边", "真空泵油 LVO130 已入库"].map((item, i) => (
                  <label key={i} className="flex items-center gap-3 rounded-lg border border-gray-700/50 bg-[#080c14] p-2.5 hover:bg-gray-800/30 transition-colors cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-transparent accent-cyan-500" />
                    <span className="text-sm text-gray-300">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeStepIdx === 3 && (
            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-[#0d1321] to-[#140a28] p-5 space-y-3">
              <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                工艺爬坡黑匣子看板
              </h3>
              <p className="text-[10px] text-gray-500">
                记录从第一次开机到达标期间，每次参数调整的完整轨迹 — 把苦劳变成可见的功劳
              </p>
              <div className="rounded-lg bg-[#080c14] border border-gray-800 p-4">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                  <span>喷淋压力 / 水温 / Cpk 趋势</span>
                  <span>Day 1 → Day 7</span>
                </div>
                {/* Simulated chart bars */}
                <div className="space-y-3">
                  {[
                    { label: "喷淋压力 (bar)", values: [3.2, 3.8, 4.1, 4.0, 4.2, 4.2, 4.2], target: 4.2 },
                    { label: "水温 (°C)", values: [45, 48, 52, 55, 55, 55, 55], target: 55 },
                    { label: "清洁度 Cpk", values: [0.8, 1.1, 1.3, 1.5, 1.6, 1.67, 1.72], target: 1.67 },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-gray-400">{metric.label}</span>
                        <span className="text-cyan-400">目标: {metric.target}</span>
                      </div>
                      <div className="flex gap-1 h-6">
                        {metric.values.map((v, i) => {
                          const pct = (v / (metric.target * 1.2)) * 100;
                          const hit = v >= metric.target;
                          return (
                            <div key={i} className="flex-1 bg-gray-800 rounded-sm overflow-hidden relative">
                              <div
                                className={cn("absolute bottom-0 left-0 right-0 rounded-sm transition-all", hit ? "bg-green-500/60" : "bg-cyan-500/40")}
                                style={{ height: `${Math.min(pct, 100)}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-300 font-mono">{v}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-600 mt-0.5">
                        {["D1", "D2", "D3", "D4", "D5", "D6", "D7"].map(d => <span key={d}>{d}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStepIdx === 4 && (
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-[#0d1321] to-[#1a1508] p-5 space-y-3">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                沉浸式数字资产库 & 上岗考核
              </h3>
              <p className="text-[10px] text-gray-500">客户可直接预览、下载专属于这台机器的 3D 换型动画 SOP、日常保养点检表</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "3D 换型指导书 SOP (A→B夹具)", type: "video", size: "28 MB" },
                  { label: "日常保养点检表模板", type: "excel", size: "156 KB" },
                  { label: "设备操作手册 (带二维码)", type: "pdf", size: "12 MB" },
                  { label: "安全操作规范 & 危险源清单", type: "pdf", size: "3.2 MB" },
                ].map((asset, i) => (
                  <div key={i} className="rounded-lg border border-gray-700/50 bg-[#080c14] p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{asset.label}</p>
                      <p className="text-[10px] text-gray-600">{asset.type.toUpperCase()} · {asset.size}</p>
                    </div>
                    <Download className="h-4 w-4 text-gray-500 hover:text-cyan-400 cursor-pointer shrink-0" />
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-300 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  操作工防呆闭卷考试: 100分满分制 — 合格才具备独立上岗 PM 能力
                </p>
              </div>
            </div>
          )}

          </>)}

        </main>

        {/* ══ RIGHT: AI Agent Copilot ══ */}
        <aside className="w-[280px] shrink-0 border-l border-gray-800 bg-[#0a0f18] flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-200">现场督导护航 AI</p>
                <p className="text-[10px] text-gray-600">智能包工头 · 精准催办 · 安全拦截</p>
              </div>
            </div>
          </div>

          {/* Agent messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {DEMO_AGENT_MESSAGES.map((msg) => {
              const style = MSG_STYLES[msg.type] ?? MSG_STYLES.info;
              const Icon = style.icon;
              return (
                <div key={msg.id} className={cn("rounded-lg border p-3 space-y-1.5", style.cls)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">
                        {msg.type === "alert" ? "紧急催办" : msg.type === "safety" ? "安全红线" : msg.type === "remind" ? "提醒" : "信息"}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-60">{msg.time}</span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">{msg.text}</p>
                </div>
              );
            })}
          </div>

          {/* Agent input */}
          <div className="p-3 border-t border-gray-800">
            <p className="text-[10px] text-gray-600 mb-2">问 AI：「这台设备怎么从 A 换到 B 夹具？」</p>
            <div className="flex gap-2">
              <Input
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                placeholder="输入问题..."
                className="h-8 text-xs bg-transparent border-gray-700 text-gray-300 placeholder:text-gray-600 flex-1"
              />
              <Button size="sm" variant="outline" className="h-8 px-2 bg-transparent border-gray-700 text-gray-400 hover:bg-purple-500/10 hover:text-purple-400">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
