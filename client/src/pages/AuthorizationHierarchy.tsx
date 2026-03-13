import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Shield, Star, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Users, FileText, BarChart3, Award, ArrowRight, Upload, Download,
  Filter, Search, Calendar, Zap, Lock, Trophy, Eye, GitBranch,
} from "lucide-react";

// ─── demo: Authorization policy matrix ───────────────────────────────────────
const DOMAINS = [
  { key: "travel",      label: "差旅费用",  icon: "✈️" },
  { key: "procurement", label: "采购申请",  icon: "📦" },
  { key: "budget",      label: "预算调整",  icon: "💰" },
  { key: "project",     label: "项目立项",  icon: "📋" },
  { key: "customer",    label: "客户折扣",  icon: "🤝" },
  { key: "material",    label: "物料领用",  icon: "🔧" },
  { key: "expense",     label: "费用报销",  icon: "🧾" },
  { key: "contract",    label: "合同签署",  icon: "📝" },
] as const;

// Thresholds in RMB; null = unlimited (CEO only)
const POLICY_MATRIX: Record<string, { l1: string; l2: string; l3: string; l4: string; l5: string }> = {
  travel:      { l1: "≤2,000", l2: "≤8,000",  l3: "≤20,000",  l4: "≤50,000",  l5: "无限额" },
  procurement: { l1: "≤5,000", l2: "≤30,000", l3: "≤100,000", l4: "≤500,000", l5: "无限额" },
  budget:      { l1: "≤3,000", l2: "≤15,000", l3: "≤50,000",  l4: "≤200,000", l5: "无限额" },
  project:     { l1: "≤10,000",l2: "≤50,000", l3: "≤200,000", l4: "≤1,000,000",l5: "无限额" },
  customer:    { l1: "≤3%",    l2: "≤8%",     l3: "≤15%",     l4: "≤25%",     l5: "无限额" },
  material:    { l1: "≤500",   l2: "≤2,000",  l3: "≤10,000",  l4: "≤50,000",  l5: "无限额" },
  expense:     { l1: "≤2,000", l2: "≤10,000", l3: "≤30,000",  l4: "≤100,000", l5: "无限额" },
  contract:    { l1: "≤50,000",l2: "≤200,000",l3: "≤500,000", l4: "≤2,000,000",l5: "无限额" },
};

const LEVELS = [
  { key: "l1", label: "L1 组长/主管",    color: "bg-green-100 text-green-800",  dot: "bg-green-500" },
  { key: "l2", label: "L2 部门经理",     color: "bg-blue-100 text-blue-800",    dot: "bg-blue-500" },
  { key: "l3", label: "L3 事业部经理",   color: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  { key: "l4", label: "L4 副总/总监",    color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  { key: "l5", label: "L5 董事长(倪亚东)", color: "bg-red-100 text-red-800",   dot: "bg-red-500" },
];

// ─── demo: Credit tier data ───────────────────────────────────────────────────
const MY_CREDIT = {
  name: "焦斌",
  score: 87,
  tier: "金牌",
  tierColor: "bg-yellow-100 text-yellow-800 border-yellow-300",
  components: [
    { label: "审批合规", weight: 40, score: 92, color: "bg-green-500" },
    { label: "财务诚信", weight: 30, score: 88, color: "bg-blue-500" },
    { label: "任务交付", weight: 20, score: 79, color: "bg-indigo-500" },
    { label: "同事信任", weight: 10, score: 74, color: "bg-purple-500" },
  ],
  greenChannelEligible: true,
  history: [82, 84, 83, 86, 85, 87],
};

// ─── demo: Green channel usage history ───────────────────────────────────────
const GREEN_CHANNEL_HISTORY = [
  { id: "GC-2026-031", domain: "差旅费用", amount: "¥3,800", date: "2026-03-01", deadline: "2026-03-08", status: "已补交", daysLeft: null },
  { id: "GC-2026-027", domain: "采购申请", amount: "¥12,000", date: "2026-02-21", deadline: "2026-02-28", status: "已补交", daysLeft: null },
  { id: "GC-2026-019", domain: "差旅费用", amount: "¥2,600", date: "2026-02-03", deadline: "2026-02-10", status: "已补交", daysLeft: null },
];

// ─── demo: Post-facto pending submissions ─────────────────────────────────────
const POSTFACTO_PENDING = [
  { id: "PF-2026-044", applicant: "吴卫成", domain: "客户折扣", amount: "12%",     deadline: "2026-03-15", hoursLeft: 38, creditImpact: -2 },
  { id: "PF-2026-043", applicant: "韩保程", domain: "物料领用", amount: "¥8,500",  deadline: "2026-03-14", hoursLeft: 18, creditImpact: -3 },
  { id: "PF-2026-041", applicant: "张洵",   domain: "差旅费用", amount: "¥4,200",  deadline: "2026-03-14", hoursLeft:  6, creditImpact: -5 },
  { id: "PF-2026-039", applicant: "焦斌",   domain: "费用报销", amount: "¥1,800",  deadline: "2026-03-16", hoursLeft: 62, creditImpact: -1 },
];

// ─── demo: Integrity leaderboard ─────────────────────────────────────────────
const LEADERBOARD = [
  { rank: 1,  name: "沈迎凤", dept: "采购部",       score: 98, tier: "白金", badge: "🏆", streak: 12 },
  { rank: 2,  name: "黄晓兰", dept: "财务部",       score: 96, tier: "白金", badge: "🥇", streak: 8  },
  { rank: 3,  name: "周辉",   dept: "事业三部",     score: 94, tier: "白金", badge: "🥈", streak: 10 },
  { rank: 4,  name: "徐树奎", dept: "事业二部",     score: 92, tier: "金牌", badge: "🥉", streak: 6  },
  { rank: 5,  name: "张洵",   dept: "技术部",       score: 91, tier: "金牌", badge: "⭐", streak: 4  },
  { rank: 6,  name: "焦斌",   dept: "工程部",       score: 87, tier: "金牌", badge: "⭐", streak: 3  },
  { rank: 7,  name: "吴卫成", dept: "销售部",       score: 85, tier: "银牌", badge: "⭐", streak: 2  },
  { rank: 8,  name: "韩保程", dept: "生产部",       score: 82, tier: "银牌", badge: "⭐", streak: 1  },
  { rank: 9,  name: "王芳",   dept: "行政部",       score: 80, tier: "银牌", badge: "⭐", streak: 0  },
  { rank: 10, name: "李明",   dept: "研发部",       score: 78, tier: "铜牌", badge: "⭐", streak: 0  },
];

const DEPT_COMPARISON = [
  { dept: "财务部",   avg: 93, color: "bg-green-500" },
  { dept: "采购部",   avg: 91, color: "bg-blue-500"  },
  { dept: "技术部",   avg: 88, color: "bg-indigo-500" },
  { dept: "事业三部", avg: 86, color: "bg-purple-500" },
  { dept: "事业二部", avg: 84, color: "bg-orange-500" },
  { dept: "销售部",   avg: 83, color: "bg-yellow-500" },
  { dept: "生产部",   avg: 80, color: "bg-amber-500"  },
  { dept: "行政部",   avg: 79, color: "bg-gray-500"   },
];

// ─── demo: Approval dashboard ─────────────────────────────────────────────────
const APPROVAL_PENDING = [
  { domain: "差旅费用", pending: 4,  avgDays: 1.2, level: "L2 部门经理" },
  { domain: "采购申请", pending: 7,  avgDays: 2.1, level: "L3 事业部经理" },
  { domain: "预算调整", pending: 2,  avgDays: 3.5, level: "L4 副总/总监" },
  { domain: "合同签署", pending: 1,  avgDays: 5.8, level: "L5 董事长" },
  { domain: "费用报销", pending: 12, avgDays: 0.8, level: "L1 组长/主管" },
  { domain: "物料领用", pending: 3,  avgDays: 0.5, level: "L1 组长/主管" },
  { domain: "客户折扣", pending: 2,  avgDays: 2.4, level: "L3 事业部经理" },
  { domain: "项目立项", pending: 1,  avgDays: 4.2, level: "L4 副总/总监" },
];

const RECENT_APPROVALS = [
  { id: "APR-2026-0891", applicant: "吴卫成", domain: "差旅费用",  amount: "¥3,200", approver: "周辉",   decision: "通过", date: "2026-03-12" },
  { id: "APR-2026-0890", applicant: "韩保程", domain: "物料领用",  amount: "¥1,800", approver: "张洵",   decision: "通过", date: "2026-03-12" },
  { id: "APR-2026-0889", applicant: "焦斌",   domain: "采购申请",  amount: "¥28,000", approver: "徐树奎",decision: "通过", date: "2026-03-11" },
  { id: "APR-2026-0888", applicant: "李明",   domain: "预算调整",  amount: "¥15,000", approver: "沈迎凤",decision: "驳回", date: "2026-03-11" },
  { id: "APR-2026-0887", applicant: "王芳",   domain: "费用报销",  amount: "¥4,500", approver: "黄晓兰", decision: "通过", date: "2026-03-10" },
];

// ─── demo: Active delegations ─────────────────────────────────────────────────
const DELEGATIONS = [
  { id: "DEL-001", delegator: "周辉",   delegate: "张洵",   domain: "差旅费用", maxAmount: "¥20,000", from: "2026-03-10", to: "2026-03-20", status: "生效中" },
  { id: "DEL-002", delegator: "徐树奎", delegate: "焦斌",   domain: "物料领用", maxAmount: "¥10,000", from: "2026-03-01", to: "2026-03-31", status: "生效中" },
  { id: "DEL-003", delegator: "沈迎凤", delegate: "韩保程", domain: "采购申请", maxAmount: "¥30,000", from: "2026-02-15", to: "2026-03-01", status: "已过期" },
];

// ─── demo: Audit trail ────────────────────────────────────────────────────────
const AUDIT_TRAIL = [
  { id: "AUD-5521", time: "2026-03-12 14:32", actor: "倪亚东",  event: "合同批准",    domain: "合同签署", amount: "¥1,800,000", result: "通过",  channel: "标准" },
  { id: "AUD-5520", time: "2026-03-12 11:18", actor: "周辉",    event: "绿通申请",    domain: "差旅费用", amount: "¥3,800",     result: "批准",  channel: "绿通" },
  { id: "AUD-5519", time: "2026-03-12 09:45", actor: "沈迎凤",  event: "采购批准",    domain: "采购申请", amount: "¥85,000",    result: "通过",  channel: "标准" },
  { id: "AUD-5518", time: "2026-03-11 16:22", actor: "黄晓兰",  event: "预算驳回",    domain: "预算调整", amount: "¥15,000",    result: "驳回",  channel: "标准" },
  { id: "AUD-5517", time: "2026-03-11 10:05", actor: "徐树奎",  event: "委托授权",    domain: "物料领用", amount: "¥10,000",    result: "生效",  channel: "委托" },
  { id: "AUD-5516", time: "2026-03-10 15:33", actor: "吴卫成",  event: "绿通申请",    domain: "客户折扣", amount: "18%",        result: "批准",  channel: "绿通" },
  { id: "AUD-5515", time: "2026-03-10 09:10", actor: "韩保程",  event: "逾期补交",    domain: "物料领用", amount: "¥8,500",     result: "扣分",  channel: "事后" },
  { id: "AUD-5514", time: "2026-03-09 14:00", actor: "焦斌",    event: "采购批准",    domain: "采购申请", amount: "¥28,000",    result: "通过",  channel: "标准" },
];

// ─── demo: Green channel rules per domain ─────────────────────────────────────
const GREEN_CHANNEL_RULES: Record<string, string[]> = {
  travel:      ["信用等级 ≥ 金牌", "单笔 ≤ 个人授权额的150%", "7日内必须完成补交", "逾期扣3信用分"],
  procurement: ["信用等级 ≥ 白金", "单笔 ≤ 30,000元", "3日内必须提交发票", "逾期扣5信用分"],
  expense:     ["信用等级 ≥ 金牌", "单笔 ≤ 5,000元",  "5日内必须补交凭证", "逾期扣2信用分"],
  material:    ["信用等级 ≥ 银牌", "单次 ≤ 2,000元",  "次日必须补交领料单", "逾期扣3信用分"],
  customer:    ["信用等级 ≥ 白金", "折扣率 ≤ 10%",    "48小时内完成审批补录", "逾期扣5信用分"],
  budget:      ["信用等级 ≥ 白金", "调整幅度 ≤ 5%",   "5日内必须完成补批", "逾期扣5信用分"],
  project:     ["信用等级 ≥ 白金", "单项 ≤ 50,000元", "7日内必须完成立项审批", "逾期扣8信用分"],
  contract:    ["信用等级 ≥ 白金+", "不支持绿色通道",  "所有合同必须提前走完审批", ""],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, { label: string; color: string; minScore: number }> = {
  白金: { label: "白金", color: "bg-purple-100 text-purple-800 border-purple-300", minScore: 95 },
  金牌: { label: "金牌", color: "bg-yellow-100 text-yellow-800 border-yellow-300", minScore: 80 },
  银牌: { label: "银牌", color: "bg-gray-100 text-gray-700 border-gray-300",       minScore: 65 },
  铜牌: { label: "铜牌", color: "bg-amber-100 text-amber-800 border-amber-300",    minScore: 50 },
  受限: { label: "受限", color: "bg-red-100 text-red-800 border-red-300",          minScore: 0  },
};

function getTier(score: number): string {
  if (score >= 95) return "白金";
  if (score >= 80) return "金牌";
  if (score >= 65) return "银牌";
  if (score >= 50) return "铜牌";
  return "受限";
}

export default function AuthorizationHierarchy() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("policy");

  // Tab 3 state
  const [checkDomain, setCheckDomain] = useState("travel");
  const [checkAmount, setCheckAmount] = useState("");

  // Tab 7 state
  const [delegateForm, setDelegateForm] = useState({ domain: "", delegate: "", maxAmount: "", to: "" });

  // Tab 8 state
  const [auditSearch, setAuditSearch] = useState("");
  const [auditDomain, setAuditDomain] = useState("all");
  const [auditChannel, setAuditChannel] = useState("all");

  // Green channel eligibility check (demo logic)
  const greenCheckResult = (() => {
    const amt = parseFloat(checkAmount.replace(/[^0-9.]/g, ""));
    if (!checkAmount || isNaN(amt)) return null;
    const rules = GREEN_CHANNEL_RULES[checkDomain] ?? [];
    const eligible = MY_CREDIT.greenChannelEligible && amt < 30000;
    return { eligible, rules, domain: DOMAINS.find(d => d.key === checkDomain)?.label };
  })();

  // Filtered audit trail
  const filteredAudit = AUDIT_TRAIL.filter(row => {
    const matchSearch = !auditSearch || row.actor.includes(auditSearch) || row.event.includes(auditSearch);
    const matchDomain = auditDomain === "all" || row.domain.includes(auditDomain);
    const matchChannel = auditChannel === "all" || row.channel === auditChannel;
    return matchSearch && matchDomain && matchChannel;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            {isZh ? "授权层级审批制度" : "Authorization Hierarchy System"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isZh
              ? "五级审批矩阵 · 信用等级管理 · 绿色通道 · 事后补交 · 委托授权 · 审计追踪"
              : "5-Level Approval Matrix · Credit Tiers · Green Channel · Post-Facto · Delegation · Audit"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-green-100 text-green-800 border-green-300 border text-sm px-3 py-1">
            <Zap className="w-3 h-3 mr-1 inline" />
            {isZh ? "绿通资格: 有效" : "Green Channel: Eligible"}
          </Badge>
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-sm px-3 py-1">
            <Star className="w-3 h-3 mr-1 inline" />
            {isZh ? "信用: 金牌 87分" : "Credit: Gold 87pts"}
          </Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="policy"    className="text-xs">{isZh ? "授权策略总览" : "Policy"}</TabsTrigger>
          <TabsTrigger value="credit"    className="text-xs">{isZh ? "我的信用等级" : "Credit"}</TabsTrigger>
          <TabsTrigger value="green"     className="text-xs">{isZh ? "绿色通道" : "Green Chan."}</TabsTrigger>
          <TabsTrigger value="postfacto" className="text-xs">{isZh ? "事后补交中心" : "Post-Facto"}</TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs">{isZh ? "诚信排行榜" : "Leaderboard"}</TabsTrigger>
          <TabsTrigger value="approval"  className="text-xs">{isZh ? "审批看板" : "Approvals"}</TabsTrigger>
          <TabsTrigger value="delegation" className="text-xs">{isZh ? "授权委托" : "Delegation"}</TabsTrigger>
          <TabsTrigger value="audit"     className="text-xs">{isZh ? "审计报告" : "Audit"}</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 1: 授权策略总览
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="policy" className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground font-medium mr-1">{isZh ? "审批层级：" : "Approval Levels:"}</span>
            {LEVELS.map(lv => (
              <Badge key={lv.key} className={`${lv.color} border text-xs`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${lv.dot}`} />
                {lv.label}
              </Badge>
            ))}
          </div>

          {/* Matrix table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                {isZh ? "五级授权阈值矩阵" : "5-Level Authorization Threshold Matrix"}
              </CardTitle>
              <CardDescription>
                {isZh ? "各业务域在不同审批层级下的授权金额上限。超过L4须提交董事长审批。" : "Authorization ceilings per domain per level. Above L4 requires Chairman approval."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{isZh ? "业务域" : "Domain"}</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        L1 组长/主管
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        L2 部门经理
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                        L3 事业部经理
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                        L4 副总/总监
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        L5 董事长
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DOMAINS.map(domain => {
                    const p = POLICY_MATRIX[domain.key];
                    return (
                      <TableRow key={domain.key}>
                        <TableCell className="font-medium">
                          <span className="mr-1">{domain.icon}</span>
                          {domain.label}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border border-green-200">{p.l1}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200">{p.l2}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">{p.l3}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-200">{p.l4}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800 border border-red-200 font-bold">{p.l5}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "业务域数量",   value: "8",    icon: GitBranch, color: "text-blue-600" },
              { label: "审批层级",     value: "5级",   icon: Users,     color: "text-green-600" },
              { label: "绿通资格员工", value: "47人",  icon: Zap,       color: "text-yellow-600" },
              { label: "本月审批量",   value: "312件", icon: CheckCircle2, color: "text-purple-600" },
            ].map(stat => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{stat.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color} flex items-center gap-1`}>
                    <stat.icon className="w-5 h-5" />
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 2: 我的信用等级
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="credit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Big score card */}
            <Card className="col-span-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
              <div className="text-6xl font-black text-yellow-600 mb-2">{MY_CREDIT.score}</div>
              <Badge className={`${MY_CREDIT.tierColor} border text-base px-4 py-1 mb-3`}>
                <Trophy className="w-4 h-4 mr-1 inline" />
                {MY_CREDIT.tier} 会员
              </Badge>
              <p className="text-muted-foreground text-sm text-center">
                {MY_CREDIT.name} · 工程部
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-md px-3 py-1">
                <CheckCircle2 className="w-4 h-4" />
                {isZh ? "绿色通道资格：有效" : "Green Channel: Eligible"}
              </div>
            </Card>

            {/* Component bars */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "信用评分组成" : "Credit Score Components"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MY_CREDIT.components.map(comp => (
                  <div key={comp.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{comp.label}</span>
                      <span className="text-muted-foreground">权重 {comp.weight}% · <span className="font-bold text-foreground">{comp.score}分</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={comp.score} className="h-3 flex-1" />
                      <span className="text-xs w-12 text-right">{comp.score}/100</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Credit history trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                {isZh ? "近6个月信用趋势" : "6-Month Credit Trend"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-24">
                {MY_CREDIT.history.map((score, i) => {
                  const months = ["10月", "11月", "12月", "1月", "2月", "3月"];
                  const height = (score / 100) * 96;
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 gap-1">
                      <span className="text-xs font-semibold text-foreground">{score}</span>
                      <div
                        className="w-full rounded-t-sm bg-yellow-400 transition-all"
                        style={{ height: `${height}px` }}
                      />
                      <span className="text-xs text-muted-foreground">{months[i]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tier table reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "信用等级标准" : "Credit Tier Standards"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "等级" : "Tier"}</TableHead>
                    <TableHead>{isZh ? "分数区间" : "Score Range"}</TableHead>
                    <TableHead>{isZh ? "绿通资格" : "Green Channel"}</TableHead>
                    <TableHead>{isZh ? "单次绿通上限" : "Green Chan. Limit"}</TableHead>
                    <TableHead>{isZh ? "委托授权权限" : "Delegation Rights"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { tier: "白金", range: "95-100", green: "✓ 全域",  limit: "¥50,000", delegate: "✓ 可委托" },
                    { tier: "金牌", range: "80-94",  green: "✓ 部分域", limit: "¥20,000", delegate: "✓ 可委托" },
                    { tier: "银牌", range: "65-79",  green: "✓ 限制域", limit: "¥5,000",  delegate: "✗ 不可委托" },
                    { tier: "铜牌", range: "50-64",  green: "✗ 不可用", limit: "—",       delegate: "✗ 不可委托" },
                    { tier: "受限", range: "0-49",   green: "✗ 不可用", limit: "—",       delegate: "✗ 不可委托" },
                  ].map(row => (
                    <TableRow key={row.tier}>
                      <TableCell>
                        <Badge className={`${TIER_CONFIG[row.tier]?.color ?? ""} border`}>{row.tier}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{row.range}</TableCell>
                      <TableCell className={row.green.startsWith("✓") ? "text-green-600" : "text-red-500"}>{row.green}</TableCell>
                      <TableCell>{row.limit}</TableCell>
                      <TableCell className={row.delegate.startsWith("✓") ? "text-green-600" : "text-red-500"}>{row.delegate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 3: 绿色通道
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="green" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Eligibility checker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  {isZh ? "绿通资格实时检查" : "Green Channel Eligibility Checker"}
                </CardTitle>
                <CardDescription>
                  {isZh ? "输入业务域和金额，实时判断是否可走绿色通道" : "Select domain and amount to check green channel eligibility"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isZh ? "业务域" : "Domain"}</label>
                  <Select value={checkDomain} onValueChange={setCheckDomain}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map(d => (
                        <SelectItem key={d.key} value={d.key}>{d.icon} {d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isZh ? "金额 / 折扣率" : "Amount / Rate"}</label>
                  <Input
                    placeholder="例：3500 或 8%"
                    value={checkAmount}
                    onChange={e => setCheckAmount(e.target.value)}
                  />
                </div>
                {greenCheckResult && (
                  <div className={`rounded-lg p-4 border ${greenCheckResult.eligible ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-2 font-semibold mb-2">
                      {greenCheckResult.eligible
                        ? <><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-green-700">可走绿色通道</span></>
                        : <><AlertTriangle className="w-5 h-5 text-red-600" /><span className="text-red-700">不符合绿通条件</span></>
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {greenCheckResult.eligible
                        ? "您的信用等级（金牌）和申请金额符合绿色通道条件，可先执行后补交审批材料。"
                        : "当前申请超出绿通额度或您的信用等级不满足该域要求，请走正常审批流程。"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Domain rules reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isZh ? "绿通规则参考" : "Green Channel Rules"}</CardTitle>
                <CardDescription>{DOMAINS.find(d => d.key === checkDomain)?.label} — {isZh ? "适用条款" : "applicable rules"}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(GREEN_CHANNEL_RULES[checkDomain] ?? []).filter(Boolean).map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Usage history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "我的绿通使用记录" : "My Green Channel History"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "申请号" : "ID"}</TableHead>
                    <TableHead>{isZh ? "业务域" : "Domain"}</TableHead>
                    <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                    <TableHead>{isZh ? "申请日期" : "Date"}</TableHead>
                    <TableHead>{isZh ? "补交截止" : "Deadline"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {GREEN_CHANNEL_HISTORY.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell className="font-semibold">{row.amount}</TableCell>
                      <TableCell className="text-xs">{row.date}</TableCell>
                      <TableCell className="text-xs">{row.deadline}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 4: 事后补交中心
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="postfacto" className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardDescription>待补交总数</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">4</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>今日到期</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">2</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>本月已完成</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">11</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>逾期风险信用扣分</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">-11</div></CardContent>
            </Card>
          </div>

          {/* Pending list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                {isZh ? "待补交事项" : "Pending Submissions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "申请号" : "ID"}</TableHead>
                    <TableHead>{isZh ? "申请人" : "Applicant"}</TableHead>
                    <TableHead>{isZh ? "业务域" : "Domain"}</TableHead>
                    <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                    <TableHead>{isZh ? "截止日期" : "Deadline"}</TableHead>
                    <TableHead>{isZh ? "剩余时间" : "Time Left"}</TableHead>
                    <TableHead>{isZh ? "逾期扣分" : "Credit Impact"}</TableHead>
                    <TableHead>{isZh ? "操作" : "Action"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {POSTFACTO_PENDING.map(row => {
                    const urgent = row.hoursLeft < 24;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.id}</TableCell>
                        <TableCell className="font-medium">{row.applicant}</TableCell>
                        <TableCell>{row.domain}</TableCell>
                        <TableCell>{row.amount}</TableCell>
                        <TableCell className="text-xs">{row.deadline}</TableCell>
                        <TableCell>
                          <Badge className={urgent ? "bg-red-100 text-red-800 border border-red-300" : "bg-amber-100 text-amber-800"}>
                            {urgent && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                            {row.hoursLeft}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-red-600 font-semibold">{row.creditImpact}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Upload className="w-3 h-3" />
                            {isZh ? "上传" : "Upload"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Upload interface mock */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "材料上传" : "Document Upload"}</CardTitle>
              <CardDescription>{isZh ? "支持 PDF、图片、Office 文件，单文件上限 20MB" : "PDF, images, Office files — max 20MB each"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{isZh ? "拖拽文件到此处，或点击选择" : "Drag files here or click to select"}</p>
                <Button variant="outline" size="sm">{isZh ? "选择文件" : "Browse Files"}</Button>
              </div>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {isZh
                  ? "警告：逾期未补交将自动扣除信用积分，严重逾期（超过48小时）将暂停绿色通道资格。"
                  : "Warning: Late submissions auto-deduct credit points. Overdue by 48h suspends green channel eligibility."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 5: 诚信排行榜
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="leaderboard" className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button variant="default" size="sm">{isZh ? "本月" : "Monthly"}</Button>
            <Button variant="outline" size="sm">{isZh ? "本季度" : "Quarterly"}</Button>
            <Button variant="outline" size="sm">{isZh ? "本年度" : "Annual"}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 10 leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  {isZh ? "诚信之星 Top 10" : "Integrity Star Top 10"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {LEADERBOARD.map(emp => (
                    <div
                      key={emp.rank}
                      className={`flex items-center gap-3 p-2 rounded-lg ${emp.rank <= 3 ? "bg-yellow-50 border border-yellow-200" : "hover:bg-muted/50"}`}
                    >
                      <span className="w-6 text-center font-bold text-lg">{emp.badge}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{emp.name}</span>
                          <span className="font-bold text-sm">{emp.score}分</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-muted-foreground">{emp.dept}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${TIER_CONFIG[emp.tier]?.color ?? ""} border`}>{emp.tier}</Badge>
                            {emp.streak > 0 && (
                              <span className="text-xs text-orange-500">🔥{emp.streak}月</span>
                            )}
                          </div>
                        </div>
                        <Progress value={emp.score} className="h-1 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department comparison */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {isZh ? "部门平均信用对比" : "Department Credit Comparison"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DEPT_COMPARISON.map(dept => (
                    <div key={dept.dept} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{dept.dept}</span>
                        <span className="font-semibold">{dept.avg}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div className={`h-2 rounded-full ${dept.color}`} style={{ width: `${dept.avg}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recognition wall */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    {isZh ? "荣誉榜" : "Recognition Wall"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: "沈迎凤", badge: "🏆 年度诚信冠军" },
                      { name: "黄晓兰", badge: "💎 财务零违规" },
                      { name: "周辉",   badge: "⚡ 效率达人" },
                      { name: "徐树奎", badge: "🌟 团队榜样" },
                    ].map(r => (
                      <div key={r.name} className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 text-xs">
                        <span>{r.badge}</span>
                        <span className="font-medium text-purple-700">{r.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 6: 审批看板
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="approval" className="space-y-4">
          {/* Domain-by-domain pending counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {APPROVAL_PENDING.map(row => (
              <Card key={row.domain}>
                <CardHeader className="pb-1">
                  <CardDescription className="text-xs">{row.domain}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-blue-600">{row.pending}</div>
                  <div className="text-xs text-muted-foreground mt-1">待审 · 均{row.avgDays}天</div>
                  <Badge className="bg-gray-100 text-gray-700 text-xs mt-1">{row.level}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Approval chain visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-600" />
                {isZh ? "审批链路示意 — 采购申请 ¥85,000" : "Approval Chain — Procurement ¥85,000"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { step: "发起", actor: "焦斌",   role: "工程师",      status: "done",    time: "03-11 09:00" },
                  { step: "L1审核", actor: "张洵", role: "技术组长",    status: "done",    time: "03-11 10:30" },
                  { step: "L2审核", actor: "周辉", role: "事业三部经理",status: "done",    time: "03-11 14:00" },
                  { step: "L3审核", actor: "徐树奎",role: "事业二部经理",status: "current", time: "进行中" },
                  { step: "完成",   actor: "—",    role: "—",           status: "pending",  time: "—" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex flex-col items-center p-3 rounded-lg border text-center min-w-[90px]
                      ${step.status === "done"    ? "bg-green-50 border-green-300" :
                        step.status === "current" ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300" :
                                                    "bg-gray-50 border-gray-200"}`}>
                      <span className="text-lg">
                        {step.status === "done" ? "✓" : step.status === "current" ? "⏳" : "○"}
                      </span>
                      <span className="text-xs font-semibold mt-1">{step.step}</span>
                      <span className="text-xs font-medium">{step.actor}</span>
                      <span className="text-xs text-muted-foreground">{step.role}</span>
                      <span className="text-xs text-muted-foreground mt-1">{step.time}</span>
                    </div>
                    {i < 4 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "近期审批记录" : "Recent Approvals"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "申请号" : "ID"}</TableHead>
                    <TableHead>{isZh ? "申请人" : "Applicant"}</TableHead>
                    <TableHead>{isZh ? "业务域" : "Domain"}</TableHead>
                    <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                    <TableHead>{isZh ? "审批人" : "Approver"}</TableHead>
                    <TableHead>{isZh ? "结果" : "Decision"}</TableHead>
                    <TableHead>{isZh ? "日期" : "Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_APPROVALS.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell>{row.applicant}</TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell className="font-semibold">{row.amount}</TableCell>
                      <TableCell>{row.approver}</TableCell>
                      <TableCell>
                        <Badge className={row.decision === "通过" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {row.decision}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 7: 授权委托
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="delegation" className="space-y-4">
          {/* Credit requirement note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {isZh
              ? "委托授权要求：委托人信用等级必须达到金牌及以上，且被委托人信用等级不得低于银牌。委托期间委托人仍承担全部法律责任。"
              : "Delegation requires: delegator ≥ Gold tier, delegate ≥ Silver tier. Delegator retains full legal liability during delegation period."}
          </div>

          {/* Active delegations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isZh ? "当前委托记录" : "Active Delegations"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "委托ID" : "ID"}</TableHead>
                    <TableHead>{isZh ? "委托人" : "Delegator"}</TableHead>
                    <TableHead>{isZh ? "被委托人" : "Delegate"}</TableHead>
                    <TableHead>{isZh ? "业务域" : "Domain"}</TableHead>
                    <TableHead>{isZh ? "额度上限" : "Max Amount"}</TableHead>
                    <TableHead>{isZh ? "有效期" : "Period"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                    <TableHead>{isZh ? "操作" : "Action"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DELEGATIONS.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="font-medium">{row.delegator}</TableCell>
                      <TableCell>{row.delegate}</TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{row.maxAmount}</TableCell>
                      <TableCell className="text-xs">{row.from} ~ {row.to}</TableCell>
                      <TableCell>
                        <Badge className={row.status === "生效中" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.status === "生效中" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-300">
                            撤销
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Create delegation form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                {isZh ? "新建委托授权" : "Create New Delegation"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isZh ? "业务域" : "Domain"}</label>
                  <Select value={delegateForm.domain} onValueChange={v => setDelegateForm(f => ({ ...f, domain: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={isZh ? "选择业务域" : "Select domain"} />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map(d => (
                        <SelectItem key={d.key} value={d.key}>{d.icon} {d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isZh ? "被委托人" : "Delegate"}</label>
                  <Select value={delegateForm.delegate} onValueChange={v => setDelegateForm(f => ({ ...f, delegate: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={isZh ? "选择员工" : "Select employee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {["焦斌", "张洵", "吴卫成", "韩保程", "王芳"].map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isZh ? "委托额度上限" : "Max Amount"}</label>
                  <Input
                    placeholder="¥20,000"
                    value={delegateForm.maxAmount}
                    onChange={e => setDelegateForm(f => ({ ...f, maxAmount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isZh ? "委托截止日期" : "End Date"}</label>
                  <Input
                    type="date"
                    value={delegateForm.to}
                    onChange={e => setDelegateForm(f => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </div>
              <Button className="mt-4 gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isZh ? "提交委托申请" : "Submit Delegation Request"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            Tab 8: 审计报告
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={isZh ? "搜索操作人、事件类型…" : "Search actor, event…"}
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Select value={auditDomain} onValueChange={setAuditDomain}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isZh ? "全部业务域" : "All Domains"}</SelectItem>
                    {DOMAINS.map(d => <SelectItem key={d.key} value={d.label}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={auditChannel} onValueChange={setAuditChannel}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isZh ? "全部渠道" : "All Channels"}</SelectItem>
                    <SelectItem value="标准">标准</SelectItem>
                    <SelectItem value="绿通">绿通</SelectItem>
                    <SelectItem value="委托">委托</SelectItem>
                    <SelectItem value="事后">事后</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="w-3 h-3" />
                  <Calendar className="w-3 h-3" />
                  {isZh ? "日期范围" : "Date Range"}
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Download className="w-3 h-3" />
                  {isZh ? "导出报告" : "Export"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit trail table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                {isZh ? "审计追踪记录" : "Audit Trail"}
                <Badge variant="outline" className="ml-auto">{filteredAudit.length} {isZh ? "条" : "records"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "审计ID" : "Audit ID"}</TableHead>
                    <TableHead>{isZh ? "时间" : "Time"}</TableHead>
                    <TableHead>{isZh ? "操作人" : "Actor"}</TableHead>
                    <TableHead>{isZh ? "事件" : "Event"}</TableHead>
                    <TableHead>{isZh ? "业务域" : "Domain"}</TableHead>
                    <TableHead>{isZh ? "金额" : "Amount"}</TableHead>
                    <TableHead>{isZh ? "渠道" : "Channel"}</TableHead>
                    <TableHead>{isZh ? "结果" : "Result"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudit.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="text-xs">{row.time}</TableCell>
                      <TableCell className="font-medium">{row.actor}</TableCell>
                      <TableCell>{row.event}</TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell className="font-semibold">{row.amount}</TableCell>
                      <TableCell>
                        <Badge className={
                          row.channel === "绿通" ? "bg-green-100 text-green-800" :
                          row.channel === "委托" ? "bg-purple-100 text-purple-800" :
                          row.channel === "事后" ? "bg-orange-100 text-orange-800" :
                          "bg-gray-100 text-gray-700"
                        }>
                          {row.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          row.result === "通过" || row.result === "批准" || row.result === "生效"
                            ? "bg-green-100 text-green-800"
                            : row.result === "驳回" || row.result === "扣分"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-700"
                        }>
                          {row.result}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAudit.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        {isZh ? "无匹配记录" : "No matching records"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Green channel usage analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                {isZh ? "绿色通道使用分析（本月）" : "Green Channel Usage Analytics (This Month)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "绿通总次数",   value: "23次", color: "text-green-600" },
                  { label: "按时补交",     value: "21次", color: "text-blue-600"  },
                  { label: "逾期补交",     value: "2次",  color: "text-orange-600" },
                  { label: "绿通通过率",   value: "91%",  color: "text-purple-600" },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">{isZh ? "各域绿通使用量" : "Usage by Domain"}</p>
                {[
                  { domain: "差旅费用", count: 9,  pct: 39 },
                  { domain: "费用报销", count: 7,  pct: 30 },
                  { domain: "物料领用", count: 4,  pct: 17 },
                  { domain: "采购申请", count: 2,  pct: 9  },
                  { domain: "客户折扣", count: 1,  pct: 4  },
                ].map(row => (
                  <div key={row.domain} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-right text-muted-foreground">{row.domain}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="w-8 font-semibold">{row.count}</span>
                    <span className="text-muted-foreground text-xs w-8">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FileText reference notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            {isZh
              ? "审计报告数据保留周期：操作日志 365 天，财务审计记录 7 年（符合财政部会计档案管理规定）。"
              : "Audit retention: operation logs 365 days, financial audit records 7 years (MOF compliance)."}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
