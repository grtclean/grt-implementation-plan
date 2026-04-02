/**
 * BI Report Dashboard — 综合报告平台
 *
 * Dimensions: 横向(跨部门对比) + 纵向(部门内排名) + 个体协调评价
 * Periods: 周/月/季/年
 * Metrics: 目标达成率, 奖惩, 计划完成率, 培训质量, KPI
 * Authorization: role-based + user-specific access rules
 *
 * Dark executive theme: bg-[#0c111b] / border-[#1e293b]
 */

import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  AlertTriangle,
  BookOpen,
  Shield,
  Sparkles,
  ChevronRight,
  ArrowUpDown,
  Lock,
  Eye,
  Settings,
  Crown,
  Calendar,
  Loader2,
} from "lucide-react";

// ── Theme ──────────────────────────────────────────
const BI_BG = "bg-[#0c111b]";
const BI_CARD = "bg-[#131a2b] border-[#1e293b]";
const BI_TEXT = "text-[#e2e8f0]";
const BI_MUTED = "text-[#64748b]";

// ── Demo Data (演示数据 — 基于真实员工) ──

const DEMO_DEPARTMENTS = [
  { departmentCode: "BU1", departmentName: "事业一部", departmentType: "事业部", targetRevenue: "52000000", actualRevenue: "48100000", achievementRate: "92.50", rewardCount: 8, penaltyCount: 1, rewardAmount: "320000", penaltyAmount: "15000", planTotal: 45, planCompleted: 41, planAchievementRate: "91.11", trainingSessions: 12, trainingAttendees: 38, trainingQualityScore: "4.5", headcount: 12, activeProjects: 18, aiEvaluation: "事业一部整体表现优异，目标达成率92.5%位列第一。高级销售经理戴晓燕团队贡献突出，连续3个月超额完成。制造质量经理金晓锋把控质量关卡有力，培训参与率高，4.5分质量评分说明团队学习氛围良好。建议继续强化售后服务体系，匡凯旋售后主管经验值得推广。" },
  { departmentCode: "BU2", departmentName: "事业二部", departmentType: "事业部", targetRevenue: "38000000", actualRevenue: "33400000", achievementRate: "87.89", rewardCount: 5, penaltyCount: 2, rewardAmount: "180000", penaltyAmount: "30000", planTotal: 32, planCompleted: 27, planAchievementRate: "84.38", trainingSessions: 8, trainingAttendees: 22, trainingQualityScore: "4.2", headcount: 5, activeProjects: 12, aiEvaluation: "事业二部保持增长势头，经理徐树奎统筹有力。机械设计经理洪香龙主导的新产品研发是本季度亮点。电气工程师钱佳奇交付能力需提升（排名下滑3位），建议安排专项培训。" },
  { departmentCode: "BU3", departmentName: "事业三部", departmentType: "事业部", targetRevenue: "45000000", actualRevenue: "35600000", achievementRate: "79.11", rewardCount: 3, penaltyCount: 3, rewardAmount: "120000", penaltyAmount: "45000", planTotal: 38, planCompleted: 28, planAchievementRate: "73.68", trainingSessions: 10, trainingAttendees: 30, trainingQualityScore: "3.8", headcount: 6, activeProjects: 15, aiEvaluation: "事业三部达成率79%，低于集团平均。经理周辉统筹需加强。冯艳和韩保程销售业绩有差距。3次处罚集中在交期延误，项目经理杨勇需加强项目管理能力。培训质量3.8分偏低，建议调整培训内容针对性。" },
  { departmentCode: "PROCUREMENT", departmentName: "采购部", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 3, penaltyCount: 2, rewardAmount: "90000", penaltyAmount: "25000", planTotal: 60, planCompleted: 52, planAchievementRate: "86.67", trainingSessions: 8, trainingAttendees: 15, trainingQualityScore: "4.0", headcount: 3, activeProjects: 0, aiEvaluation: "采购部计划完成率86.7%表现良好。采购经理沈迎凤供应商交期管理有所改善，3项奖励来自成本节约贡献。建议加强供应商风险预警体系建设。" },
  { departmentCode: "FINANCE", departmentName: "财务部", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 2, penaltyCount: 0, rewardAmount: "60000", penaltyAmount: "0", planTotal: 40, planCompleted: 37, planAchievementRate: "92.50", trainingSessions: 6, trainingAttendees: 3, trainingQualityScore: "4.3", headcount: 3, activeProjects: 0, aiEvaluation: "财务部表现稳健。总账会计王秀萍账务处理准确及时，出纳黄晓兰资金管理规范。财务专员王汝月在ERP对账方面贡献突出。建议加强财务数字化分析能力培训。" },
  { departmentCode: "AI_DEPT", departmentName: "AI数智部", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 4, penaltyCount: 0, rewardAmount: "150000", penaltyAmount: "0", planTotal: 35, planCompleted: 33, planAchievementRate: "94.29", trainingSessions: 15, trainingAttendees: 12, trainingQualityScore: "4.8", headcount: 3, activeProjects: 8, aiEvaluation: "AI数智部是本季度最佳职能部门。倪微薇主导的数字化转型项目按时交付，计划完成率94.3%、零处罚、培训质量4.8分均为全集团最高。建议适当增加人员配置支撑更多业务场景。" },
  { departmentCode: "MANAGEMENT", departmentName: "管理层", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 6, penaltyCount: 1, rewardAmount: "200000", penaltyAmount: "10000", planTotal: 50, planCompleted: 42, planAchievementRate: "84.00", trainingSessions: 10, trainingAttendees: 3, trainingQualityScore: "4.6", headcount: 3, activeProjects: 22, aiEvaluation: "管理层整体战略规划执行到位。董事长倪亚东推动集团数字化转型战略落地。董事长助理刘奥运跨部门协调高效，22个活跃项目进展顺利。建议强化各BU间资源协调机制。" },
];

// ── Demo Data (演示数据 — 基于真实员工) ──
const DEMO_INDIVIDUALS = [
  { userId: 101, userName: "戴晓燕", departmentCode: "BU1", departmentName: "事业一部", position: "高级销售经理", targetValue: "8000000", actualValue: "7800000", achievementRate: "97.50", rewards: [{ title: "Q1超额奖", amount: 50000, date: "2026-03-01" }], penalties: [], planItemsTotal: 12, planItemsCompleted: 12, planAchievementRate: "100.00", trainingAttended: 4, trainingHours: "16.0", trainingScore: "4.8", kpiScore: "96.50", rankInDepartment: 1, rankOverall: 1, aiCoordinatedEvaluation: "戴晓燕是集团标杆销售。目标达成率97.5%、计划100%完成、培训4.8分。销售管理经验值得全集团复制推广。建议晋升为事业部销售总监。" },
  { userId: 102, userName: "刘健康", departmentCode: "BU1", departmentName: "事业一部", position: "销售工程师", targetValue: "6000000", actualValue: "5600000", achievementRate: "93.33", rewards: [{ title: "大单签约奖", amount: 30000, date: "2026-03-05" }], penalties: [], planItemsTotal: 10, planItemsCompleted: 9, planAchievementRate: "90.00", trainingAttended: 3, trainingHours: "12.0", trainingScore: "4.2", kpiScore: "93.20", rankInDepartment: 2, rankOverall: 2, aiCoordinatedEvaluation: "刘健康销售业绩优秀，技术方案能力强。建议与王志强搭档拓展新客户群。" },
  { userId: 103, userName: "王志强", departmentCode: "BU1", departmentName: "事业一部", position: "销售工程师", targetValue: "5000000", actualValue: "4400000", achievementRate: "88.00", rewards: [], penalties: [], planItemsTotal: 8, planItemsCompleted: 7, planAchievementRate: "87.50", trainingAttended: 3, trainingHours: "12.0", trainingScore: "4.0", kpiScore: "88.70", rankInDepartment: 3, rankOverall: 3, aiCoordinatedEvaluation: "王志强表现稳定，达成率88%。2个M1项目推进顺利。建议加强与客户深度合作。" },
  { userId: 104, userName: "冯艳", departmentCode: "BU3", departmentName: "事业三部", position: "销售工程师", targetValue: "4500000", actualValue: "3800000", achievementRate: "84.44", rewards: [], penalties: [{ title: "客户投诉", amount: 5000, date: "2026-02-20" }], planItemsTotal: 8, planItemsCompleted: 6, planAchievementRate: "75.00", trainingAttended: 2, trainingHours: "8.0", trainingScore: "3.5", kpiScore: "85.30", rankInDepartment: 2, rankOverall: 4, aiCoordinatedEvaluation: "冯艳有1次客户投诉处罚，需关注服务质量。计划完成率75%偏低，建议加强周计划复盘。" },
  { userId: 105, userName: "韩保程", departmentCode: "BU3", departmentName: "事业三部", position: "销售工程师", targetValue: "6000000", actualValue: "5000000", achievementRate: "83.33", rewards: [{ title: "重点客户签单奖", amount: 40000, date: "2026-03-05" }], penalties: [], planItemsTotal: 9, planItemsCompleted: 8, planAchievementRate: "88.89", trainingAttended: 3, trainingHours: "12.0", trainingScore: "4.5", kpiScore: "82.10", rankInDepartment: 3, rankOverall: 5, aiCoordinatedEvaluation: "韩保程拿下重点客户大单，表现亮眼。培训评分4.5反映持续学习能力。建议培养为事业三部销售骨干。" },
  { userId: 201, userName: "洪香龙", departmentCode: "BU2", departmentName: "事业二部", position: "机械设计经理", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "技术创新奖", amount: 60000, date: "2026-03-01" }, { title: "专利奖", amount: 20000, date: "2026-02-15" }], penalties: [], planItemsTotal: 15, planItemsCompleted: 15, planAchievementRate: "100.00", trainingAttended: 5, trainingHours: "20.0", trainingScore: "5.0", kpiScore: "97.80", rankInDepartment: 1, rankOverall: 1, aiCoordinatedEvaluation: "洪香龙是集团机械设计核心人物。计划完成率100%，2项奖励，培训满分。新产品研发突破性进展归功于其技术领导力。" },
  { userId: 301, userName: "沈迎凤", departmentCode: "PROCUREMENT", departmentName: "采购部", position: "采购经理", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "成本节约奖", amount: 25000, date: "2026-03-10" }], penalties: [], planItemsTotal: 18, planItemsCompleted: 16, planAchievementRate: "88.89", trainingAttended: 4, trainingHours: "16.0", trainingScore: "4.2", kpiScore: "85.00", rankInDepartment: 1, rankOverall: 8, aiCoordinatedEvaluation: "沈迎凤采购成本控制能力突出，获成本节约奖。供应商管理规范。建议推动更多采购数字化工具应用。" },
  { userId: 401, userName: "倪微薇", departmentCode: "AI_DEPT", departmentName: "AI数智部", position: "AI数智&HR经理", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "数字化转型奖", amount: 30000, date: "2026-03-01" }], penalties: [], planItemsTotal: 12, planItemsCompleted: 12, planAchievementRate: "100.00", trainingAttended: 6, trainingHours: "24.0", trainingScore: "4.9", kpiScore: "94.50", rankInDepartment: 1, rankOverall: 3, aiCoordinatedEvaluation: "倪微薇主导数字化转型和HR体系建设，交付多个核心系统。计划完成率100%、培训4.9分。AI数智部核心骨干。" },
  { userId: 501, userName: "金晓锋", departmentCode: "BU1", departmentName: "事业一部", position: "制造质量经理", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "质量零缺陷奖", amount: 20000, date: "2026-03-01" }], penalties: [], planItemsTotal: 10, planItemsCompleted: 9, planAchievementRate: "90.00", trainingAttended: 4, trainingHours: "16.0", trainingScore: "4.6", kpiScore: "91.00", rankInDepartment: 4, rankOverall: 6, aiCoordinatedEvaluation: "金晓锋质量管控能力突出，连续2个月零客诉。质量体系建设有成效。建议推广质量管理经验到其他事业部。" },
  { userId: 502, userName: "杨勇", departmentCode: "BU3", departmentName: "事业三部", position: "项目经理", targetValue: "3000000", actualValue: "1050000", achievementRate: "35.00", rewards: [], penalties: [{ title: "项目延期", amount: 10000, date: "2026-03-01" }, { title: "报告迟交", amount: 3000, date: "2026-02-28" }], planItemsTotal: 8, planItemsCompleted: 3, planAchievementRate: "37.50", trainingAttended: 1, trainingHours: "4.0", trainingScore: "2.5", kpiScore: "35.10", rankInDepartment: 5, rankOverall: 42, aiCoordinatedEvaluation: "杨勇项目管理表现严重落后。达成率35%、计划完成仅37.5%、2次处罚。培训参与度极低（1次/2.5分）。建议启动绩效改进计划PIP，经理周辉需重点辅导。" },
];

// ── Demo Data (演示数据 — 基于真实员工) ──
const DEMO_EXECUTIVE_SUMMARY = `【2026年3月 · 集团BI综合报告 · AI高管摘要】

整体达成率：集团平均目标达成率 86.5%，较上月提升 3.2%。

最佳部门：
• 事业一部（92.5%）— 戴晓燕连续3月榜首，刘健康、王志强稳步增长
• AI数智部 — 计划完成率94.3%，零处罚，培训质量4.8分，全集团最优

需关注部门：
• 事业三部（79.1%）— 达成率低于集团平均，3次处罚集中在交期延误
• 采购部 — 计划完成率86.7%尚可，但供应商风险预警体系待建设

奖惩分布：
• 全集团奖励31次/¥103万，处罚8次/¥10万，奖惩比3.88:1
• AI数智部和财务部零处罚，事业三部3次处罚需重点关注

培训质量：
• 集团平均4.3分，AI数智部(4.8)>管理层(4.6)>事业一部(4.5)>财务部(4.3)>事业二部(4.2)>采购(4.0)>事业三部(3.8)
• 杨勇培训仅1次/2.5分，需强制安排

关键建议：
1. 事业三部经理周辉加强项目管理，杨勇启动PIP绩效改进
2. 戴晓燕销售经验全集团推广，安排3场内部分享会
3. 洪香龙技术创新成果向事业一部和三部推广
4. 金晓锋质量管理经验跨BU复制`;

// ── Demo Access Rules ──
const DEMO_RULES = [
  { id: 1, periodType: null, departmentCode: null, grantedToRole: "admin", grantedToUserId: null, accessLevel: "manage", isActive: true },
  { id: 2, periodType: null, departmentCode: null, grantedToRole: "director", grantedToUserId: null, accessLevel: "view_individual", isActive: true },
  { id: 3, periodType: "monthly", departmentCode: null, grantedToRole: "bu_gm", grantedToUserId: null, accessLevel: "view_detail", isActive: true },
  { id: 4, periodType: "monthly", departmentCode: "BU1", grantedToRole: "bu_sales", grantedToUserId: null, accessLevel: "view_summary", isActive: true },
  { id: 5, periodType: "quarterly", departmentCode: null, grantedToRole: "dept_manager", grantedToUserId: null, accessLevel: "view_summary", isActive: true },
  { id: 6, periodType: null, departmentCode: "PROCUREMENT", grantedToRole: null, grantedToUserId: 301, accessLevel: "view_detail", isActive: true },
];

// ── Stat Card ──────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, alert }: {
  label: string; value: string; sub?: string; icon: any; color: string; alert?: boolean;
}) {
  return (
    <Card className={`${BI_CARD} ${alert ? "border-red-800/60" : ""}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${alert ? "bg-red-950/40" : "bg-[#1e293b]"}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs ${BI_MUTED}`}>{label}</p>
          <p className={`text-lg font-bold ${alert ? "text-red-400" : BI_TEXT} font-mono`}>{value}</p>
          {sub && <p className={`text-[10px] ${BI_MUTED}`}>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Department Row ──────────────────────────────────

function DeptRow({ dept, onSelect }: { dept: any; onSelect: () => void }) {
  const rate = parseFloat(dept.achievementRate ?? "0");
  const planRate = parseFloat(dept.planAchievementRate ?? "0");
  const trainingScore = parseFloat(dept.trainingQualityScore ?? "0");

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-[#1a2235] ${BI_CARD}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${BI_TEXT} truncate`}>{dept.departmentName}</p>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${
            dept.departmentType === "事业部" ? "border-cyan-700 text-cyan-400" : "border-violet-700 text-violet-400"
          }`}>
            {dept.departmentType}
          </Badge>
        </div>
        <p className={`text-[10px] ${BI_MUTED}`}>{dept.headcount}人 · {dept.activeProjects}个项目</p>
      </div>

      {/* Achievement */}
      <div className="text-center w-12 sm:w-16">
        <p className={`text-[10px] sm:text-xs ${BI_MUTED}`}>达成率</p>
        <p className={`text-xs sm:text-sm font-bold font-mono ${
          rate >= 85 ? "text-emerald-400" : rate >= 70 ? "text-amber-400" : "text-red-400"
        }`}>
          {dept.achievementRate ? `${rate.toFixed(1)}%` : "—"}
        </p>
      </div>

      {/* Plan */}
      <div className="text-center w-12 sm:w-16 hidden sm:block">
        <p className={`text-xs ${BI_MUTED}`}>计划</p>
        <p className={`text-sm font-bold font-mono ${
          planRate >= 85 ? "text-emerald-400" : planRate >= 70 ? "text-amber-400" : "text-red-400"
        }`}>
          {planRate.toFixed(1)}%
        </p>
      </div>

      {/* Rewards/Penalties */}
      <div className="text-center w-12 sm:w-16 hidden sm:block">
        <p className={`text-xs ${BI_MUTED}`}>奖/惩</p>
        <p className={`text-sm font-mono ${BI_TEXT}`}>
          <span className="text-emerald-400">+{dept.rewardCount}</span>
          <span className={BI_MUTED}>/</span>
          <span className="text-red-400">-{dept.penaltyCount}</span>
        </p>
      </div>

      {/* Training */}
      <div className="text-center w-12 sm:w-14 hidden sm:block">
        <p className={`text-xs ${BI_MUTED}`}>培训</p>
        <p className={`text-sm font-bold font-mono ${
          trainingScore >= 4.0 ? "text-emerald-400" : trainingScore >= 3.5 ? "text-amber-400" : "text-red-400"
        }`}>
          {trainingScore.toFixed(1)}
        </p>
      </div>

      <ChevronRight className={`h-4 w-4 ${BI_MUTED} shrink-0`} />
    </div>
  );
}

// ── Individual Card ────────────────────────────────

function PersonCard({ person }: { person: any }) {
  const rate = parseFloat(person.achievementRate ?? "0");
  const planRate = parseFloat(person.planAchievementRate ?? "0");
  const rewardCount = (person.rewards ?? []).length;
  const penaltyCount = (person.penalties ?? []).length;
  const isBottom = person.rankOverall > 40;
  const isTop = person.rankOverall <= 3;

  return (
    <Card className={`${BI_CARD} ${isBottom ? "border-red-900/50" : isTop ? "border-amber-800/50" : ""}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isTop && <Crown className="h-3.5 w-3.5 text-amber-400" />}
            <p className={`text-sm font-semibold ${isTop ? "text-amber-200" : isBottom ? "text-red-300" : BI_TEXT}`}>
              {person.userName}
            </p>
            <Badge variant="outline" className={`text-[10px] ${BI_MUTED} border-[#1e293b]`}>
              #{person.rankOverall}
            </Badge>
          </div>
          <Badge variant="outline" className={`text-[10px] border-[#1e293b] ${BI_MUTED}`}>
            {person.position}
          </Badge>
        </div>

        <p className={`text-[10px] ${BI_MUTED}`}>{person.departmentName}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <p className={`text-[10px] ${BI_MUTED}`}>达成率</p>
            <p className={`text-xs font-bold font-mono ${
              rate >= 85 ? "text-emerald-400" : rate >= 70 ? "text-amber-400" : rate > 0 ? "text-red-400" : BI_MUTED
            }`}>{person.achievementRate ? `${rate.toFixed(1)}%` : "—"}</p>
          </div>
          <div>
            <p className={`text-[10px] ${BI_MUTED}`}>计划完成</p>
            <p className={`text-xs font-bold font-mono ${
              planRate >= 85 ? "text-emerald-400" : planRate >= 70 ? "text-amber-400" : "text-red-400"
            }`}>{planRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className={`text-[10px] ${BI_MUTED}`}>奖/惩</p>
            <p className={`text-xs font-mono ${BI_TEXT}`}>
              <span className="text-emerald-400">{rewardCount}</span>/<span className="text-red-400">{penaltyCount}</span>
            </p>
          </div>
          <div>
            <p className={`text-[10px] ${BI_MUTED}`}>培训</p>
            <p className={`text-xs font-bold font-mono ${BI_TEXT}`}>
              {person.trainingScore ? parseFloat(person.trainingScore).toFixed(1) : "—"}
            </p>
          </div>
        </div>

        {/* AI Evaluation */}
        {person.aiCoordinatedEvaluation && (
          <div className="mt-1 p-2 rounded bg-[#0c111b] border border-[#1e293b]">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-medium">AI协调评价</span>
            </div>
            <p className={`text-[11px] ${BI_MUTED} leading-relaxed`}>
              {person.aiCoordinatedEvaluation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Department Detail Dialog ───────────────────────

function DeptDetailDialog({ dept, open, onOpenChange, liveMembers }: {
  dept: any; open: boolean; onOpenChange: (v: boolean) => void; liveMembers?: any[];
}) {
  const members = liveMembers && liveMembers.length > 0
    ? liveMembers
    : DEMO_INDIVIDUALS.filter(p => p.departmentCode === dept?.departmentCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${BI_CARD} ${BI_TEXT} max-w-2xl max-h-[80vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={BI_TEXT}>
            {dept?.departmentName} — 纵向分析
          </DialogTitle>
        </DialogHeader>

        {/* AI Evaluation */}
        {dept?.aiEvaluation && (
          <div className="p-3 rounded-lg bg-[#0c111b] border border-cyan-900/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-cyan-400 font-semibold">AI 部门协调评价</span>
            </div>
            <p className={`text-sm ${BI_TEXT} leading-relaxed`}>{dept.aiEvaluation}</p>
          </div>
        )}

        {/* Members */}
        <div className="space-y-2 mt-2">
          <p className={`text-xs font-semibold ${BI_MUTED}`}>部门成员 ({members.length}人)</p>
          {members.map((p: any) => (
            <PersonCard key={p.userId} person={p} />
          ))}
          {members.length === 0 && (
            <p className={`text-sm ${BI_MUTED} text-center py-4`}>暂无该部门个人数据</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Access Rule Management ─────────────────────────

function AccessManagement({ canManage }: { canManage: boolean }) {
  const rulesQuery = (trpc.biReport as any).access.listRules.useQuery(
    { activeOnly: true },
    { refetchOnWindowFocus: false }
  );
  const rules = rulesQuery.data?.length > 0 ? rulesQuery.data : DEMO_RULES;
  const isLiveRules = rulesQuery.data?.length > 0;

  const grantMutation = (trpc.biReport as any).access.grant.useMutation({
    onSuccess: () => {
      toast.success("授权规则已添加");
      rulesQuery.refetch();
    },
    onError: (err: any) => toast.error(`授权失败: ${err.message}`),
  });

  const revokeMutation = (trpc.biReport as any).access.revoke.useMutation({
    onSuccess: () => {
      toast.success("授权规则已撤销");
      rulesQuery.refetch();
    },
    onError: (err: any) => toast.error(`撤销失败: ${err.message}`),
  });

  const levelLabels: Record<string, string> = {
    view_summary: "查看摘要",
    view_detail: "查看详情",
    view_individual: "查看个人",
    manage: "完全管理",
  };

  const levelColors: Record<string, string> = {
    view_summary: "border-blue-700 text-blue-400",
    view_detail: "border-emerald-700 text-emerald-400",
    view_individual: "border-amber-700 text-amber-400",
    manage: "border-red-700 text-red-400",
  };

  const handleRevoke = (ruleId: number) => {
    if (!canManage) return;
    revokeMutation.mutate({ id: ruleId });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-400" />
          <h3 className={`text-sm font-bold ${BI_TEXT}`}>报告授权规则</h3>
          {isLiveRules ? (
            <Badge className="bg-green-900/30 text-green-400 border-green-700 text-[10px]">实时</Badge>
          ) : (
            <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700 text-[10px]">示例</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rulesQuery.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
          <Badge variant="outline" className="text-[10px] border-[#1e293b] text-[#64748b]">
            {rules.length} 条规则
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {rules.map((rule: any) => (
          <div key={rule.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${BI_CARD}`}>
            <Lock className={`h-3.5 w-3.5 ${BI_MUTED} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${BI_TEXT}`}>
                {rule.grantedToRole ? `角色: ${rule.grantedToRole}` : `用户: #${rule.grantedToUserId}`}
              </p>
              <p className={`text-[10px] ${BI_MUTED}`}>
                {rule.periodType ?? "所有周期"} · {rule.departmentCode ?? "所有部门"}
              </p>
            </div>
            <Badge variant="outline" className={`text-[10px] ${levelColors[rule.accessLevel] ?? ""}`}>
              {levelLabels[rule.accessLevel] ?? rule.accessLevel}
            </Badge>
            {canManage && isLiveRules && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/30"
                onClick={() => handleRevoke(rule.id)}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "撤销"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════════════════

export default function BiReportDashboard() {
  const { level } = useUserProfile();
  const canManage = level >= 7; // admin/CTO
  const canView = level >= 5;   // director+

  const [periodType, setPeriodType] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // ── Access gate ──
  if (!canView) {
    return (
      <div className={`min-h-screen ${BI_BG} p-4 flex items-center justify-center`}>
        <Card className={BI_CARD}>
          <CardContent className="p-8 text-center">
            <Lock className="h-8 w-8 mx-auto mb-3 text-[#64748b]" />
            <p className={`text-sm ${BI_MUTED}`}>总监及以上角色可查看BI报告</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Backend Queries ──

  // Periods
  const periodsQuery = (trpc.biReport as any).period.list.useQuery(
    { periodType: periodType as any, limit: 20 },
    { refetchOnWindowFocus: false }
  );
  const periods = periodsQuery.data ?? [];

  // Auto-select first period when list loads
  useEffect(() => {
    if (periods.length > 0 && selectedPeriodId === null) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  // Reset period selection when periodType changes
  useEffect(() => {
    setSelectedPeriodId(null);
  }, [periodType]);

  // Department data (横向对比)
  const deptsQuery = (trpc.biReport as any).department.getHorizontalComparison.useQuery(
    { reportPeriodId: selectedPeriodId! },
    { enabled: !!selectedPeriodId, refetchOnWindowFocus: false }
  );
  const departments = deptsQuery.data?.length > 0 ? deptsQuery.data : DEMO_DEPARTMENTS;
  const isLiveData = deptsQuery.data?.length > 0;

  // Individual rankings
  const individualsQuery = (trpc.biReport as any).individual.getRankings.useQuery(
    { reportPeriodId: selectedPeriodId!, limit: 50 },
    { enabled: !!selectedPeriodId, refetchOnWindowFocus: false }
  );
  const individuals = individualsQuery.data?.length > 0 ? individualsQuery.data : DEMO_INDIVIDUALS;

  // Department members for dialog (纵向分析)
  const deptMembersQuery = (trpc.biReport as any).individual.getByDept.useQuery(
    { reportPeriodId: selectedPeriodId!, departmentCode: selectedDept?.departmentCode },
    { enabled: !!selectedPeriodId && !!selectedDept?.departmentCode, refetchOnWindowFocus: false }
  );

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const bus = departments.filter((d: any) => d.departmentType === "事业部");
    const totalTarget = bus.reduce((s: number, d: any) => s + parseFloat(d.targetRevenue ?? "0"), 0);
    const totalActual = bus.reduce((s: number, d: any) => s + parseFloat(d.actualRevenue ?? "0"), 0);
    const avgRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

    const allDepts = departments;
    const totalRewards = allDepts.reduce((s: number, d: any) => s + (d.rewardCount ?? 0), 0);
    const totalPenalties = allDepts.reduce((s: number, d: any) => s + (d.penaltyCount ?? 0), 0);

    const totalPlan = allDepts.reduce((s: number, d: any) => s + (d.planTotal ?? 0), 0);
    const completedPlan = allDepts.reduce((s: number, d: any) => s + (d.planCompleted ?? 0), 0);
    const planRate = totalPlan > 0 ? (completedPlan / totalPlan) * 100 : 0;

    const avgTraining = allDepts.reduce((s: number, d: any) => s + parseFloat(d.trainingQualityScore ?? "0"), 0) / allDepts.length;

    return { avgRate, totalRewards, totalPenalties, planRate, avgTraining, totalTarget, totalActual };
  }, [departments]);

  const handleSelectDept = (dept: any) => {
    setSelectedDept(dept);
    setDeptDialogOpen(true);
  };

  const isLoading = deptsQuery.isLoading || individualsQuery.isLoading;

  return (
    <div className={`min-h-screen ${BI_BG} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className={`text-lg font-bold ${BI_TEXT}`}>BI 综合报告平台</h1>
            <p className={`text-xs ${BI_MUTED}`}>
              横向跨部门对比 · 纵向个体分析 · AI协调评价 · 授权管理
            </p>
          </div>
          {/* Data source badge */}
          {isLiveData ? (
            <Badge className="bg-green-900/30 text-green-400 border-green-700">实时数据</Badge>
          ) : (
            <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700">示例数据</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Period type selector */}
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className={`w-20 sm:w-28 h-8 text-xs bg-[#131a2b] border-[#1e293b] ${BI_TEXT}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">周报</SelectItem>
              <SelectItem value="monthly">月报</SelectItem>
              <SelectItem value="quarterly">季报</SelectItem>
              <SelectItem value="yearly">年报</SelectItem>
            </SelectContent>
          </Select>

          {/* Specific period selector */}
          {periodsQuery.isLoading ? (
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#1e293b] bg-[#131a2b]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span className={`text-xs ${BI_MUTED}`}>加载中...</span>
            </div>
          ) : periods.length > 0 ? (
            <Select
              value={selectedPeriodId?.toString() ?? ""}
              onValueChange={(v) => setSelectedPeriodId(Number(v))}
            >
              <SelectTrigger className={`w-24 sm:w-36 h-8 text-xs bg-[#131a2b] border-[#1e293b] ${BI_TEXT}`}>
                <SelectValue placeholder="选择报告周期" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.periodLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs font-mono">
              <Calendar className="h-3 w-3 mr-1" />
              2026-03
            </Badge>
          )}
        </div>
      </div>

      {/* Top Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className={BI_CARD}>
              <CardContent className="p-3 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg bg-[#1e293b]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20 bg-[#1e293b]" />
                  <Skeleton className="h-5 w-16 bg-[#1e293b]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="事业部平均达成率" value={`${stats.avgRate.toFixed(1)}%`}
            sub={`目标 ¥${(stats.totalTarget / 10000).toFixed(0)}万`}
            icon={Target} color="text-cyan-400"
            alert={stats.avgRate < 75}
          />
          <StatCard
            label="奖励/处罚" value={`+${stats.totalRewards} / -${stats.totalPenalties}`}
            sub={`奖惩比 ${(stats.totalRewards / Math.max(stats.totalPenalties, 1)).toFixed(1)}:1`}
            icon={Award} color="text-emerald-400"
          />
          <StatCard
            label="计划完成率" value={`${stats.planRate.toFixed(1)}%`}
            sub="全集团汇总"
            icon={TrendingUp} color="text-blue-400"
          />
          <StatCard
            label="培训质量均分" value={stats.avgTraining.toFixed(1)}
            sub="满分5.0"
            icon={BookOpen} color="text-violet-400"
            alert={stats.avgTraining < 3.5}
          />
          <StatCard
            label="参评部门/人数" value={`${departments.length}部 / ${individuals.length}人`}
            icon={Users} color="text-amber-400"
          />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`bg-[#131a2b] border border-[#1e293b]`}>
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            横向对比
          </TabsTrigger>
          <TabsTrigger value="individuals" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            个人排名
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            AI高管摘要
          </TabsTrigger>
          <TabsTrigger value="access" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            授权管理
          </TabsTrigger>
        </TabsList>

        {/* Tab: 横向对比 */}
        <TabsContent value="overview">
          <Card className={BI_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-bold ${BI_TEXT} flex items-center gap-2`}>
                <ArrowUpDown className="h-4 w-4 text-cyan-400" />
                部门横向对比 — {periodType === "weekly" ? "周" : periodType === "monthly" ? "月" : periodType === "quarterly" ? "季" : "年"}度
                {deptsQuery.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deptsQuery.isLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${BI_CARD}`}>
                    <Skeleton className="h-8 flex-1 bg-[#1e293b]" />
                  </div>
                ))
              ) : (
                departments.map((dept: any) => (
                  <DeptRow
                    key={dept.departmentCode}
                    dept={dept}
                    onSelect={() => handleSelectDept(dept)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: 个人排名 */}
        <TabsContent value="individuals">
          <Card className={BI_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-bold ${BI_TEXT} flex items-center gap-2`}>
                <Users className="h-4 w-4 text-amber-400" />
                个人绩效排名 & AI协调评价
                {individualsQuery.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {individualsQuery.isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className={BI_CARD}>
                      <CardContent className="p-3 space-y-2">
                        <Skeleton className="h-4 w-32 bg-[#1e293b]" />
                        <Skeleton className="h-3 w-24 bg-[#1e293b]" />
                        <Skeleton className="h-8 w-full bg-[#1e293b]" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {[...individuals].sort((a: any, b: any) => (a.rankOverall ?? 999) - (b.rankOverall ?? 999)).map((person: any) => (
                    <PersonCard key={person.userId} person={person} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: AI高管摘要 */}
        <TabsContent value="summary">
          <Card className={BI_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-bold ${BI_TEXT} flex items-center gap-2`}>
                <Sparkles className="h-4 w-4 text-cyan-400" />
                AI 高管摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-[#0c111b] border border-cyan-900/30">
                <pre className={`text-sm ${BI_TEXT} leading-relaxed whitespace-pre-wrap font-sans`}>
                  {DEMO_EXECUTIVE_SUMMARY}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: 授权管理 */}
        <TabsContent value="access">
          <Card className={BI_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-bold ${BI_TEXT} flex items-center gap-2`}>
                <Settings className="h-4 w-4 text-violet-400" />
                报告授权管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccessManagement canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Detail Dialog */}
      <DeptDetailDialog
        dept={selectedDept}
        open={deptDialogOpen}
        onOpenChange={setDeptDialogOpen}
        liveMembers={deptMembersQuery.data}
      />
    </div>
  );
}
