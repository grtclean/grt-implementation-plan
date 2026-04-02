/**
 * CEO Smart Motivation Command Center — CEO 智能激励指挥台
 *
 * 6-tab comprehensive page:
 * 1. 任务指挥 (Task Command) — CEO assigns smart tasks with motivation
 * 2. KPI 前瞻 (KPI Foresight) — Proactive KPI risk matrix & trends
 * 3. 精准激励 (Precision Motivation) — Recognition wall & moments
 * 4. 技术攻关 (Technical Breakthrough) — Problem-solving sessions
 * 5. 团队在位 (Team Presence) — UWB-style awareness
 * 6. 绩效日历 (Performance Calendar) — Monthly timeline
 */

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Crown, RefreshCw, ClipboardList, Rocket, TrendingUp, TrendingDown,
  Heart, Wrench, MapPin, CalendarDays, Plus, Star, Zap, Trophy,
  Target, Clock, CheckCircle2, AlertTriangle, AlertCircle, Users,
  Send, Eye, Flame, Brain, Search, Lightbulb, Settings, ArrowUp,
  ArrowDown, ArrowRight, ChevronDown, ChevronUp, Sparkles, MessageSquare,
  Activity, FileText, CircleDot, Timer, Calendar, Shield, Scale, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const EMPLOYEES = [
  { id: "e1", name: "金晓锋", dept: "事业一部", role: "制造质量经理", expertise: ["质量管理", "工艺优化"] },
  { id: "e2", name: "李大鹏", dept: "事业一部", role: "电气工程师", expertise: ["PLC调试", "电气控制"] },
  { id: "e3", name: "马柯", dept: "事业十部", role: "质量专员", expertise: ["质量体系", "SPC"] },
  { id: "e4", name: "杨勇", dept: "事业三部", role: "项目经理", expertise: ["项目协调", "进度管理"] },
  { id: "e5", name: "洪小东", dept: "事业二部", role: "机械研发工程师", expertise: ["机械研发", "工艺创新"] },
  { id: "e6", name: "洪香龙", dept: "事业二部", role: "机械设计经理", expertise: ["结构设计", "3D建模"] },
  { id: "e7", name: "黄晓兰", dept: "财务部", role: "出纳", expertise: ["成本核算", "资金管理"] },
  { id: "e8", name: "倪微薇", dept: "AI数智部", role: "AI数智&人事行政部经理", expertise: ["数字化转型", "人事管理"] },
  { id: "e9", name: "王秀萍", dept: "财务部", role: "总账会计", expertise: ["总账管理", "财务报表"] },
  { id: "e10", name: "胡杨", dept: "AI数智部", role: "IT工程师", expertise: ["系统开发", "技术架构"] },
];

const KPI_DOMAINS = ["质量", "交付", "成本", "效率", "创新", "协作"] as const;
type KpiDomain = typeof KPI_DOMAINS[number];

const CHALLENGE_LEVELS = [
  { value: "easy", label: "常规", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { value: "normal", label: "标准", color: "bg-blue-50 text-blue-700 border-blue-300" },
  { value: "challenging", label: "挑战", color: "bg-amber-50 text-amber-700 border-amber-400 shadow-amber-200/50 shadow-md" },
  { value: "stretch", label: "超越", color: "bg-purple-50 text-purple-700 border-purple-400 shadow-purple-200/50 shadow-md" },
] as const;

const PUSH_STRATEGIES = [
  { value: "immediate", label: "立即推送" },
  { value: "scheduled", label: "预约时间推送" },
  { value: "on_arrival", label: "等待员工到位后推送" },
] as const;

const EMPLOYEE_STATES = [
  { value: "arrived", label: "到达工位" },
  { value: "focused", label: "专注中" },
  { value: "after_meeting", label: "会议结束后" },
  { value: "morning_arrival", label: "早晨到达" },
] as const;

const MOMENT_TYPES = [
  { value: "challenge_accepted", label: "接受挑战", icon: "💪" },
  { value: "stretch_completed", label: "超越完成", icon: "🏆" },
  { value: "kpi_exceeded", label: "KPI超额", icon: "🔥" },
  { value: "peer_recognized", label: "同事认可", icon: "👏" },
  { value: "streak_maintained", label: "连续达标", icon: "🎯" },
  { value: "breakthrough", label: "技术突破", icon: "💡" },
  { value: "first_of_kind", label: "首次独立完成", icon: "⚡" },
] as const;

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

interface SmartTask {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  challengeLevel: string;
  status: "pending" | "in_progress" | "completed" | "challenging" | "stretch";
  kpiDomain: KpiDomain;
  pushStrategy: string;
  flashActive: boolean;
  deadline: string;
  motivationalNote: string;
  technicalHints: string;
  kpiBonus: number;
  ceoFeedback?: string;
}

const DEMO_TASKS: SmartTask[] = [
  { id: "t1", employeeId: "e1", employeeName: "金晓锋", title: "清洗温度优化挑战 — 将T7超声清洗良率从92%提升至97%", challengeLevel: "challenging", status: "in_progress", kpiDomain: "质量", pushStrategy: "immediate", flashActive: true, deadline: "2026-03-28", motivationalNote: "你在T7调试上的突破给了全组信心", technicalHints: "从5M1E角度分析温度偏差", kpiBonus: 30 },
  { id: "t2", employeeId: "e2", employeeName: "李大鹏", title: "T14现场PLC通讯稳定性攻关", challengeLevel: "stretch", status: "in_progress", kpiDomain: "交付", pushStrategy: "immediate", flashActive: false, deadline: "2026-03-30", motivationalNote: "你的PLC功底是团队最强的", technicalHints: "检查PROFINET通讯周期与抖动", kpiBonus: 40 },
  { id: "t3", employeeId: "e3", employeeName: "马柯", title: "月度SPC控制图全面更新", challengeLevel: "normal", status: "completed", kpiDomain: "质量", pushStrategy: "immediate", flashActive: false, deadline: "2026-03-20", motivationalNote: "稳定的卓越最令人敬佩", technicalHints: "", kpiBonus: 15 },
  { id: "t4", employeeId: "e5", employeeName: "洪小东", title: "新能源电池壳清洗剂配比优化 — 残留物降低至0.02mg/cm2以下", challengeLevel: "stretch", status: "in_progress", kpiDomain: "创新", pushStrategy: "on_arrival", flashActive: true, deadline: "2026-04-05", motivationalNote: "你的坚持正在改变整个清洗线", technicalHints: "参考GRT-2604项目碱性清洗剂方案", kpiBonus: 50 },
  { id: "t5", employeeId: "e4", employeeName: "杨勇", title: "T14项目进度恢复计划制定", challengeLevel: "challenging", status: "pending", kpiDomain: "交付", pushStrategy: "scheduled", flashActive: false, deadline: "2026-03-25", motivationalNote: "项目协调是你的强项", technicalHints: "关注关键路径上的采购节点", kpiBonus: 25 },
  { id: "t6", employeeId: "e6", employeeName: "洪香龙", title: "半导体清洗机框架轻量化设计", challengeLevel: "challenging", status: "in_progress", kpiDomain: "创新", pushStrategy: "immediate", flashActive: false, deadline: "2026-04-10", motivationalNote: "你的设计总能兼顾美感与功能", technicalHints: "铝合金6061-T6替代碳钢方案评估", kpiBonus: 35 },
  { id: "t7", employeeId: "e10", employeeName: "胡杨", title: "GRT-2701半导体晶圆清洗方案预研", challengeLevel: "stretch", status: "pending", kpiDomain: "创新", pushStrategy: "on_arrival", flashActive: true, deadline: "2026-04-15", motivationalNote: "这是GRT进入半导体赛道的关键一步", technicalHints: "SC-1/SC-2标准清洗流程对标", kpiBonus: 60 },
  { id: "t8", employeeId: "e7", employeeName: "黄晓兰", title: "Q1项目成本偏差分析报告", challengeLevel: "normal", status: "completed", kpiDomain: "成本", pushStrategy: "immediate", flashActive: false, deadline: "2026-03-18", motivationalNote: "你的财务分析一直是管理决策的基石", technicalHints: "", kpiBonus: 15 },
];

interface KpiCell {
  current: number;
  target: number;
  predicted: number;
  status: "normal" | "watch" | "warning" | "critical";
}

function generateKpiMatrix(): Record<string, Record<KpiDomain, KpiCell>> {
  const matrix: Record<string, Record<KpiDomain, KpiCell>> = {};
  const presets: Record<string, Partial<Record<KpiDomain, KpiCell>>> = {
    金晓锋: { 质量: { current: 94, target: 95, predicted: 96, status: "normal" }, 交付: { current: 82, target: 90, predicted: 75, status: "critical" }, 成本: { current: 88, target: 85, predicted: 87, status: "normal" }, 效率: { current: 91, target: 90, predicted: 90, status: "normal" }, 创新: { current: 78, target: 80, predicted: 82, status: "watch" }, 协作: { current: 90, target: 85, predicted: 91, status: "normal" } },
    李大鹏: { 质量: { current: 90, target: 90, predicted: 89, status: "watch" }, 交付: { current: 88, target: 90, predicted: 91, status: "normal" }, 成本: { current: 85, target: 85, predicted: 84, status: "watch" }, 效率: { current: 93, target: 90, predicted: 94, status: "normal" }, 创新: { current: 86, target: 85, predicted: 88, status: "normal" }, 协作: { current: 92, target: 90, predicted: 93, status: "normal" } },
    马柯: { 质量: { current: 97, target: 95, predicted: 98, status: "normal" }, 交付: { current: 95, target: 90, predicted: 96, status: "normal" }, 成本: { current: 90, target: 85, predicted: 91, status: "normal" }, 效率: { current: 96, target: 90, predicted: 97, status: "normal" }, 创新: { current: 82, target: 80, predicted: 83, status: "normal" }, 协作: { current: 94, target: 90, predicted: 95, status: "normal" } },
    杨勇: { 质量: { current: 91, target: 95, predicted: 88, status: "warning" }, 交付: { current: 85, target: 90, predicted: 83, status: "warning" }, 成本: { current: 87, target: 85, predicted: 86, status: "normal" }, 效率: { current: 88, target: 90, predicted: 87, status: "watch" }, 创新: { current: 75, target: 80, predicted: 77, status: "watch" }, 协作: { current: 93, target: 90, predicted: 94, status: "normal" } },
    洪小东: { 质量: { current: 93, target: 90, predicted: 95, status: "normal" }, 交付: { current: 90, target: 90, predicted: 92, status: "normal" }, 成本: { current: 82, target: 85, predicted: 84, status: "watch" }, 效率: { current: 91, target: 90, predicted: 93, status: "normal" }, 创新: { current: 85, target: 80, predicted: 98, status: "normal" }, 协作: { current: 88, target: 85, predicted: 89, status: "normal" } },
    洪香龙: { 质量: { current: 89, target: 90, predicted: 90, status: "watch" }, 交付: { current: 86, target: 90, predicted: 88, status: "watch" }, 成本: { current: 91, target: 85, predicted: 92, status: "normal" }, 效率: { current: 87, target: 90, predicted: 86, status: "warning" }, 创新: { current: 94, target: 85, predicted: 96, status: "normal" }, 协作: { current: 85, target: 85, predicted: 86, status: "normal" } },
    黄晓兰: { 质量: { current: 95, target: 90, predicted: 96, status: "normal" }, 交付: { current: 92, target: 90, predicted: 93, status: "normal" }, 成本: { current: 96, target: 95, predicted: 97, status: "normal" }, 效率: { current: 94, target: 90, predicted: 95, status: "normal" }, 创新: { current: 78, target: 75, predicted: 79, status: "normal" }, 协作: { current: 91, target: 90, predicted: 92, status: "normal" } },
    倪微薇: { 质量: { current: 93, target: 90, predicted: 94, status: "normal" }, 交付: { current: 89, target: 90, predicted: 88, status: "watch" }, 成本: { current: 94, target: 95, predicted: 93, status: "watch" }, 效率: { current: 90, target: 90, predicted: 91, status: "normal" }, 创新: { current: 76, target: 75, predicted: 77, status: "normal" }, 协作: { current: 88, target: 85, predicted: 89, status: "normal" } },
    王秀萍: { 质量: { current: 92, target: 90, predicted: 93, status: "normal" }, 交付: { current: 91, target: 90, predicted: 92, status: "normal" }, 成本: { current: 88, target: 85, predicted: 89, status: "normal" }, 效率: { current: 93, target: 90, predicted: 94, status: "normal" }, 创新: { current: 80, target: 80, predicted: 81, status: "normal" }, 协作: { current: 95, target: 90, predicted: 96, status: "normal" } },
    胡杨: { 质量: { current: 88, target: 90, predicted: 87, status: "warning" }, 交付: { current: 84, target: 90, predicted: 82, status: "critical" }, 成本: { current: 86, target: 85, predicted: 85, status: "normal" }, 效率: { current: 89, target: 90, predicted: 88, status: "watch" }, 创新: { current: 92, target: 85, predicted: 95, status: "normal" }, 协作: { current: 83, target: 85, predicted: 84, status: "watch" } },
  };
  for (const emp of EMPLOYEES) {
    matrix[emp.name] = presets[emp.name] as Record<KpiDomain, KpiCell>;
  }
  return matrix;
}

interface MotivationMoment {
  id: string;
  employeeName: string;
  momentType: string;
  icon: string;
  triggerEvent: string;
  ceoMessage: string;
  deliveryMethod: string;
  visibility: string;
  kpiBonus: number;
  generalPoints: number;
  timestamp: string;
  reactions: number;
}

const DEMO_MOMENTS: MotivationMoment[] = [
  { id: "m1", employeeName: "洪小东", momentType: "stretch_completed", icon: "🏆", triggerEvent: "连续3周超额完成清洗工艺优化", ceoMessage: "你的坚持正在改变整个清洗线的效率基线", deliveryMethod: "团队广播", visibility: "全公司", kpiBonus: 50, generalPoints: 200, timestamp: "2026-03-22 09:30", reactions: 24 },
  { id: "m2", employeeName: "李大鹏", momentType: "first_of_kind", icon: "⚡", triggerEvent: "首次独立完成T14现场调试", ceoMessage: "独当一面的时刻，GRT的未来靠你们", deliveryMethod: "一对一", visibility: "团队", kpiBonus: 30, generalPoints: 150, timestamp: "2026-03-21 16:45", reactions: 18 },
  { id: "m3", employeeName: "马柯", momentType: "kpi_exceeded", icon: "🔥", triggerEvent: "KPI连续2个月全A", ceoMessage: "稳定的卓越最令人敬佩", deliveryMethod: "闪烁附注", visibility: "部门", kpiBonus: 40, generalPoints: 180, timestamp: "2026-03-20 11:00", reactions: 31 },
  { id: "m4", employeeName: "金晓锋", momentType: "breakthrough", icon: "💡", triggerEvent: "发现超声频率与清洁度的非线性关系", ceoMessage: "这个发现可能改写我们的工艺手册，了不起", deliveryMethod: "应用内", visibility: "全公司", kpiBonus: 60, generalPoints: 300, timestamp: "2026-03-19 14:20", reactions: 42 },
  { id: "m5", employeeName: "洪小东", momentType: "streak_maintained", icon: "🎯", triggerEvent: "连续21天全任务达标", ceoMessage: "21天的纪律性，这就是冠军的素质", deliveryMethod: "团队广播", visibility: "全公司", kpiBonus: 25, generalPoints: 100, timestamp: "2026-03-18 08:50", reactions: 19 },
  { id: "m6", employeeName: "胡杨", momentType: "challenge_accepted", icon: "💪", triggerEvent: "主动请缨半导体晶圆清洗预研", ceoMessage: "敢于挑战未知领域的勇气，正是GRT最需要的", deliveryMethod: "一对一", visibility: "团队", kpiBonus: 20, generalPoints: 80, timestamp: "2026-03-17 10:30", reactions: 15 },
  { id: "m7", employeeName: "洪香龙", momentType: "peer_recognized", icon: "👏", triggerEvent: "被3位同事提名为本月最佳协作伙伴", ceoMessage: "好的设计不仅解决问题，更让团队充满信心", deliveryMethod: "应用内", visibility: "部门", kpiBonus: 15, generalPoints: 60, timestamp: "2026-03-16 15:10", reactions: 22 },
  { id: "m8", employeeName: "黄晓兰", momentType: "kpi_exceeded", icon: "🔥", triggerEvent: "Q1成本分析报告提前5天交付且零差错", ceoMessage: "财务的精准就是企业的安全感，感谢你的专业", deliveryMethod: "闪烁附注", visibility: "部门", kpiBonus: 30, generalPoints: 120, timestamp: "2026-03-15 09:00", reactions: 16 },
];

interface TechSession {
  id: string;
  title: string;
  difficulty: "moderate" | "hard" | "extreme" | "breakthrough";
  status: "open" | "analyzing" | "scheduled" | "resolved";
  requestedBy: string;
  daysOpen: number;
  scheduledTime?: string;
  description: string;
  suggestedExperts: string[];
}

const DEMO_SESSIONS: TechSession[] = [
  { id: "s1", title: "超声清洗频率漂移导致清洁度不达标", difficulty: "extreme", status: "open", requestedBy: "金晓锋", daysOpen: 3, description: "40kHz超声波在连续运行4小时后频率漂移至38.5kHz，导致清洁度从Grade A降至Grade C", suggestedExperts: ["洪小东", "胡杨", "李大鹏"] },
  { id: "s2", title: "T7调试阶段PLC通讯间歇中断", difficulty: "hard", status: "analyzing", requestedBy: "李大鹏", daysOpen: 1, description: "西门子S7-1500与HMI之间PROFINET通讯每2-3小时出现200ms中断", suggestedExperts: ["金晓锋", "洪香龙"] },
  { id: "s3", title: "新能源电池壳清洗后残留物超标", difficulty: "breakthrough", status: "scheduled", requestedBy: "洪小东", daysOpen: 5, scheduledTime: "2026-03-23 14:00", description: "铝合金电池壳碱性清洗后NaOH残留0.08mg/cm2，客户要求<0.02mg/cm2", suggestedExperts: ["金晓锋", "胡杨"] },
  { id: "s4", title: "半导体清洗机真空度不稳定", difficulty: "hard", status: "open", requestedBy: "胡杨", daysOpen: 2, description: "干燥腔真空度在-85kPa至-92kPa间波动，目标稳定在-90kPa以下", suggestedExperts: ["洪香龙", "李大鹏"] },
  { id: "s5", title: "清洗篮定位精度影响批次一致性", difficulty: "moderate", status: "analyzing", requestedBy: "洪香龙", daysOpen: 1, description: "清洗篮在传送带上的定位误差达到+-3mm，影响超声波覆盖均匀性", suggestedExperts: ["金晓锋", "洪小东"] },
];

interface PresenceInfo {
  employeeId: string;
  name: string;
  state: "focused" | "arrived" | "in_meeting" | "break" | "offline";
  zone: string;
  since: string;
  todayHours: number;
  pendingTasks: number;
}

const DEMO_PRESENCE: PresenceInfo[] = [
  { employeeId: "e1", name: "金晓锋", state: "focused", zone: "清洗车间A", since: "08:15", todayHours: 6.5, pendingTasks: 2 },
  { employeeId: "e2", name: "李大鹏", state: "focused", zone: "调试区T7", since: "07:50", todayHours: 7.0, pendingTasks: 1 },
  { employeeId: "e3", name: "马柯", state: "in_meeting", zone: "会议室B", since: "14:00", todayHours: 5.5, pendingTasks: 0 },
  { employeeId: "e4", name: "杨勇", state: "in_meeting", zone: "会议室A", since: "14:30", todayHours: 5.0, pendingTasks: 2 },
  { employeeId: "e5", name: "洪小东", state: "focused", zone: "清洗车间B", since: "08:00", todayHours: 6.8, pendingTasks: 1 },
  { employeeId: "e6", name: "洪香龙", state: "arrived", zone: "设计室", since: "09:00", todayHours: 5.8, pendingTasks: 1 },
  { employeeId: "e7", name: "黄晓兰", state: "focused", zone: "财务办公室", since: "08:30", todayHours: 6.3, pendingTasks: 0 },
  { employeeId: "e8", name: "倪微薇", state: "break", zone: "休息区", since: "14:45", todayHours: 5.5, pendingTasks: 1 },
  { employeeId: "e9", name: "王秀萍", state: "arrived", zone: "财务办公室", since: "08:20", todayHours: 6.4, pendingTasks: 0 },
  { employeeId: "e10", name: "胡杨", state: "offline", zone: "-", since: "-", todayHours: 0, pendingTasks: 3 },
];

// Calendar events
interface CalendarEvent {
  date: string;
  type: "kpi_milestone" | "task_completed" | "motivation" | "kpi_alert" | "stretch_goal";
  employeeName: string;
  description: string;
  kpiPoints?: number;
}

const DEMO_CALENDAR_EVENTS: CalendarEvent[] = [
  { date: "2026-03-01", type: "task_completed", employeeName: "马柯", description: "完成2月SPC报告", kpiPoints: 10 },
  { date: "2026-03-03", type: "kpi_milestone", employeeName: "洪小东", description: "创新指标突破85%", kpiPoints: 20 },
  { date: "2026-03-05", type: "motivation", employeeName: "李大鹏", description: "获得CEO鼓励 — 首次独立调试", kpiPoints: 30 },
  { date: "2026-03-07", type: "kpi_alert", employeeName: "胡杨", description: "交付效率下降至84%", kpiPoints: 0 },
  { date: "2026-03-08", type: "stretch_goal", employeeName: "洪小东", description: "主动承接电池壳清洗优化", kpiPoints: 15 },
  { date: "2026-03-10", type: "task_completed", employeeName: "金晓锋", description: "T7清洗良率达到94%", kpiPoints: 15 },
  { date: "2026-03-11", type: "motivation", employeeName: "洪小东", description: "连续14天全任务达标", kpiPoints: 25 },
  { date: "2026-03-12", type: "kpi_alert", employeeName: "金晓锋", description: "交付效率预警 ↓18%", kpiPoints: 0 },
  { date: "2026-03-14", type: "kpi_milestone", employeeName: "马柯", description: "质量指标达到97%", kpiPoints: 20 },
  { date: "2026-03-15", type: "motivation", employeeName: "黄晓兰", description: "Q1成本报告提前5天交付", kpiPoints: 30 },
  { date: "2026-03-16", type: "task_completed", employeeName: "洪香龙", description: "轻量化方案初稿完成", kpiPoints: 10 },
  { date: "2026-03-17", type: "stretch_goal", employeeName: "胡杨", description: "请缨半导体预研", kpiPoints: 20 },
  { date: "2026-03-18", type: "motivation", employeeName: "洪小东", description: "连续21天全任务达标", kpiPoints: 25 },
  { date: "2026-03-19", type: "kpi_milestone", employeeName: "金晓锋", description: "发现频率-清洁度非线性关系", kpiPoints: 60 },
  { date: "2026-03-20", type: "task_completed", employeeName: "马柯", description: "月度SPC控制图全面更新完成", kpiPoints: 15 },
  { date: "2026-03-20", type: "motivation", employeeName: "马柯", description: "KPI连续2月全A", kpiPoints: 40 },
  { date: "2026-03-21", type: "task_completed", employeeName: "黄晓兰", description: "Q1项目成本偏差分析完成", kpiPoints: 15 },
  { date: "2026-03-22", type: "kpi_alert", employeeName: "杨勇", description: "质量指标预警 ↓8%", kpiPoints: 0 },
  { date: "2026-03-22", type: "motivation", employeeName: "洪小东", description: "CEO广播表彰清洗工艺优化成就", kpiPoints: 50 },
];

// ---------------------------------------------------------------------------
// Utility Helpers
// ---------------------------------------------------------------------------

function challengeBadge(level: string) {
  const cfg = CHALLENGE_LEVELS.find((c) => c.value === level) ?? CHALLENGE_LEVELS[0];
  return <Badge variant="outline" className={`${cfg.color} text-xs`}>{cfg.label}</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "待分配", cls: "bg-orange-50 text-orange-700 border-orange-300" },
    in_progress: { label: "进行中", cls: "bg-blue-50 text-blue-700 border-blue-300" },
    completed: { label: "已完成", cls: "bg-green-50 text-green-700 border-green-300" },
    challenging: { label: "挑战中", cls: "bg-amber-50 text-amber-700 border-amber-300" },
    stretch: { label: "超越中", cls: "bg-purple-50 text-purple-700 border-purple-300" },
  };
  const s = map[status] ?? map.pending;
  return <Badge variant="outline" className={`${s.cls} text-xs`}>{s.label}</Badge>;
}

function kpiStatusDot(status: string) {
  const colors: Record<string, string> = {
    normal: "bg-green-500",
    watch: "bg-yellow-400",
    warning: "bg-orange-500",
    critical: "bg-red-500",
  };
  return <div className={`w-3 h-3 rounded-full ${colors[status] ?? "bg-gray-300"}`} />;
}

function presenceIcon(state: string) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    focused: { label: "专注工作中", cls: "text-green-700 bg-green-50 border-green-300", dot: "bg-green-500" },
    arrived: { label: "已到达", cls: "text-blue-700 bg-blue-50 border-blue-300", dot: "bg-blue-500" },
    in_meeting: { label: "会议中", cls: "text-yellow-700 bg-yellow-50 border-yellow-300", dot: "bg-yellow-400" },
    break: { label: "休息", cls: "text-gray-600 bg-gray-50 border-gray-300", dot: "bg-gray-400" },
    offline: { label: "未到", cls: "text-red-700 bg-red-50 border-red-300", dot: "bg-red-500" },
  };
  const s = map[state] ?? map.offline;
  return (
    <Badge variant="outline" className={`${s.cls} text-xs gap-1`}>
      <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </Badge>
  );
}

function calendarEventDot(type: string) {
  const map: Record<string, string> = {
    kpi_milestone: "bg-green-500",
    task_completed: "bg-blue-500",
    motivation: "bg-amber-500",
    kpi_alert: "bg-red-500",
    stretch_goal: "bg-purple-500",
  };
  return map[type] ?? "bg-gray-400";
}

// ---------------------------------------------------------------------------
// Tab 1: Task Command
// ---------------------------------------------------------------------------

function TaskCommandTab() {
  const [tasks, setTasks] = useState<SmartTask[]>(DEMO_TASKS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SmartTask | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // New task form state
  const [newEmployee, setNewEmployee] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newChallenge, setNewChallenge] = useState("normal");
  const [newDeadline, setNewDeadline] = useState("");
  const [newMotivation, setNewMotivation] = useState("");
  const [newTechHints, setNewTechHints] = useState("");
  const [newKpiDomain, setNewKpiDomain] = useState<string>("质量");
  const [newPushStrategy, setNewPushStrategy] = useState("immediate");
  const [newScheduledTime, setNewScheduledTime] = useState("");
  const [newEmployeeState, setNewEmployeeState] = useState("arrived");
  const [newFlashEnabled, setNewFlashEnabled] = useState(false);
  const [newFlashText, setNewFlashText] = useState("");
  const [newKpiBonus, setNewKpiBonus] = useState(10);
  const [newCollaborators, setNewCollaborators] = useState<string[]>([]);

  const stats = useMemo(() => ({
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    challenging: tasks.filter((t) => t.challengeLevel === "challenging" || t.challengeLevel === "stretch").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  const handleCreateTask = useCallback(() => {
    const emp = EMPLOYEES.find((e) => e.id === newEmployee);
    if (!emp || !newTitle) { toast.error("请填写必要信息"); return; }
    const task: SmartTask = {
      id: `t${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      title: newTitle,
      challengeLevel: newChallenge,
      status: "pending",
      kpiDomain: newKpiDomain as KpiDomain,
      pushStrategy: newPushStrategy,
      flashActive: newFlashEnabled,
      deadline: newDeadline || "2026-04-01",
      motivationalNote: newMotivation,
      technicalHints: newTechHints,
      kpiBonus: newKpiBonus,
    };
    setTasks((prev) => [task, ...prev]);
    toast.success(`任务已分配给 ${emp.name}`);
    setShowCreateForm(false);
    setNewTitle("");
    setNewMotivation("");
    setNewTechHints("");
  }, [newEmployee, newTitle, newChallenge, newDeadline, newMotivation, newTechHints, newKpiDomain, newPushStrategy, newFlashEnabled, newKpiBonus]);

  const toggleCollaborator = (id: string) => {
    setNewCollaborators((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      {/* KPI summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "待分配任务", value: stats.pending, icon: ClipboardList, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          { label: "进行中", value: stats.inProgress, icon: Activity, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "挑战/超越任务", value: stats.challenging, icon: Flame, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
          { label: "本月完成", value: stats.completed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" },
        ].map((c) => (
          <Card key={c.label} className={`${c.bg} border`}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Smart Task */}
      <Card className="border-amber-200">
        <CardHeader className="cursor-pointer pb-2" onClick={() => setShowCreateForm(!showCreateForm)}>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-amber-600" />
              创建智能任务
            </span>
            {showCreateForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showCreateForm && (
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>指定员工</Label>
                <Select value={newEmployee} onValueChange={setNewEmployee}>
                  <SelectTrigger><SelectValue placeholder="选择员工..." /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYEES.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} — {e.dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>挑战等级</Label>
                <Select value={newChallenge} onValueChange={setNewChallenge}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_LEVELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>任务标题</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="例: T7超声清洗良率从92%提升至97%" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>关联KPI</Label>
                <Select value={newKpiDomain} onValueChange={setNewKpiDomain}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KPI_DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Heart className="h-3 w-3 text-amber-500" /> 激励提示词</Label>
              <Textarea
                value={newMotivation}
                onChange={(e) => setNewMotivation(e.target.value)}
                placeholder="你在T7调试上的突破给了全组信心，这次挑战也相信你能超越..."
                className="border-amber-200 focus:border-amber-400"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Lightbulb className="h-3 w-3 text-blue-500" /> 技术思路提示</Label>
              <Textarea
                value={newTechHints}
                onChange={(e) => setNewTechHints(e.target.value)}
                placeholder="建议从5M1E角度分析清洗温度偏差，参考GRT-2604项目经验..."
                className="border-blue-200 focus:border-blue-400"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>推送策略</Label>
              <div className="flex flex-wrap gap-3">
                {PUSH_STRATEGIES.map((ps) => (
                  <label key={ps.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pushStrategy"
                      value={ps.value}
                      checked={newPushStrategy === ps.value}
                      onChange={() => setNewPushStrategy(ps.value)}
                      className="accent-amber-500"
                    />
                    <span className="text-sm">{ps.label}</span>
                  </label>
                ))}
              </div>
              {newPushStrategy === "scheduled" && (
                <Input type="datetime-local" value={newScheduledTime} onChange={(e) => setNewScheduledTime(e.target.value)} className="max-w-xs" />
              )}
              {newPushStrategy === "on_arrival" && (
                <Select value={newEmployeeState} onValueChange={setNewEmployeeState}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_STATES.map((es) => (
                      <SelectItem key={es.value} value={es.value}>{es.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  闪烁附注
                  <button
                    type="button"
                    onClick={() => setNewFlashEnabled(!newFlashEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${newFlashEnabled ? "bg-amber-500" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${newFlashEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </Label>
                {newFlashEnabled && (
                  <Input value={newFlashText} onChange={(e) => setNewFlashText(e.target.value)} placeholder="闪烁附注内容..." />
                )}
              </div>
              <div className="space-y-2">
                <Label>KPI奖励分 (0-100)</Label>
                <Input type="number" min={0} max={100} value={newKpiBonus} onChange={(e) => setNewKpiBonus(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>协作人员</Label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYEES.filter((e) => e.id !== newEmployee).map((e) => (
                  <label key={e.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={newCollaborators.includes(e.id)} onChange={() => toggleCollaborator(e.id)} className="accent-amber-500" />
                    {e.name}
                  </label>
                ))}
              </div>
            </div>

            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold w-full md:w-auto" onClick={handleCreateTask}>
              <Send className="h-4 w-4 mr-2" /> 分配任务
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Task list table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead className="min-w-[240px]">任务</TableHead>
                  <TableHead>挑战等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>KPI领域</TableHead>
                  <TableHead>推送策略</TableHead>
                  <TableHead className="text-center">闪烁</TableHead>
                  <TableHead>截止日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="cursor-pointer hover:bg-amber-50/50" onClick={() => { setSelectedTask(task); setFeedbackText(task.ceoFeedback ?? ""); }}>
                    <TableCell className="font-medium">{task.employeeName}</TableCell>
                    <TableCell className="text-sm">{task.title}</TableCell>
                    <TableCell>{challengeBadge(task.challengeLevel)}</TableCell>
                    <TableCell>{statusBadge(task.status)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{task.kpiDomain}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {PUSH_STRATEGIES.find((p) => p.value === task.pushStrategy)?.label ?? task.pushStrategy}
                    </TableCell>
                    <TableCell className="text-center">
                      {task.flashActive && (
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" style={{ animation: "flash 1.5s infinite" }} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{task.deadline}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Task detail dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {challengeBadge(selectedTask?.challengeLevel ?? "normal")}
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">员工:</span> {selectedTask.employeeName}</div>
                <div><span className="text-muted-foreground">状态:</span> {statusBadge(selectedTask.status)}</div>
                <div><span className="text-muted-foreground">KPI领域:</span> {selectedTask.kpiDomain}</div>
                <div><span className="text-muted-foreground">奖励分:</span> {selectedTask.kpiBonus}</div>
                <div><span className="text-muted-foreground">截止日:</span> {selectedTask.deadline}</div>
              </div>
              {selectedTask.motivationalNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-600 font-medium mb-1">CEO 激励寄语</p>
                  <p className="text-sm italic text-amber-800">"{selectedTask.motivationalNote}"</p>
                </div>
              )}
              {selectedTask.technicalHints && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">技术思路提示</p>
                  <p className="text-sm text-blue-800">{selectedTask.technicalHints}</p>
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <Label>CEO 反馈</Label>
                <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="输入对该任务的反馈..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>关闭</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
              if (selectedTask) {
                setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? { ...t, ceoFeedback: feedbackText } : t));
                toast.success("反馈已保存");
                setSelectedTask(null);
              }
            }}>
              保存反馈
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: KPI Foresight
// ---------------------------------------------------------------------------

function KpiForesightTab() {
  const kpiMatrix = useMemo(() => generateKpiMatrix(), []);
  const [hoveredCell, setHoveredCell] = useState<{ emp: string; domain: KpiDomain } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("金晓锋");

  const statusCounts = useMemo(() => {
    const counts = { normal: 0, watch: 0, warning: 0, critical: 0 };
    for (const emp of Object.values(kpiMatrix)) {
      for (const cell of Object.values(emp)) {
        counts[cell.status]++;
      }
    }
    return counts;
  }, [kpiMatrix]);

  const declineAlerts = [
    { emp: "金晓锋", domain: "交付", drop: 18, current: 82, predicted: 75, target: 90, severity: "critical" as const },
    { emp: "杨勇", domain: "质量", drop: 8, current: 91, predicted: 88, target: 95, severity: "warning" as const },
    { emp: "胡杨", domain: "交付", drop: 10, current: 84, predicted: 82, target: 90, severity: "warning" as const },
    { emp: "洪香龙", domain: "效率", drop: 5, current: 87, predicted: 86, target: 90, severity: "watch" as const },
    { emp: "杨勇", domain: "交付", drop: 7, current: 85, predicted: 83, target: 90, severity: "warning" as const },
  ];

  const improvements = [
    { emp: "洪小东", domain: "创新", rise: 15, current: 85, predicted: 98 },
    { emp: "李大鹏", domain: "效率", rise: 4, current: 93, predicted: 94 },
    { emp: "马柯", domain: "质量", rise: 3, current: 97, predicted: 98 },
  ];

  const empKpi = kpiMatrix[selectedEmployee];

  return (
    <div className="space-y-4">
      {/* KPI Risk Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-amber-500" /> KPI 风险矩阵</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">员工</th>
                  {KPI_DOMAINS.map((d) => <th key={d} className="text-center py-2 px-3 font-medium text-muted-foreground">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((emp) => (
                  <tr key={emp.id} className="border-t hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{emp.name}</td>
                    {KPI_DOMAINS.map((domain) => {
                      const cell = kpiMatrix[emp.name]?.[domain];
                      if (!cell) return <td key={domain} />;
                      const isHovered = hoveredCell?.emp === emp.name && hoveredCell?.domain === domain;
                      return (
                        <td
                          key={domain}
                          className="text-center py-2 px-3 relative"
                          onMouseEnter={() => setHoveredCell({ emp: emp.name, domain })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="flex justify-center">{kpiStatusDot(cell.status)}</div>
                          {isHovered && (
                            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border rounded-lg shadow-lg p-3 w-48 text-left">
                              <p className="font-medium text-xs mb-1">{emp.name} - {domain}</p>
                              <div className="text-xs space-y-0.5">
                                <p>当前: <span className="font-semibold">{cell.current}%</span></p>
                                <p>目标: <span className="font-semibold">{cell.target}%</span></p>
                                <p className="flex items-center gap-1">
                                  预测: <span className="font-semibold">{cell.predicted}%</span>
                                  {cell.predicted > cell.current ? <ArrowUp className="h-3 w-3 text-green-500" /> : cell.predicted < cell.current ? <ArrowDown className="h-3 w-3 text-red-500" /> : <ArrowRight className="h-3 w-3 text-gray-400" />}
                                </p>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trend Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "正常", count: statusCounts.normal, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "关注", count: statusCounts.watch, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
          { label: "预警", count: statusCounts.warning, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          { label: "危急", count: statusCounts.critical, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map((c) => (
          <Card key={c.label} className={`${c.bg} border`}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Decline alerts */}
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> 下滑预警
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {declineAlerts.map((a, i) => (
              <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${a.severity === "critical" ? "bg-red-50 border-red-200" : a.severity === "warning" ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200"}`}>
                <div className="text-sm">
                  <span className="font-medium">{a.emp}</span>
                  <span className="text-muted-foreground"> {a.domain} </span>
                  <span className="text-red-600 font-medium">↓{a.drop}%</span>
                  <span className="text-xs text-muted-foreground ml-1">(当前{a.current}% → 预测{a.predicted}%, 目标{a.target}%)</span>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2">创建改进任务</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2">确认已知</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Improvement highlights */}
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <Star className="h-4 w-4" /> 上升亮点
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {improvements.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                <div className="text-sm">
                  <span className="font-medium">{a.emp}</span>
                  <span className="text-muted-foreground"> {a.domain} </span>
                  <span className="text-green-600 font-medium">↑{a.rise}%</span>
                  <span className="text-xs text-muted-foreground ml-1">(当前{a.current}% → 预测{a.predicted}%)</span>
                </div>
                <Star className="h-4 w-4 text-green-500 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Employee KPI Snapshot */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">员工 KPI 快照</CardTitle>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPLOYEES.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {empKpi && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {KPI_DOMAINS.map((domain) => {
                const cell = empKpi[domain];
                const pctFill = Math.min(cell.current, 100);
                const predictedOk = cell.predicted >= cell.target;
                const predictedClose = !predictedOk && cell.predicted >= cell.target - 10;
                const gaugeColor = predictedOk ? "bg-green-500" : predictedClose ? "bg-yellow-400" : "bg-red-500";
                const textColor = predictedOk ? "text-green-600" : predictedClose ? "text-yellow-600" : "text-red-600";
                return (
                  <div key={domain} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{domain}</span>
                      <span className={`text-xs flex items-center gap-0.5 ${textColor}`}>
                        {cell.predicted > cell.current ? <ArrowUp className="h-3 w-3" /> : cell.predicted < cell.current ? <ArrowDown className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                        预测{cell.predicted}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 relative">
                      <div className={`${gaugeColor} h-3 rounded-full transition-all`} style={{ width: `${pctFill}%` }} />
                      <div className="absolute top-0 h-3 w-0.5 bg-gray-700" style={{ left: `${Math.min(cell.target, 100)}%` }} title={`目标 ${cell.target}%`} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>当前 {cell.current}%</span>
                      <span>目标 {cell.target}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ 平衡鸟排序 — Balance Bird Ranking ═══ */}
      <Card className="border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-500" /> 平衡鸟排序 — 相似职能人员综合对比
          </CardTitle>
          <p className="text-xs text-muted-foreground">按职能分组，六维 KPI 加权排序，推动自我激励与良性竞争</p>
        </CardHeader>
        <CardContent>
          {(() => {
            // Group employees by functional role, compute composite score
            const roleGroups: Record<string, Array<{ name: string; role: string; composite: number; domains: Record<string, number>; streak: number; yearAvg: number }>> = {
              "工程师": [], "管理层": [], "专员": [],
            };
            EMPLOYEES.forEach((emp) => {
              const cells = kpiMatrix[emp.name];
              if (!cells) return;
              const vals = KPI_DOMAINS.map((d) => cells[d]?.current ?? 0);
              const composite = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
              const yearAvg = Math.round((composite + (Math.random() * 6 + 82)) / 2 * 10) / 10; // simulated historical
              const streak = Math.floor(Math.random() * 25) + 1;
              const group = emp.role?.includes("经理") || emp.role?.includes("总监") ? "管理层" : emp.role?.includes("专员") ? "专员" : "工程师";
              const domains: Record<string, number> = {};
              KPI_DOMAINS.forEach((d) => { domains[d] = cells[d]?.current ?? 0; });
              roleGroups[group].push({ name: emp.name, role: emp.role ?? "", composite, domains, streak, yearAvg });
            });
            // Sort each group by composite DESC
            Object.values(roleGroups).forEach((g) => g.sort((a, b) => b.composite - a.composite));

            return Object.entries(roleGroups).filter(([, members]) => members.length > 0).map(([role, members]) => (
              <div key={role} className="mb-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">{role}</Badge>
                  <span className="text-xs text-muted-foreground">{members.length} 人</span>
                </h4>
                <div className="space-y-1">
                  {members.map((m, idx) => {
                    const isTop = idx === 0;
                    const barWidth = Math.max(m.composite, 10);
                    return (
                      <div key={m.name} className={`flex items-center gap-3 p-2 rounded-lg ${isTop ? "bg-amber-50 border border-amber-200" : "hover:bg-muted/30"}`}>
                        <span className={`w-6 text-center font-bold text-sm ${isTop ? "text-amber-600" : "text-muted-foreground"}`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                        <span className="w-16 font-medium text-sm">{m.name}</span>
                        <div className="flex-1 relative">
                          <div className="w-full bg-gray-100 rounded-full h-5">
                            <div
                              className={`h-5 rounded-full transition-all flex items-center justify-end pr-2 text-xs text-white font-medium ${isTop ? "bg-gradient-to-r from-amber-400 to-amber-500" : m.composite >= 90 ? "bg-green-500" : m.composite >= 80 ? "bg-blue-500" : "bg-gray-400"}`}
                              style={{ width: `${barWidth}%` }}
                            >
                              {m.composite}%
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right" title="年度均值">年均{m.yearAvg}%</span>
                        <span className="text-xs w-14 text-right" title="连续达标天数">🔥{m.streak}天</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </CardContent>
      </Card>

      {/* ═══ 历年 KPI 汇总 — Annual KPI Summary ═══ */}
      <Card className="border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" /> 历年 KPI 汇总 — 自我激励追踪
          </CardTitle>
          <p className="text-xs text-muted-foreground">2024-2026 年度综合绩效趋势，标注个人最佳与突破时刻</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">员工</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">2024 综合</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">2025 综合</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">2026 至今</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">趋势</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">个人最佳</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">状态</th>
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((emp) => {
                  const cells = kpiMatrix[emp.name];
                  const current = cells ? Math.round(KPI_DOMAINS.map((d) => cells[d]?.current ?? 0).reduce((a, b) => a + b, 0) / KPI_DOMAINS.length * 10) / 10 : 0;
                  const y2024 = Math.round((current - 5 + Math.random() * 3) * 10) / 10;
                  const y2025 = Math.round((current - 2 + Math.random() * 3) * 10) / 10;
                  const best = Math.max(y2024, y2025, current);
                  const improving = current > y2025 && y2025 > y2024;
                  const declining = current < y2025;
                  const atBest = current >= best - 0.5;
                  return (
                    <tr key={emp.id} className="border-t hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{emp.name}</td>
                      <td className="text-center py-2 px-3">
                        <span className="text-muted-foreground">{y2024}%</span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className={y2025 > y2024 ? "text-green-600" : "text-red-600"}>{y2025}%</span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className={`font-semibold ${current > y2025 ? "text-green-600" : current < y2025 ? "text-red-600" : ""}`}>{current}%</span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <div className="flex justify-center items-center gap-1">
                          {[y2024, y2025, current].map((v, i) => (
                            <div key={i} className={`w-8 ${i === 2 ? "bg-amber-400" : "bg-gray-300"} rounded-sm`} style={{ height: `${Math.max(v / 5, 4)}px` }} title={`${v}%`} />
                          ))}
                        </div>
                      </td>
                      <td className="text-center py-2 px-3">
                        {atBest ? <span className="text-amber-500 font-semibold">🏆 {best}%</span> : <span className="text-muted-foreground">{best}%</span>}
                      </td>
                      <td className="text-center py-2 px-3">
                        {improving ? <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">持续上升</Badge>
                          : declining ? <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">需关注</Badge>
                          : <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">稳定</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Precision Motivation
// ---------------------------------------------------------------------------

function PrecisionMotivationTab() {
  const [moments, setMoments] = useState(DEMO_MOMENTS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMomentEmp, setNewMomentEmp] = useState("");
  const [newMomentType, setNewMomentType] = useState("kpi_exceeded");
  const [newMomentTrigger, setNewMomentTrigger] = useState("");
  const [newMomentMessage, setNewMomentMessage] = useState("");
  const [newMomentDelivery, setNewMomentDelivery] = useState("应用内");
  const [newMomentVisibility, setNewMomentVisibility] = useState("团队");
  const [newMomentKpiBonus, setNewMomentKpiBonus] = useState(20);
  const [newMomentPoints, setNewMomentPoints] = useState(100);

  const stats = useMemo(() => {
    const typeCount: Record<string, number> = {};
    moments.forEach((m) => { typeCount[m.momentType] = (typeCount[m.momentType] ?? 0) + 1; });
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
    return {
      total: moments.length,
      avgReaction: (moments.reduce((s, m) => s + m.reactions, 0) / moments.length / 10).toFixed(1),
      topType: topType ? `${MOMENT_TYPES.find((t) => t.value === topType[0])?.label ?? topType[0]} (${topType[1]}次)` : "-",
    };
  }, [moments]);

  const handleCreateMoment = () => {
    const emp = EMPLOYEES.find((e) => e.id === newMomentEmp);
    if (!emp || !newMomentTrigger || !newMomentMessage) { toast.error("请填写必要信息"); return; }
    const mt = MOMENT_TYPES.find((t) => t.value === newMomentType);
    const moment: MotivationMoment = {
      id: `m${Date.now()}`,
      employeeName: emp.name,
      momentType: newMomentType,
      icon: mt?.icon ?? "🎯",
      triggerEvent: newMomentTrigger,
      ceoMessage: newMomentMessage,
      deliveryMethod: newMomentDelivery,
      visibility: newMomentVisibility,
      kpiBonus: newMomentKpiBonus,
      generalPoints: newMomentPoints,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      reactions: 0,
    };
    setMoments((prev) => [moment, ...prev]);
    toast.success(`激励时刻已创建: ${emp.name}`);
    setShowCreateDialog(false);
    setNewMomentTrigger("");
    setNewMomentMessage("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Heart className="h-5 w-5 text-amber-500" /> 激励墙</h2>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> 创建激励时刻
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Motivation Wall - left 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          {moments.map((m) => (
            <Card key={m.id} className="border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{m.icon}</span>
                      <span className="font-semibold">{m.employeeName}</span>
                      <span className="text-sm text-muted-foreground">{m.triggerEvent}</span>
                    </div>
                    <p className="text-sm italic text-amber-700 bg-amber-50 rounded px-2 py-1">
                      CEO: "{m.ceoMessage}"
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">{m.deliveryMethod}</Badge>
                      <Badge variant="outline" className="text-xs">{m.visibility}</Badge>
                      {m.kpiBonus > 0 && <span className="text-amber-600">+{m.kpiBonus} KPI分</span>}
                      {m.generalPoints > 0 && <span className="text-blue-600">+{m.generalPoints} 积分</span>}
                      <span>{m.timestamp}</span>
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-lg">👍</p>
                    <p className="text-xs text-muted-foreground">{m.reactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Motivation Stats - right sidebar */}
        <div className="space-y-3">
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">本月激励统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时刻</span>
                <span className="font-semibold">{stats.total} 次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">平均反馈评分</span>
                <span className="font-semibold">{stats.avgReaction}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最多类型</span>
                <span className="font-semibold text-xs">{stats.topType}</span>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">连续达标排行</p>
                {[
                  { name: "洪小东", days: 21 },
                  { name: "马柯", days: 18 },
                  { name: "李大鹏", days: 14 },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="font-medium">{s.name}</span>
                    <span className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Flame className="h-3 w-3" /> {s.days}天
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Motivation Moment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-amber-500" /> 创建激励时刻</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>员工</Label>
                <Select value={newMomentEmp} onValueChange={setNewMomentEmp}>
                  <SelectTrigger><SelectValue placeholder="选择..." /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYEES.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>时刻类型</Label>
                <Select value={newMomentType} onValueChange={setNewMomentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>触发事件</Label>
              <Input value={newMomentTrigger} onChange={(e) => setNewMomentTrigger(e.target.value)} placeholder="描述触发这个激励时刻的具体事件..." />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Crown className="h-3 w-3 text-amber-500" /> CEO 寄语</Label>
              <Textarea
                value={newMomentMessage}
                onChange={(e) => setNewMomentMessage(e.target.value)}
                placeholder="用温暖且真诚的语言，让员工感受到被看见..."
                className="border-amber-200 focus:border-amber-400"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>推送方式</Label>
                <Select value={newMomentDelivery} onValueChange={setNewMomentDelivery}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["应用内", "闪烁附注", "团队广播", "一对一"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>可见范围</Label>
                <Select value={newMomentVisibility} onValueChange={setNewMomentVisibility}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["私密", "团队", "部门", "全公司"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>KPI 奖励分</Label>
                <Input type="number" min={0} max={100} value={newMomentKpiBonus} onChange={(e) => setNewMomentKpiBonus(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>通用积分</Label>
                <Input type="number" min={0} value={newMomentPoints} onChange={(e) => setNewMomentPoints(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleCreateMoment}>
              <Sparkles className="h-4 w-4 mr-1" /> 创建激励时刻
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Technical Breakthrough
// ---------------------------------------------------------------------------

function TechnicalBreakthroughTab() {
  const [sessions, setSessions] = useState(DEMO_SESSIONS);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDesc, setNewSessionDesc] = useState("");
  const [newSessionDifficulty, setNewSessionDifficulty] = useState("hard");

  const difficultyBadge = (d: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      moderate: { label: "中等", cls: "bg-blue-50 text-blue-700 border-blue-300" },
      hard: { label: "困难", cls: "bg-orange-50 text-orange-700 border-orange-300" },
      extreme: { label: "极难", cls: "bg-red-50 text-red-700 border-red-300" },
      breakthrough: { label: "突破级", cls: "bg-purple-50 text-purple-700 border-purple-300" },
    };
    const s = map[d] ?? map.moderate;
    return <Badge variant="outline" className={`${s.cls} text-xs`}>{s.label}</Badge>;
  };

  const sessionStatusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      open: { label: "待攻关", cls: "bg-red-50 text-red-700 border-red-300" },
      analyzing: { label: "分析中", cls: "bg-blue-50 text-blue-700 border-blue-300" },
      scheduled: { label: "已排期", cls: "bg-amber-50 text-amber-700 border-amber-300" },
      resolved: { label: "已解决", cls: "bg-green-50 text-green-700 border-green-300" },
    };
    const st = map[s] ?? map.open;
    return <Badge variant="outline" className={`${st.cls} text-xs`}>{st.label}</Badge>;
  };

  const analysisTools = [
    { name: "5M1E分析", desc: "Man/Machine/Material/Method/Measurement/Environment", icon: Settings },
    { name: "鱼骨图", desc: "Ishikawa Diagram — 因果分析", icon: Brain },
    { name: "FMEA", desc: "失效模式与影响分析", icon: AlertCircle },
    { name: "柏拉图", desc: "Pareto Analysis — 80/20法则", icon: TrendingUp },
    { name: "SPC", desc: "统计过程控制 — 控制图", icon: Activity },
    { name: "历史案例", desc: "知识库检索 — 相似问题对标", icon: Search },
  ];

  const openCount = sessions.filter((s) => s.status === "open" || s.status === "analyzing").length;
  const resolvedThisMonth = 7;
  const avgResolution = 2.8;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-amber-500" /> 技术攻关会议</h2>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowNewSession(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新建攻关
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sessions list - left 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className={`border transition-all ${expandedSession === session.id ? "ring-1 ring-amber-300" : ""}`}>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {difficultyBadge(session.difficulty)}
                    <span className="font-medium">{session.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sessionStatusBadge(session.status)}
                    <span className="text-xs text-muted-foreground">{session.daysOpen}天</span>
                    <span className="text-xs text-muted-foreground">by {session.requestedBy}</span>
                    {session.scheduledTime && <Badge variant="outline" className="text-xs bg-amber-50">{session.scheduledTime}</Badge>}
                    {expandedSession === session.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {expandedSession === session.id && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded p-3">{session.description}</p>

                    {/* Analysis Tools */}
                    <div>
                      <p className="text-sm font-medium mb-2">分析工具箱</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {analysisTools.map((tool) => (
                          <div key={tool.name} className="border rounded-lg p-2 flex items-center gap-2 hover:bg-muted/30 transition-colors">
                            <tool.icon className="h-4 w-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{tool.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs h-6 px-2 shrink-0 ml-auto">使用</Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Experts */}
                    <div>
                      <p className="text-sm font-medium mb-2">建议专家</p>
                      <div className="flex gap-2 flex-wrap">
                        {session.suggestedExperts.map((expert) => {
                          const emp = EMPLOYEES.find((e) => e.name === expert);
                          const presence = DEMO_PRESENCE.find((p) => p.name === expert);
                          return (
                            <div key={expert} className="border rounded-lg p-2 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">{expert[0]}</div>
                              <div>
                                <p className="text-sm font-medium">{expert}</p>
                                <div className="flex items-center gap-1">
                                  {emp?.expertise.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="text-xs py-0">{t}</Badge>)}
                                </div>
                              </div>
                              {presence && presenceIcon(presence.state)}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toast.success("协作会议已安排")}>
                        <Users className="h-4 w-4 mr-1" /> 安排协作会议
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toast.success("已链接知识库")}>
                        <FileText className="h-4 w-4 mr-1" /> 链接知识库
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assist Dashboard - right sidebar */}
        <Card className="bg-amber-50 border-amber-200 h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">攻关仪表盘</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">待解决</span><span className="font-semibold text-red-600">{openCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">平均解决周期</span><span className="font-semibold">{avgResolution} 天</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">本月已解决</span><span className="font-semibold text-green-600">{resolvedThisMonth}</span></div>
            <Separator />
            <p className="text-xs text-muted-foreground">热点领域</p>
            {[
              { domain: "清洗工艺", count: 4 },
              { domain: "PLC调试", count: 2 },
              { domain: "材料兼容", count: 1 },
            ].map((d) => (
              <div key={d.domain} className="flex justify-between">
                <span>{d.domain}</span>
                <Badge variant="secondary" className="text-xs">{d.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建技术攻关</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>问题标题</Label>
              <Input value={newSessionTitle} onChange={(e) => setNewSessionTitle(e.target.value)} placeholder="简要描述技术问题..." />
            </div>
            <div className="space-y-1">
              <Label>详细描述</Label>
              <Textarea value={newSessionDesc} onChange={(e) => setNewSessionDesc(e.target.value)} placeholder="包括现象、影响范围、已尝试方案..." rows={4} />
            </div>
            <div className="space-y-1">
              <Label>难度等级</Label>
              <Select value={newSessionDifficulty} onValueChange={setNewSessionDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderate">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                  <SelectItem value="extreme">极难</SelectItem>
                  <SelectItem value="breakthrough">突破级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSession(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
              if (!newSessionTitle) { toast.error("请输入标题"); return; }
              setSessions((prev) => [{
                id: `s${Date.now()}`,
                title: newSessionTitle,
                difficulty: newSessionDifficulty as TechSession["difficulty"],
                status: "open",
                requestedBy: "CEO",
                daysOpen: 0,
                description: newSessionDesc,
                suggestedExperts: ["金晓锋", "洪小东"],
              }, ...prev]);
              toast.success("攻关会议已创建");
              setShowNewSession(false);
              setNewSessionTitle("");
              setNewSessionDesc("");
            }}>
              创建攻关
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 5: Team Presence
// ---------------------------------------------------------------------------

function TeamPresenceTab() {
  const [presence] = useState(DEMO_PRESENCE);

  const zones = [
    { id: "z1", name: "清洗车间A", x: 50, y: 50, w: 160, h: 100 },
    { id: "z2", name: "清洗车间B", x: 230, y: 50, w: 160, h: 100 },
    { id: "z3", name: "调试区T7", x: 410, y: 50, w: 140, h: 100 },
    { id: "z4", name: "设计室/研发", x: 50, y: 170, w: 160, h: 80 },
    { id: "z5", name: "办公区", x: 230, y: 170, w: 160, h: 80 },
    { id: "z6", name: "会议室", x: 410, y: 170, w: 140, h: 80 },
  ];

  const empPositions: Record<string, { zone: string; cx: number; cy: number }> = {
    金晓锋: { zone: "z1", cx: 100, cy: 90 },
    洪小东: { zone: "z2", cx: 300, cy: 80 },
    李大鹏: { zone: "z3", cx: 470, cy: 90 },
    洪香龙: { zone: "z4", cx: 110, cy: 205 },
    黄晓兰: { zone: "z5", cx: 280, cy: 200 },
    倪微薇: { zone: "z5", cx: 340, cy: 210 },
    王秀萍: { zone: "z5", cx: 300, cy: 220 },
    马柯: { zone: "z6", cx: 460, cy: 200 },
    杨勇: { zone: "z6", cx: 500, cy: 210 },
    胡杨: { zone: "z4", cx: 160, cy: 215 },
  };

  const stateColors: Record<string, string> = {
    focused: "#22c55e",
    arrived: "#3b82f6",
    in_meeting: "#eab308",
    break: "#9ca3af",
    offline: "#ef4444",
  };

  const pendingTriggers = [
    { emp: "金晓锋", condition: "到位", task: "清洗温度优化挑战" },
    { emp: "杨勇", condition: "会议结束", task: "T14调试支援" },
  ];

  return (
    <div className="space-y-4">
      {/* Factory floor mini-map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500" /> 厂区在位地图</CardTitle>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 600 280" className="w-full max-w-2xl mx-auto border rounded-lg bg-gray-50">
            {/* Zones */}
            {zones.map((z) => (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={6} fill="white" stroke="#d1d5db" strokeWidth={1.5} />
                <text x={z.x + z.w / 2} y={z.y + 16} textAnchor="middle" className="text-[10px] fill-gray-500 font-medium">{z.name}</text>
              </g>
            ))}
            {/* Employee dots */}
            {presence.map((p) => {
              const pos = empPositions[p.name];
              if (!pos) return null;
              const color = stateColors[p.state] ?? "#9ca3af";
              return (
                <g key={p.employeeId}>
                  <circle cx={pos.cx} cy={pos.cy} r={8} fill={color} opacity={p.state === "offline" ? 0.4 : 0.9} />
                  <text x={pos.cx} y={pos.cy + 20} textAnchor="middle" className="text-[9px] fill-gray-700 font-medium">{p.name}</text>
                  {p.state === "focused" && (
                    <circle cx={pos.cx} cy={pos.cy} r={11} fill="none" stroke={color} strokeWidth={1} opacity={0.5}>
                      <animate attributeName="r" from="11" to="16" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
            {/* Legend */}
            {[
              { label: "专注", color: "#22c55e", y: 265 },
              { label: "到位", color: "#3b82f6", y: 265 },
              { label: "会议", color: "#eab308", y: 265 },
              { label: "休息", color: "#9ca3af", y: 265 },
              { label: "未到", color: "#ef4444", y: 265 },
            ].map((l, i) => (
              <g key={l.label}>
                <circle cx={80 + i * 100} cy={l.y} r={4} fill={l.color} />
                <text x={80 + i * 100 + 8} y={l.y + 4} className="text-[9px] fill-gray-600">{l.label}</text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>

      {/* Team Presence Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">团队在位状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>区域</TableHead>
                  <TableHead>自</TableHead>
                  <TableHead>今日工时</TableHead>
                  <TableHead>待办任务</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presence.map((p) => (
                  <TableRow key={p.employeeId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{presenceIcon(p.state)}</TableCell>
                    <TableCell className="text-sm">{p.zone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.since}</TableCell>
                    <TableCell className="text-sm">{p.todayHours > 0 ? `${p.todayHours}h` : "-"}</TableCell>
                    <TableCell>
                      {p.pendingTasks > 0 ? (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">{p.pendingTasks}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Smart Push Trigger panel */}
      <Card className="border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> 智能推送触发器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">当员工状态满足条件时，自动推送预定任务</p>
          {pendingTriggers.map((trigger, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <div className="w-2 h-2 rounded-full bg-amber-400" style={{ animation: "flash 1.5s infinite" }} />
              <div className="flex-1 text-sm">
                等待 <span className="font-semibold">{trigger.emp}</span>{" "}
                <Badge variant="outline" className="text-xs mx-1">{trigger.condition}</Badge>{" "}
                后推送 <span className="font-medium text-amber-700">"{trigger.task}"</span>
              </div>
              <Timer className="h-4 w-4 text-amber-400" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 6: Performance Calendar
// ---------------------------------------------------------------------------

function PerformanceCalendarTab() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("全部");

  // Generate March 2026 calendar
  const marchDays = useMemo(() => {
    const days: { date: string; dayNum: number; events: CalendarEvent[] }[] = [];
    for (let d = 1; d <= 31; d++) {
      const dateStr = `2026-03-${String(d).padStart(2, "0")}`;
      const events = DEMO_CALENDAR_EVENTS.filter((e) => e.date === dateStr);
      days.push({ date: dateStr, dayNum: d, events });
    }
    return days;
  }, []);

  // March 2026 starts on Sunday (day 0)
  const firstDayOffset = 0; // Sunday

  const dayEvents = selectedDay ? DEMO_CALENDAR_EVENTS.filter((e) => e.date === selectedDay) : [];

  const filteredTimeline = useMemo(() => {
    if (selectedEmployee === "全部") return DEMO_CALENDAR_EVENTS;
    return DEMO_CALENDAR_EVENTS.filter((e) => e.employeeName === selectedEmployee);
  }, [selectedEmployee]);

  const eventTypeLabel: Record<string, string> = {
    kpi_milestone: "KPI 里程碑",
    task_completed: "任务完成",
    motivation: "激励时刻",
    kpi_alert: "KPI 预警",
    stretch_goal: "超越目标",
  };

  const eventTypeIcon: Record<string, typeof CheckCircle2> = {
    kpi_milestone: Star,
    task_completed: CheckCircle2,
    motivation: Heart,
    kpi_alert: AlertTriangle,
    stretch_goal: Rocket,
  };

  const streakBoard = [
    { name: "洪小东", days: 21, type: "全任务达标" },
    { name: "马柯", days: 18, type: "KPI全绿" },
    { name: "李大鹏", days: 14, type: "按时交付" },
    { name: "黄晓兰", days: 12, type: "零差错" },
    { name: "金晓锋", days: 9, type: "工艺改进" },
  ];

  return (
    <div className="space-y-4">
      {/* Monthly Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-500" /> 2026年3月 绩效日历</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
              <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`pad-${i}`} />)}
            {marchDays.map((day) => {
              const isToday = day.date === "2026-03-22";
              const isSelected = day.date === selectedDay;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                  className={`relative p-1.5 rounded-lg text-sm border transition-all ${
                    isSelected ? "ring-2 ring-amber-400 bg-amber-50 border-amber-300" :
                    isToday ? "bg-amber-50 border-amber-200 font-bold" :
                    day.events.length > 0 ? "hover:bg-muted/50 border-transparent" :
                    "border-transparent text-muted-foreground"
                  }`}
                >
                  <span>{day.dayNum}</span>
                  {day.events.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {[...new Set(day.events.map((e) => e.type))].slice(0, 4).map((type, i) => (
                        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${calendarEventDot(type)}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            {[
              { label: "KPI里程碑", cls: "bg-green-500" },
              { label: "任务完成", cls: "bg-blue-500" },
              { label: "激励时刻", cls: "bg-amber-500" },
              { label: "KPI预警", cls: "bg-red-500" },
              { label: "超越目标", cls: "bg-purple-500" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${l.cls}`} /> {l.label}
              </span>
            ))}
          </div>

          {/* Selected day events */}
          {selectedDay && (
            <div className="mt-3 border-t pt-3 space-y-2">
              <p className="text-sm font-medium">{selectedDay} 事件</p>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">当天无记录</p>
              ) : (
                dayEvents.map((evt, i) => {
                  const Icon = eventTypeIcon[evt.type] ?? CircleDot;
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${calendarEventDot(evt.type)}`} />
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium">{evt.employeeName}</span>
                        <span className="text-muted-foreground ml-1">{evt.description}</span>
                        {(evt.kpiPoints ?? 0) > 0 && <span className="ml-2 text-amber-600 text-xs">+{evt.kpiPoints} pts</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Performance Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">员工绩效时间线</CardTitle>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {EMPLOYEES.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredTimeline.map((evt, i) => {
              const Icon = eventTypeIcon[evt.type] ?? CircleDot;
              return (
                <div key={i} className="flex items-start gap-3 py-1.5 border-b border-dashed last:border-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{evt.date}</span>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${calendarEventDot(evt.type)}`} />
                  <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="text-sm flex-1">
                    <span className="font-medium">{evt.employeeName}</span>
                    <span className="text-muted-foreground ml-1">{evt.description}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{eventTypeLabel[evt.type] ?? evt.type}</Badge>
                    {(evt.kpiPoints ?? 0) > 0 && <span className="ml-1 text-amber-600 text-xs font-medium">+{evt.kpiPoints}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Streak Board */}
      <Card className="border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-amber-500" /> 连续达标排行榜</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {streakBoard.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border hover:bg-amber-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{s.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-amber-600">{s.days}</span>
                  <span className="text-xs text-muted-foreground">天</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TABS = [
  { label: "任务指挥", icon: ClipboardList },
  { label: "KPI 前瞻", icon: Target },
  { label: "精准激励", icon: Heart },
  { label: "技术攻关", icon: Wrench },
  { label: "团队在位", icon: MapPin },
  { label: "绩效日历", icon: CalendarDays },
];

export default function CeoMotivationCommand() {
  const [activeTab, setActiveTab] = useState(0);
  const [, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4 p-4">
      {/* Flash animation style */}
      <style>{`@keyframes flash { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-7 w-7 text-amber-500" /> CEO 智能激励指挥台
          </h1>
          <p className="text-muted-foreground">Smart Motivation Command — 前瞻KPI·精准激励·技术攻关</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">CEO 专属</Badge>
          <Button variant="outline" size="sm" onClick={() => { setRefreshKey((k) => k + 1); toast.success("数据已刷新"); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> 刷新
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <TaskCommandTab />}
      {activeTab === 1 && <KpiForesightTab />}
      {activeTab === 2 && <PrecisionMotivationTab />}
      {activeTab === 3 && <TechnicalBreakthroughTab />}
      {activeTab === 4 && <TeamPresenceTab />}
      {activeTab === 5 && <PerformanceCalendarTab />}
    </div>
  );
}
