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

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";

// ── Theme ──────────────────────────────────────────
const BI_BG = "bg-[#0c111b]";
const BI_CARD = "bg-[#131a2b] border-[#1e293b]";
const BI_TEXT = "text-[#e2e8f0]";
const BI_MUTED = "text-[#64748b]";

// ── Demo Data (演示数据 — 基于真实员工) ──

const DEMO_DEPARTMENTS = [
  { departmentCode: "BU_OS", departmentName: "海外事业部", departmentType: "事业部", targetRevenue: "52000000", actualRevenue: "48100000", achievementRate: "92.50", rewardCount: 8, penaltyCount: 1, rewardAmount: "320000", penaltyAmount: "15000", planTotal: 45, planCompleted: 41, planAchievementRate: "91.11", trainingSessions: 12, trainingAttendees: 38, trainingQualityScore: "4.5", headcount: 42, activeProjects: 18, aiEvaluation: "海外事业部整体表现优异，目标达成率92.5%位列第一。欧洲区吴卫成团队贡献突出，连续3个月超额完成。培训参与率高，4.5分质量评分说明团队学习氛围良好。建议继续加强东南亚区域拓展，提升南美区业绩。" },
  { departmentCode: "BU_SC", departmentName: "半导体事业部", departmentType: "事业部", targetRevenue: "38000000", actualRevenue: "33400000", achievementRate: "87.89", rewardCount: 5, penaltyCount: 2, rewardAmount: "180000", penaltyAmount: "30000", planTotal: 32, planCompleted: 27, planAchievementRate: "84.38", trainingSessions: 8, trainingAttendees: 22, trainingQualityScore: "4.2", headcount: 28, activeProjects: 12, aiEvaluation: "半导体事业部保持增长势头，中芯国际项目是本季度亮点。视觉算法组交付能力需提升（肖博雅排名下滑3位），建议安排专项培训。" },
  { departmentCode: "BU_CV", departmentName: "商用车事业部", departmentType: "事业部", targetRevenue: "45000000", actualRevenue: "35600000", achievementRate: "79.11", rewardCount: 3, penaltyCount: 3, rewardAmount: "120000", penaltyAmount: "45000", planTotal: 38, planCompleted: 28, planAchievementRate: "73.68", trainingSessions: 10, trainingAttendees: 30, trainingQualityScore: "3.8", headcount: 35, activeProjects: 15, aiEvaluation: "商用车事业部达成率79%，低于集团平均。焦斌业绩突出但团队整体偏弱。3次处罚集中在交期延误，需加强项目管理能力。培训质量3.8分偏低，建议调整培训内容针对性。" },
  { departmentCode: "BU_PV", departmentName: "乘用车事业部", departmentType: "事业部", targetRevenue: "35000000", actualRevenue: "25000000", achievementRate: "71.43", rewardCount: 2, penaltyCount: 4, rewardAmount: "80000", penaltyAmount: "60000", planTotal: 28, planCompleted: 19, planAchievementRate: "67.86", trainingSessions: 6, trainingAttendees: 18, trainingQualityScore: "3.5", headcount: 25, activeProjects: 8, aiEvaluation: "乘用车事业部表现低于预期。CAPEX覆盖率仅38%，大量客户预算未录入。4次处罚反映管理问题。建议事业部总经理金晓锋组织专项整改，聚焦宝马和上汽大众两个重点客户。" },
  { departmentCode: "BU_IG", departmentName: "工业通用事业部", departmentType: "事业部", targetRevenue: "30000000", actualRevenue: "19200000", achievementRate: "64.00", rewardCount: 1, penaltyCount: 5, rewardAmount: "30000", penaltyAmount: "75000", planTotal: 25, planCompleted: 15, planAchievementRate: "60.00", trainingSessions: 5, trainingAttendees: 12, trainingQualityScore: "3.2", headcount: 20, activeProjects: 6, aiEvaluation: "工业通用事业部亟需整改。M3项目数为0，管道严重断层。5次处罚是所有BU最多。培训质量最低3.2分。建议洪香龙总经理提交限期整改方案，重点推进三一重工和徐工集团项目。" },
  { departmentCode: "PROCUREMENT", departmentName: "采购部", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 3, penaltyCount: 2, rewardAmount: "90000", penaltyAmount: "25000", planTotal: 60, planCompleted: 52, planAchievementRate: "86.67", trainingSessions: 8, trainingAttendees: 15, trainingQualityScore: "4.0", headcount: 18, activeProjects: 0, aiEvaluation: "采购部计划完成率86.7%表现良好。供应商交期管理有所改善，3项奖励来自成本节约贡献。建议加强供应商风险预警体系建设。" },
  { departmentCode: "AI_DEPT", departmentName: "AI技术部", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 4, penaltyCount: 0, rewardAmount: "150000", penaltyAmount: "0", planTotal: 35, planCompleted: 33, planAchievementRate: "94.29", trainingSessions: 15, trainingAttendees: 12, trainingQualityScore: "4.8", headcount: 12, activeProjects: 8, aiEvaluation: "AI技术部是本季度最佳职能部门。计划完成率94.3%、零处罚、培训质量4.8分均为全集团最高。Sales Coach Engine和Battle Arena两个项目按时交付。建议适当增加人员配置支撑更多业务场景。" },
  { departmentCode: "RND_CENTER", departmentName: "研发中心", departmentType: "职能部门", targetRevenue: null, actualRevenue: null, achievementRate: null, rewardCount: 6, penaltyCount: 1, rewardAmount: "200000", penaltyAmount: "10000", planTotal: 50, planCompleted: 42, planAchievementRate: "84.00", trainingSessions: 10, trainingAttendees: 35, trainingQualityScore: "4.3", headcount: 40, activeProjects: 22, aiEvaluation: "研发中心整体稳定。曹庆伟(#1)和张洵(#2)持续引领技术创新。ZLD膜组件研发组李大鹏排名倒数第二，需重点关注。ECO变更闭环率有提升，建议强化Design Review流程。" },
];

// ── Demo Data (演示数据 — 基于真实员工) ──
const DEMO_INDIVIDUALS = [
  { userId: 101, userName: "吴卫成", departmentCode: "BU_OS", departmentName: "海外事业部·欧洲区", position: "高级销售经理", targetValue: "8000000", actualValue: "7800000", achievementRate: "97.50", rewards: [{ title: "Q1超额奖", amount: 50000, date: "2026-03-01" }], penalties: [], planItemsTotal: 12, planItemsCompleted: 12, planAchievementRate: "100.00", trainingAttended: 4, trainingHours: "16.0", trainingScore: "4.8", kpiScore: "96.50", rankInDepartment: 1, rankOverall: 1, aiCoordinatedEvaluation: "吴卫成是集团标杆销售。目标达成率97.5%、计划100%完成、培训4.8分。欧洲区经验值得全集团复制推广。建议晋升为海外区域总监。" },
  { userId: 102, userName: "焦斌", departmentCode: "BU_CV", departmentName: "商用车事业部", position: "销售经理", targetValue: "6000000", actualValue: "5600000", achievementRate: "93.33", rewards: [{ title: "潍柴大单奖", amount: 30000, date: "2026-03-05" }], penalties: [], planItemsTotal: 10, planItemsCompleted: 9, planAchievementRate: "90.00", trainingAttended: 3, trainingHours: "12.0", trainingScore: "4.2", kpiScore: "93.20", rankInDepartment: 1, rankOverall: 2, aiCoordinatedEvaluation: "焦斌在商用车BU内一骑绝尘，但团队带动能力需提升。建议分配2名新人由其指导。" },
  { userId: 103, userName: "孙淼", departmentCode: "BU_OS", departmentName: "海外事业部·北美区", position: "销售经理", targetValue: "5000000", actualValue: "4400000", achievementRate: "88.00", rewards: [], penalties: [], planItemsTotal: 8, planItemsCompleted: 7, planAchievementRate: "87.50", trainingAttended: 3, trainingHours: "12.0", trainingScore: "4.0", kpiScore: "88.70", rankInDepartment: 2, rankOverall: 3, aiCoordinatedEvaluation: "孙淼北美区表现稳定，达成率88%。2个M1项目推进顺利。建议加强与当地代理商合作深度。" },
  { userId: 104, userName: "杜显文", departmentCode: "BU_PV", departmentName: "乘用车事业部", position: "销售主管", targetValue: "4500000", actualValue: "3800000", achievementRate: "84.44", rewards: [], penalties: [{ title: "客户投诉", amount: 5000, date: "2026-02-20" }], planItemsTotal: 8, planItemsCompleted: 6, planAchievementRate: "75.00", trainingAttended: 2, trainingHours: "8.0", trainingScore: "3.5", kpiScore: "85.30", rankInDepartment: 1, rankOverall: 4, aiCoordinatedEvaluation: "杜显文有1次客户投诉处罚，需关注服务质量。计划完成率75%偏低，建议加强周计划复盘。" },
  { userId: 105, userName: "廉龙海", departmentCode: "BU_SC", departmentName: "半导体事业部", position: "大客户经理", targetValue: "6000000", actualValue: "5000000", achievementRate: "83.33", rewards: [{ title: "中芯国际签单奖", amount: 40000, date: "2026-03-05" }], penalties: [], planItemsTotal: 9, planItemsCompleted: 8, planAchievementRate: "88.89", trainingAttended: 3, trainingHours: "12.0", trainingScore: "4.5", kpiScore: "82.10", rankInDepartment: 1, rankOverall: 5, aiCoordinatedEvaluation: "廉龙海拿下中芯国际大单，表现亮眼。培训评分4.5反映持续学习能力。建议培养为半导体事业部销售总监候选人。" },
  { userId: 201, userName: "曹庆伟", departmentCode: "RND_CENTER", departmentName: "研发中心", position: "首席工程师", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "技术创新奖", amount: 60000, date: "2026-03-01" }, { title: "专利奖", amount: 20000, date: "2026-02-15" }], penalties: [], planItemsTotal: 15, planItemsCompleted: 15, planAchievementRate: "100.00", trainingAttended: 5, trainingHours: "20.0", trainingScore: "5.0", kpiScore: "97.80", rankInDepartment: 1, rankOverall: 1, aiCoordinatedEvaluation: "曹庆伟是集团技术灵魂人物。计划完成率100%，2项奖励，培训满分。清洗机研发突破性进展归功于其技术领导力。" },
  { userId: 301, userName: "杨勇", departmentCode: "PROCUREMENT", departmentName: "采购部", position: "采购主管", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "成本节约奖", amount: 25000, date: "2026-03-10" }], penalties: [], planItemsTotal: 18, planItemsCompleted: 16, planAchievementRate: "88.89", trainingAttended: 4, trainingHours: "16.0", trainingScore: "4.2", kpiScore: "85.00", rankInDepartment: 1, rankOverall: 8, aiCoordinatedEvaluation: "杨勇采购成本控制能力突出，获成本节约奖。供应商管理规范。建议推动更多采购数字化工具应用。" },
  { userId: 401, userName: "朱宇浩", departmentCode: "AI_DEPT", departmentName: "AI技术部", position: "AI工程师", targetValue: null, actualValue: null, achievementRate: null, rewards: [{ title: "项目交付奖", amount: 30000, date: "2026-03-01" }], penalties: [], planItemsTotal: 12, planItemsCompleted: 12, planAchievementRate: "100.00", trainingAttended: 6, trainingHours: "24.0", trainingScore: "4.9", kpiScore: "94.50", rankInDepartment: 1, rankOverall: 3, aiCoordinatedEvaluation: "朱宇浩交付了Sales Coach和Battle Arena两个核心AI系统。计划完成率100%、培训4.9分。AI技术部核心骨干。" },
  { userId: 117, userName: "杨会龙", departmentCode: "BU_OS", departmentName: "海外事业部·南美区", position: "销售代表", targetValue: "3000000", actualValue: "1050000", achievementRate: "35.00", rewards: [], penalties: [{ title: "业绩不达标", amount: 10000, date: "2026-03-01" }, { title: "报告迟交", amount: 3000, date: "2026-02-28" }], planItemsTotal: 8, planItemsCompleted: 3, planAchievementRate: "37.50", trainingAttended: 1, trainingHours: "4.0", trainingScore: "2.5", kpiScore: "35.10", rankInDepartment: 8, rankOverall: 42, aiCoordinatedEvaluation: "杨会龙南美区表现严重落后。达成率35%、计划完成仅37.5%、2次处罚。培训参与度极低（1次/2.5分）。建议启动绩效改进计划PIP，如3个月内无改善则考虑调岗。" },
  { userId: 118, userName: "周辉", departmentCode: "BU_CV", departmentName: "商用车事业部", position: "销售代表", targetValue: "3000000", actualValue: "850000", achievementRate: "28.33", rewards: [], penalties: [{ title: "客户流失", amount: 15000, date: "2026-02-15" }, { title: "违规报价", amount: 20000, date: "2026-03-03" }], planItemsTotal: 8, planItemsCompleted: 2, planAchievementRate: "25.00", trainingAttended: 0, trainingHours: "0", trainingScore: null, kpiScore: "28.40", rankInDepartment: 10, rankOverall: 45, aiCoordinatedEvaluation: "周辉是集团末位。达成率28.3%、2次严重处罚（含违规报价）、零培训参与。强烈建议立即启动离职面谈或转岗安排。" },
];

// ── Demo Data (演示数据 — 基于真实员工) ──
const DEMO_EXECUTIVE_SUMMARY = `【2026年3月 · 集团BI综合报告 · AI高管摘要】

整体达成率：集团平均目标达成率 78.9%，较上月提升 3.2%。

最佳部门：
• 海外事业部（92.5%）— 欧洲区吴卫成连续3月榜首，北美区孙淼稳步增长
• AI技术部 — 计划完成率94.3%，零处罚，培训质量4.8分，全集团最优

需关注部门：
• 工业通用事业部（64.0%）— M3项目数为0，5次处罚最多，培训3.2分最低
• 乘用车事业部（71.4%）— CAPEX覆盖率38%严重不足，4次处罚

奖惩分布：
• 全集团奖励32次/¥117万，处罚18次/¥26万，奖惩比1.78:1
• AI技术部零处罚，工业通用事业部5次处罚需重点关注

培训质量：
• 集团平均4.0分，AI技术部(4.8)>海外(4.5)>研发(4.3)>半导体(4.2)>采购(4.0)>商用车(3.8)>乘用车(3.5)>工业通用(3.2)
• 周辉零培训参与，杨会龙仅1次，需强制安排

关键建议：
1. 工业通用事业部启动限期整改，洪香龙总经理提交30天行动计划
2. 吴卫成欧洲区经验全集团推广，安排3场内部分享会
3. 乘用车CAPEX录入列为本周P0任务
4. 末位2人（杨会龙、周辉）启动PIP绩效改进程序`;

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
      <div className="text-center w-16">
        <p className={`text-xs ${BI_MUTED}`}>达成率</p>
        <p className={`text-sm font-bold font-mono ${
          rate >= 85 ? "text-emerald-400" : rate >= 70 ? "text-amber-400" : "text-red-400"
        }`}>
          {dept.achievementRate ? `${rate.toFixed(1)}%` : "—"}
        </p>
      </div>

      {/* Plan */}
      <div className="text-center w-16">
        <p className={`text-xs ${BI_MUTED}`}>计划</p>
        <p className={`text-sm font-bold font-mono ${
          planRate >= 85 ? "text-emerald-400" : planRate >= 70 ? "text-amber-400" : "text-red-400"
        }`}>
          {planRate.toFixed(1)}%
        </p>
      </div>

      {/* Rewards/Penalties */}
      <div className="text-center w-16">
        <p className={`text-xs ${BI_MUTED}`}>奖/惩</p>
        <p className={`text-sm font-mono ${BI_TEXT}`}>
          <span className="text-emerald-400">+{dept.rewardCount}</span>
          <span className={BI_MUTED}>/</span>
          <span className="text-red-400">-{dept.penaltyCount}</span>
        </p>
      </div>

      {/* Training */}
      <div className="text-center w-14">
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

        <div className="grid grid-cols-4 gap-2">
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

function DeptDetailDialog({ dept, open, onOpenChange }: {
  dept: any; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const members = DEMO_INDIVIDUALS.filter(p => p.departmentCode === dept?.departmentCode);

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
          {members.map(p => (
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

function AccessManagement() {
  const DEMO_RULES = [
    { id: 1, periodType: null, departmentCode: null, grantedToRole: "admin", accessLevel: "manage", isActive: true },
    { id: 2, periodType: null, departmentCode: null, grantedToRole: "director", accessLevel: "view_individual", isActive: true },
    { id: 3, periodType: "monthly", departmentCode: null, grantedToRole: "bu_gm", accessLevel: "view_detail", isActive: true },
    { id: 4, periodType: "monthly", departmentCode: "BU_OS", grantedToRole: "bu_sales", accessLevel: "view_summary", isActive: true },
    { id: 5, periodType: "quarterly", departmentCode: null, grantedToRole: "dept_manager", accessLevel: "view_summary", isActive: true },
    { id: 6, periodType: null, departmentCode: "PROCUREMENT", grantedToRole: null, grantedToUserId: 301, accessLevel: "view_detail", isActive: true },
  ];

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-400" />
          <h3 className={`text-sm font-bold ${BI_TEXT}`}>报告授权规则</h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-[#1e293b] text-[#64748b]">
          {DEMO_RULES.length} 条规则
        </Badge>
      </div>

      <div className="space-y-2">
        {DEMO_RULES.map(rule => (
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
            <Badge variant="outline" className={`text-[10px] ${levelColors[rule.accessLevel]}`}>
              {levelLabels[rule.accessLevel]}
            </Badge>
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
  const [periodType, setPeriodType] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);

  // Aggregate stats from demo
  const stats = useMemo(() => {
    const bus = DEMO_DEPARTMENTS.filter(d => d.departmentType === "事业部");
    const totalTarget = bus.reduce((s, d) => s + parseFloat(d.targetRevenue ?? "0"), 0);
    const totalActual = bus.reduce((s, d) => s + parseFloat(d.actualRevenue ?? "0"), 0);
    const avgRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

    const allDepts = DEMO_DEPARTMENTS;
    const totalRewards = allDepts.reduce((s, d) => s + d.rewardCount, 0);
    const totalPenalties = allDepts.reduce((s, d) => s + d.penaltyCount, 0);

    const totalPlan = allDepts.reduce((s, d) => s + d.planTotal, 0);
    const completedPlan = allDepts.reduce((s, d) => s + d.planCompleted, 0);
    const planRate = totalPlan > 0 ? (completedPlan / totalPlan) * 100 : 0;

    const avgTraining = allDepts.reduce((s, d) => s + parseFloat(d.trainingQualityScore ?? "0"), 0) / allDepts.length;

    return { avgRate, totalRewards, totalPenalties, planRate, avgTraining, totalTarget, totalActual };
  }, []);

  const handleSelectDept = (dept: any) => {
    setSelectedDept(dept);
    setDeptDialogOpen(true);
  };

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
        </div>

        <div className="flex items-center gap-2">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className={`w-28 h-8 text-xs bg-[#131a2b] border-[#1e293b] ${BI_TEXT}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">周报</SelectItem>
              <SelectItem value="monthly">月报</SelectItem>
              <SelectItem value="quarterly">季报</SelectItem>
              <SelectItem value="yearly">年报</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs font-mono">
            <Calendar className="h-3 w-3 mr-1" />
            2026-03
          </Badge>
        </div>
      </div>

      {/* Top Stats */}
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
          label="参评部门/人数" value={`${DEMO_DEPARTMENTS.length}部 / ${DEMO_INDIVIDUALS.length}人`}
          icon={Users} color="text-amber-400"
        />
      </div>

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
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_DEPARTMENTS.map(dept => (
                <DeptRow
                  key={dept.departmentCode}
                  dept={dept}
                  onSelect={() => handleSelectDept(dept)}
                />
              ))}
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {DEMO_INDIVIDUALS.sort((a, b) => a.rankOverall - b.rankOverall).map(person => (
                  <PersonCard key={person.userId} person={person} />
                ))}
              </div>
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
              <AccessManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Detail Dialog */}
      <DeptDetailDialog
        dept={selectedDept}
        open={deptDialogOpen}
        onOpenChange={setDeptDialogOpen}
      />
    </div>
  );
}
