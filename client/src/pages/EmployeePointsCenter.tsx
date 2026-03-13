/**
 * Employee Points Center — 员工积分中心
 *
 * CEO-directed points & credit system with 9 tabs:
 * 1. 积分概览 (Dashboard) — balance, daily compliance, recent transactions
 * 2. 积分规则 (Rules) — all active rules with role multiplier display
 * 3. 积分排行 (Leaderboard) — company-wide ranking
 * 4. 积分兑换 (Redemption) — catalog + my requests
 * 5. 积分明细 (History) — full transaction log
 * 6. 合理化建议 (Suggestions) — submission channel + evaluation flow
 * 7. 公司社区 (Community) — announcements, discussions, knowledge sharing
 * 8. 观察名录 (Observation) — <500 suspended, <0 observation
 * 9. CEO政策 (Policy) — signed policy document
 */

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Star, Trophy, Gift, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Clock, Award, Plane, FileText, ShieldAlert,
  Crown, Target, Users, Calendar, Lightbulb, Send, MessageSquare
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Mock Data (will be replaced by tRPC calls) ──

const MOCK_BALANCE = {
  currentBalance: 486,
  totalEarned: 720,
  totalSpent: 100,
  totalPenalties: 134,
  ytdPoints: 486,
  isOnObservation: false,
  isExcellenceSuspended: true,
  excellenceSuspendedUntil: "2026-09-13",
};

const MOCK_COMPLIANCE = {
  morningPlan: { passed: true, completedAt: "2026-03-13T08:12:00Z", pointsApplied: 3 },
  eveningSummary: null,
  nextDayPlan: null,
};

const MOCK_RULES = [
  { code: "morning_plan_ontime", name: "按时提交晨间工作计划", category: "daily_compliance", points: 3, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "morning_plan_missing", name: "未提交晨间工作计划", category: "penalty", points: -5, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "evening_summary_done", name: "按时提交工作总结", category: "daily_compliance", points: 3, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "next_day_plan_done", name: "完成次日工作计划", category: "daily_compliance", points: 2, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "report_quality_excellent", name: "工作报告质量优秀", category: "daily_compliance", points: 5, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "report_quality_poor", name: "工作报告质量低下", category: "penalty", points: -5, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "task_complete_p0", name: "完成P0任务", category: "task_completion", points: 10, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "task_complete_p1", name: "完成P1任务", category: "task_completion", points: 5, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "task_overdue", name: "任务逾期", category: "penalty", points: -3, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "quality_zero_defect", name: "月度零缺陷", category: "quality", points: 20, roleMultipliers: null },
  { code: "timesheet_complete", name: "按时填报工时", category: "daily_compliance", points: 2, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "timesheet_missing", name: "未填报工时", category: "penalty", points: -5, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "timesheet_incomplete", name: "工时填报不完整", category: "penalty", points: -3, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "timesheet_falsified", name: "工时虚报", category: "penalty", points: -20, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "unapproved_late", name: "未申请批准的迟到", category: "penalty", points: -8, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "unapproved_early_leave", name: "未申请批准的早退", category: "penalty", points: -8, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "late_penalty", name: "迟到扣分", category: "penalty", points: -3, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "unauthorized_excursion", name: "非休息时段离岗", category: "penalty", points: -5, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "perfect_attendance_month", name: "月度全勤", category: "attendance", points: 20, roleMultipliers: null },
  { code: "patent_filed", name: "专利申请", category: "innovation", points: 50, roleMultipliers: null },
  { code: "mentor_session", name: "指导同事", category: "collaboration", points: 5, roleMultipliers: null },
  { code: "referral_hired_junior", name: "推荐候选人入职(工程师以下)", category: "collaboration", points: 300, roleMultipliers: null },
  { code: "referral_hired_senior", name: "推荐候选人入职(工程师以上)", category: "collaboration", points: 500, roleMultipliers: null },
  { code: "training_cert_earned", name: "获得认证", category: "training", points: 20, roleMultipliers: null },
  { code: "bu_weekly_report_missing", name: "事业部周报未提交", category: "penalty", points: -20, roleMultipliers: { bu_gm: 100, director: 100 } },
  // 红黑榜处罚 (from existing violation_events system)
  { code: "violation_minor", name: "一般违规(MINOR)", category: "penalty", points: -10, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "violation_major", name: "重大违规(MAJOR)", category: "penalty", points: -50, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "violation_critical", name: "严重违规(CRITICAL)", category: "penalty", points: -100, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "violation_quality_defect", name: "质量缺陷违规", category: "penalty", points: -15, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "violation_safety_incident", name: "安全事故违规", category: "penalty", points: -30, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "violation_customer_complaint", name: "客户投诉违规", category: "penalty", points: -20, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  // 红榜奖励
  { code: "honor_top_performer", name: "红榜月度标兵", category: "quality", points: 30, roleMultipliers: null },
  { code: "honor_zero_defect_streak", name: "红榜连续零缺陷", category: "quality", points: 50, roleMultipliers: null },
  { code: "honor_customer_praise", name: "红榜客户表扬", category: "quality", points: 25, roleMultipliers: null },
  { code: "honor_innovation_award", name: "红榜创新之星", category: "innovation", points: 100, roleMultipliers: null },
  // 绩效积分联动
  { code: "perf_kpi_above_85", name: "KPI达到85分以上", category: "performance", points: 200, roleMultipliers: null },
  { code: "perf_kpi_below_60", name: "KPI低于60分", category: "performance", points: -50, roleMultipliers: null },
  { code: "perf_3month_improvement", name: "连续3月绩效提升20%", category: "performance", points: 50, roleMultipliers: null },
  { code: "perf_3month_decline", name: "连续3月绩效下降20%", category: "performance", points: -100, roleMultipliers: null },
  // 合理化建议
  { code: "suggestion_effective", name: "有效建议", category: "innovation", points: 50, roleMultipliers: null },
  { code: "suggestion_outstanding", name: "突出价值建议", category: "innovation", points: 500, roleMultipliers: null },
  { code: "suggestion_major", name: "重大价值建议", category: "innovation", points: 5000, roleMultipliers: null },
  // 销售工程师KPI
  { code: "sales_first_order_3m", name: "新销售工程师首单≥300万", category: "quality", points: 1000, roleMultipliers: null },
  { code: "sales_no_order_6month", name: "连续6个月无订单", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "sales_no_order_ongoing", name: "无订单持续处罚(每月递增)", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  // 销售M2漏斗
  { code: "sales_m2_shortfall_initial", name: "连续2月新客户未达M2(≥3个)", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "sales_m2_shortfall_escalate", name: "新客户M2不达标持续翻倍处罚", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  // 各岗位KPI不达标 (连续2月首罚-500，后续翻倍)
  { code: "rnd_milestone_miss_initial", name: "研发连续2月里程碑未达成", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "qa_complaint_rate_initial", name: "质量连续2月投诉率超标", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "mfg_oee_miss_initial", name: "生产连续2月OEE不达标", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "pm_delay_rate_initial", name: "PM连续2月项目延期率超标", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "cs_closure_rate_initial", name: "售后连续2月工单关闭率不达标", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "proc_delivery_miss_initial", name: "采购连续2月供应商交付不达标", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "bu_gm_profit_miss_initial", name: "BU经理连续2月利润率不达标", category: "penalty", points: -500, roleMultipliers: { bu_gm: 100 } },
  { code: "hr_vacancy_miss_initial", name: "HR连续2月关键岗位空缺超标", category: "penalty", points: -500, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  // 团队高绩效奖励
  { code: "team_quarterly_top", name: "季度最佳团队", category: "quality", points: 100, roleMultipliers: null },
  { code: "team_project_delivery", name: "项目按时交付团队奖", category: "quality", points: 80, roleMultipliers: null },
  { code: "team_zero_defect_quarter", name: "团队季度零缺陷", category: "quality", points: 150, roleMultipliers: null },
  { code: "team_customer_satisfaction", name: "团队客户满意度≥95%", category: "quality", points: 100, roleMultipliers: null },
  { code: "team_innovation_award", name: "团队创新突破奖", category: "innovation", points: 200, roleMultipliers: null },
  { code: "team_cost_saving", name: "团队降本增效奖(节省≥50万)", category: "quality", points: 300, roleMultipliers: null },
  // 团队低作风处罚
  { code: "team_conduct_poor_collab", name: "团队协作不力", category: "penalty", points: -50, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "team_conduct_meeting_waste", name: "团队会议效率低下", category: "penalty", points: -30, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "team_conduct_blame_culture", name: "团队推卸责任", category: "penalty", points: -80, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "team_conduct_info_silo", name: "团队信息孤岛", category: "penalty", points: -60, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "team_conduct_deadline_miss", name: "团队集体延期", category: "penalty", points: -100, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  // 项目高绩效奖励
  { code: "project_ahead_of_schedule", name: "项目提前交付", category: "quality", points: 100, roleMultipliers: null },
  { code: "project_budget_under", name: "项目低于预算交付", category: "quality", points: 120, roleMultipliers: null },
  { code: "project_customer_praise", name: "项目获客户表彰", category: "quality", points: 150, roleMultipliers: null },
  { code: "project_best_practice", name: "项目最佳实践沉淀", category: "innovation", points: 80, roleMultipliers: null },
  // 项目低作风处罚
  { code: "project_conduct_no_report", name: "项目周报连续缺失", category: "penalty", points: -50, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "project_conduct_risk_hide", name: "项目风险隐瞒", category: "penalty", points: -200, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "project_conduct_scope_creep", name: "项目需求镀金", category: "penalty", points: -80, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "project_conduct_quality_cut", name: "项目质量偷工减料", category: "penalty", points: -150, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "project_conduct_handover_fail", name: "项目交接不清", category: "penalty", points: -60, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  // 个人表现 vs 作风
  { code: "individual_high_output_low_teamwork", name: "高产出低团队意识", category: "penalty", points: -30, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "individual_technical_arrogance", name: "技术傲慢", category: "penalty", points: -40, roleMultipliers: { employee: 1, engineer: 10, manager: 100 } },
  { code: "individual_mentor_excellence", name: "优秀导师", category: "collaboration", points: 100, roleMultipliers: null },
  { code: "individual_cross_dept_collab", name: "跨部门协作之星", category: "collaboration", points: 80, roleMultipliers: null },
  { code: "individual_knowledge_sharing", name: "知识分享达人", category: "collaboration", points: 60, roleMultipliers: null },
  // 职场行为规范
  { code: "conduct_disrupt_others", name: "吵架等行为影响他人工作", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100, bu_gm: 100 } },
  { code: "conduct_damage_culture", name: "损害公司文化形象", category: "penalty", points: -2000, roleMultipliers: { employee: 1, engineer: 10, manager: 100, bu_gm: 100 } },
  // 见义勇为/吹哨人
  { code: "courage_act", name: "见义勇为", category: "quality", points: 2000, roleMultipliers: null },
  { code: "crisis_handling", name: "重大险情处置得当", category: "quality", points: 2000, roleMultipliers: null },
  { code: "whistleblower_prevent", name: "吹哨人阻止/降低不当行为影响", category: "quality", points: 2000, roleMultipliers: null },
  // 重大成就与重大失误 ±1000
  { code: "project_exceptional", name: "项目高表现(重大成就)", category: "quality", points: 1000, roleMultipliers: null },
  { code: "project_major_failure", name: "项目重大失误", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100, bu_gm: 100 } },
  { code: "customer_high_praise", name: "客户高评价(重大表彰)", category: "quality", points: 1000, roleMultipliers: null },
  { code: "customer_major_complaint", name: "客户重大投诉/流失", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100, bu_gm: 100 } },
  { code: "major_mistake_prevented", name: "重大失误避免", category: "quality", points: 1000, roleMultipliers: null },
  { code: "major_mistake_caused", name: "造成重大失误", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100, bu_gm: 100 } },
  { code: "assembly_debug_innovation", name: "装配调试重大创新", category: "innovation", points: 1000, roleMultipliers: null },
  { code: "assembly_debug_negligence", name: "装配调试重大失误", category: "penalty", points: -1000, roleMultipliers: { employee: 1, engineer: 10, manager: 100, bu_gm: 100 } },
];

const MOCK_CATALOG = [
  { code: "leave_half_day", name: "半天带薪休假", pointsCost: 200, category: "leave", description: "积分兑换半天带薪休假" },
  { code: "leave_full_day", name: "一天带薪休假", pointsCost: 400, category: "leave", description: "积分兑换一天带薪休假" },
  { code: "leave_3days", name: "三天带薪休假", pointsCost: 1000, category: "leave", description: "积分兑换三天带薪休假" },
  { code: "travel_eu_2wk", name: "GRT欧洲公司工作2周", pointsCost: 3000, category: "travel", description: "前往GRT欧洲公司工作交流2周，含机票住宿" },
  { code: "travel_eu_4wk", name: "GRT欧洲公司工作4周", pointsCost: 5000, category: "travel", description: "前往GRT欧洲公司工作交流4周，含机票住宿" },
  { code: "travel_us_2wk", name: "GRT美国公司工作2周", pointsCost: 3500, category: "travel", description: "前往GRT美国公司工作交流2周，含机票住宿" },
  { code: "travel_us_4wk", name: "GRT美国公司工作4周", pointsCost: 6000, category: "travel", description: "前往GRT美国公司工作交流4周，含机票住宿" },
  { code: "gift_card_200", name: "200元购物卡", pointsCost: 100, category: "gift", description: "200元电商平台购物卡" },
  { code: "gift_card_500", name: "500元购物卡", pointsCost: 250, category: "gift", description: "500元电商平台购物卡" },
  { code: "training_budget", name: "培训经费3000元", pointsCost: 500, category: "training", description: "可用于外部培训课程报名" },
  { code: "parking_month", name: "一个月免费停车位", pointsCost: 150, category: "benefit", description: "公司停车场免费使用一个月" },
];

const MOCK_LEADERBOARD = [
  { rank: 1, employeeName: "曹庆伟", department: "研发部", ytdPoints: 1250, isOnObservation: false },
  { rank: 2, employeeName: "殷小勇", department: "生产部", ytdPoints: 1100, isOnObservation: false },
  { rank: 3, employeeName: "马林山", department: "质量部", ytdPoints: 980, isOnObservation: false },
  { rank: 4, employeeName: "吴卫成", department: "销售部", ytdPoints: 870, isOnObservation: false },
  { rank: 5, employeeName: "张超", department: "事业一部", ytdPoints: 760, isOnObservation: false },
  { rank: 6, employeeName: "戴晓燕", department: "人事部", ytdPoints: 650, isOnObservation: false },
  { rank: 7, employeeName: "杨勇", department: "事业三部", ytdPoints: 520, isOnObservation: false },
  { rank: 8, employeeName: "黄晓兰", department: "财务部", ytdPoints: 480, isOnObservation: false, isExcellenceSuspended: true },
];

const MOCK_HISTORY = [
  { id: 1, ruleCode: "morning_plan_ontime", type: "award", points: 3, balanceAfter: 486, description: "按时提交晨间工作计划", transactionDate: "2026-03-13" },
  { id: 2, ruleCode: "evening_summary_done", type: "award", points: 3, balanceAfter: 483, description: "按时提交工作总结", transactionDate: "2026-03-12" },
  { id: 3, ruleCode: "next_day_plan_done", type: "award", points: 2, balanceAfter: 480, description: "完成次日工作计划", transactionDate: "2026-03-12" },
  { id: 4, ruleCode: "task_complete_p1", type: "award", points: 5, balanceAfter: 478, description: "完成P1任务", transactionDate: "2026-03-12" },
  { id: 5, ruleCode: "morning_plan_late", type: "penalty", points: -2, balanceAfter: 473, description: "晨间工作计划迟交", transactionDate: "2026-03-11" },
  { id: 6, ruleCode: "unapproved_late", type: "penalty", points: -8, balanceAfter: 475, description: "未申请批准的迟到", transactionDate: "2026-03-10" },
];

const MOCK_SUGGESTIONS = [
  { id: 1, title: "优化清洗机喷嘴压力检测流程", category: "quality", status: "effective", pointsAwarded: 50, employeeName: "曹庆伟", department: "研发部", submittedAt: "2026-03-10", evaluatorNotes: "流程改善可减少10%不良率" },
  { id: 2, title: "引入自动化BOM对比工具减少手动核对", category: "process", status: "outstanding", pointsAwarded: 500, employeeName: "殷小勇", department: "生产部", submittedAt: "2026-03-05", evaluatorNotes: "每月节省约40工时，突出价值" },
  { id: 3, title: "车间安全通道标识升级方案", category: "safety", status: "submitted", pointsAwarded: 0, employeeName: "马林山", department: "质量部", submittedAt: "2026-03-12", evaluatorNotes: null },
  { id: 4, title: "客户投诉响应SLA从48h缩短至24h", category: "process", status: "under_review", pointsAwarded: 0, employeeName: "张良", department: "售后部", submittedAt: "2026-03-08", evaluatorNotes: "评审为突出价值建议，待CEO审批" },
  { id: 5, title: "统一五个事业部供应商评估体系", category: "cost", status: "major", pointsAwarded: 5000, employeeName: "杨勇", department: "采购部", submittedAt: "2026-02-20", evaluatorNotes: "预计年节省采购成本200万+，重大价值建议" },
];

const SUGGESTION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "已提交", color: "bg-blue-100 text-blue-700" },
  under_review: { label: "评审中", color: "bg-yellow-100 text-yellow-700" },
  effective: { label: "有效建议", color: "bg-green-100 text-green-700" },
  outstanding: { label: "突出价值", color: "bg-purple-100 text-purple-700" },
  major: { label: "重大价值", color: "bg-amber-100 text-amber-800" },
  rejected: { label: "未采纳", color: "bg-red-100 text-red-700" },
  implemented: { label: "已实施", color: "bg-emerald-100 text-emerald-700" },
};

const SUGGESTION_TIER_POINTS: Record<string, number> = {
  effective: 50,
  outstanding: 500,
  major: 5000,
};

const MOCK_COMMUNITY_POSTS = [
  { id: 1, type: "announcement", title: "【荣誉通报】刘坤同事积分突破20,000分", content: "采购部刘坤同事凭借出色的供应商管理和重大价值建议，积分累计突破20,000分，特此通报表彰！", date: "2026-03-13", pinned: true, requiresAck: true, acked: false, views: 234, likes: 56, acks: 72, totalRecipients: 97 }, // demo
  { id: 2, type: "announcement", title: "【合理化建议特别公告】统一五个事业部供应商评估体系", content: "采购部刘坤同事提交的重大价值建议已被采纳，预计年节省采购成本200万+，奖励积分+5,000", date: "2026-03-12", pinned: true, requiresAck: true, acked: true, views: 189, likes: 43, acks: 85, totalRecipients: 97 },
  { id: 3, type: "achievement", title: "2026年Q1优秀员工表彰", content: "恭喜以下同事获得2026年第一季度优秀员工称号：徐家乐(研发部)、韩保程(生产部)、赵雪(质量部)", date: "2026-03-11", pinned: false, requiresAck: false, acked: false, views: 156, likes: 38, acks: 0, totalRecipients: 0 },
  { id: 4, type: "notice", title: "关于3月安全生产检查的通知", content: "各部门请于3月15日前完成安全隐患自查，检查结果提交至质量部。重点检查消防通道、电气设备、化学品存储。", date: "2026-03-10", pinned: false, requiresAck: true, acked: true, views: 145, likes: 12, acks: 89, totalRecipients: 97 },
  { id: 5, type: "knowledge", title: "IATF 16949内审经验分享", content: "质量部赵雪分享了最近一次IATF 16949体系内审的经验和发现的共性问题，包括文件控制、过程审核要点等。", date: "2026-03-09", pinned: false, requiresAck: false, acked: false, views: 98, likes: 25, acks: 0, totalRecipients: 0 },
  { id: 6, type: "discussion", title: "新产线调试心得与建议", content: "生产部韩保程：上周完成半导体清洗新产线调试，分享几点心得供大家参考...", date: "2026-03-08", pinned: false, requiresAck: false, acked: false, views: 67, likes: 18, acks: 0, totalRecipients: 0 },
];

// ── Category Config ──
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  daily_compliance: { label: "每日合规", color: "bg-blue-100 text-blue-700", icon: <CheckCircle className="w-3 h-3" /> },
  task_completion: { label: "任务完成", color: "bg-green-100 text-green-700", icon: <Target className="w-3 h-3" /> },
  quality: { label: "质量贡献", color: "bg-purple-100 text-purple-700", icon: <Award className="w-3 h-3" /> },
  collaboration: { label: "协作", color: "bg-cyan-100 text-cyan-700", icon: <Users className="w-3 h-3" /> },
  training: { label: "培训", color: "bg-indigo-100 text-indigo-700", icon: <FileText className="w-3 h-3" /> },
  innovation: { label: "创新", color: "bg-amber-100 text-amber-700", icon: <Star className="w-3 h-3" /> },
  attendance: { label: "考勤", color: "bg-teal-100 text-teal-700", icon: <Clock className="w-3 h-3" /> },
  penalty: { label: "处罚", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="w-3 h-3" /> },
  performance: { label: "绩效", color: "bg-orange-100 text-orange-700", icon: <TrendingUp className="w-3 h-3" /> },
  management: { label: "管理类", color: "bg-slate-100 text-slate-700", icon: <Crown className="w-3 h-3" /> },
};

const CATALOG_ICONS: Record<string, React.ReactNode> = {
  leave: <Calendar className="w-5 h-5 text-blue-500" />,
  travel: <Plane className="w-5 h-5 text-emerald-500" />,
  gift: <Gift className="w-5 h-5 text-pink-500" />,
  training: <FileText className="w-5 h-5 text-indigo-500" />,
  benefit: <Star className="w-5 h-5 text-amber-500" />,
};

// ── Component ──

export default function EmployeePointsCenter() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const balance = MOCK_BALANCE;
  const compliance = MOCK_COMPLIANCE;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GRT员工积分中心</h1>
          <p className="text-muted-foreground text-sm">积分奖惩制度 — 高标准高期望高回报</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          <Star className="w-4 h-4 mr-1 text-amber-500" />
          {balance.currentBalance} 分
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-9 w-full">
          <TabsTrigger value="dashboard">积分概览</TabsTrigger>
          <TabsTrigger value="rules">积分规则</TabsTrigger>
          <TabsTrigger value="leaderboard">积分排行</TabsTrigger>
          <TabsTrigger value="catalog">积分兑换</TabsTrigger>
          <TabsTrigger value="history">积分明细</TabsTrigger>
          <TabsTrigger value="suggestions">合理化建议</TabsTrigger>
          <TabsTrigger value="community">公司社区</TabsTrigger>
          <TabsTrigger value="observation">观察名录</TabsTrigger>
          <TabsTrigger value="policy">CEO政策</TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className={balance.currentBalance < 500 ? "border-red-300" : ""}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{balance.currentBalance}</div>
                <div className="text-xs text-muted-foreground">当前积分</div>
                {balance.isExcellenceSuspended && <Badge variant="destructive" className="mt-1 text-[10px]">评优暂停</Badge>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{balance.totalEarned}</div>
                <div className="text-xs text-muted-foreground">累计获得</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{balance.totalPenalties}</div>
                <div className="text-xs text-muted-foreground">累计扣除</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{balance.totalSpent}</div>
                <div className="text-xs text-muted-foreground">已兑换</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{balance.ytdPoints}</div>
                <div className="text-xs text-muted-foreground">年度净积分</div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Compliance Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">今日合规状态</CardTitle>
              <CardDescription>打卡后15分钟内提交工作计划 | 下班前提交工作总结 | 完成次日计划+2分</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-3 rounded-lg border ${compliance.morningPlan?.passed ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                  <div className="flex items-center gap-2">
                    {compliance.morningPlan?.passed
                      ? <CheckCircle className="w-5 h-5 text-green-500" />
                      : <Clock className="w-5 h-5 text-yellow-500" />}
                    <span className="font-medium">晨间工作计划</span>
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {compliance.morningPlan?.passed
                      ? `已完成 (+${compliance.morningPlan.pointsApplied}分)`
                      : "待提交 (打卡后15分钟内)"}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${compliance.eveningSummary ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    {compliance.eveningSummary
                      ? <CheckCircle className="w-5 h-5 text-green-500" />
                      : <FileText className="w-5 h-5 text-gray-400" />}
                    <span className="font-medium">工作总结</span>
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {compliance.eveningSummary ? "已完成" : "下班前提交"}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${compliance.nextDayPlan ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2">
                    {compliance.nextDayPlan
                      ? <CheckCircle className="w-5 h-5 text-green-500" />
                      : <Target className="w-5 h-5 text-gray-400" />}
                    <span className="font-medium">次日工作计划</span>
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {compliance.nextDayPlan ? "已完成 (+2分)" : "额外奖励2分"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Threshold Warnings */}
          {(balance.isExcellenceSuspended || balance.isOnObservation || balance.currentBalance < 500) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  积分预警
                </div>
                <div className="space-y-1 text-sm text-red-600">
                  {balance.currentBalance < 500 && (
                    <div>当前积分 {balance.currentBalance} 低于500分阈值 — 评优资格暂停6个月</div>
                  )}
                  {balance.isExcellenceSuspended && (
                    <div>评优暂停至 {balance.excellenceSuspendedUntil}</div>
                  )}
                  {balance.isOnObservation && (
                    <div>已列入观察名录 — 需部门经理约谈</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">最近积分变动</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MOCK_HISTORY.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {tx.points > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                      <span className="text-sm">{tx.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{tx.transactionDate}</span>
                      <Badge variant={tx.points > 0 ? "default" : "destructive"} className="min-w-[50px] justify-center">
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Rules — grouped by behavior category */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="mb-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">积分规则总表 — 按行为准则分类</CardTitle>
              <CardDescription>
                职级乘数: 普通员工×1 | 工程师及以上×10 | 经理及以上×100 | 事业部经理×100
                <br />所有规则的分值和乘数均可由管理员在系统中调整，更新后立即生效。
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Group rules by category */}
          {Object.entries(CATEGORY_CONFIG).map(([catKey, catCfg]) => {
            const catRules = MOCK_RULES.filter(r => r.category === catKey);
            if (catRules.length === 0) return null;
            return (
              <Card key={catKey}>
                <CardHeader className="pb-1 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    {catCfg.icon}
                    <CardTitle className="text-sm">{catCfg.label}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{catRules.length} 条规则</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-1.5">规则</th>
                          <th className="text-center p-1.5 w-16">基础分</th>
                          <th className="text-center p-1.5 w-16">员工</th>
                          <th className="text-center p-1.5 w-20">工程师+</th>
                          <th className="text-center p-1.5 w-20">经理+</th>
                          <th className="text-center p-1.5 w-24">事业部经理</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catRules.map(rule => {
                          const m = rule.roleMultipliers;
                          return (
                            <tr key={rule.code} className="border-b hover:bg-muted/20">
                              <td className="p-1.5 font-medium">{rule.name}</td>
                              <td className={`p-1.5 text-center font-mono ${rule.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {rule.points >= 0 ? "+" : ""}{rule.points}
                              </td>
                              <td className="p-1.5 text-center font-mono text-muted-foreground">
                                {m ? `${rule.points >= 0 ? "+" : ""}${rule.points * (m.employee || 1)}` : "--"}
                              </td>
                              <td className="p-1.5 text-center font-mono text-blue-600 font-semibold">
                                {m ? `${rule.points >= 0 ? "+" : ""}${rule.points * (m.engineer || 1)}` : "--"}
                              </td>
                              <td className="p-1.5 text-center font-mono text-orange-600 font-bold">
                                {m ? `${rule.points >= 0 ? "+" : ""}${rule.points * (m.manager || 1)}` : "--"}
                              </td>
                              <td className="p-1.5 text-center font-mono text-red-600 font-bold">
                                {m ? `${rule.points >= 0 ? "+" : ""}${rule.points * (m.bu_gm || m.manager || 1)}` : "--"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab 3: Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> 公司积分排行榜</CardTitle>
              <CardDescription>年度累计积分排名 — 年底员工大会前可兑换奖励</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MOCK_LEADERBOARD.map(entry => (
                  <div key={entry.rank} className={`flex items-center justify-between p-3 rounded-lg border ${entry.rank <= 3 ? "bg-amber-50 border-amber-200" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        entry.rank === 1 ? "bg-amber-400 text-white" :
                        entry.rank === 2 ? "bg-gray-300 text-gray-700" :
                        entry.rank === 3 ? "bg-amber-700 text-white" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-medium">{entry.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{entry.department}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(entry as any).isExcellenceSuspended && <Badge variant="destructive" className="text-[10px]">评优暂停</Badge>}
                      <span className="font-bold text-lg">{entry.ytdPoints}</span>
                      <span className="text-xs text-muted-foreground">分</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Redemption Catalog */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_CATALOG.map(item => {
              const canAfford = balance.currentBalance >= item.pointsCost;
              return (
                <Card key={item.code} className={!canAfford ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {CATALOG_ICONS[item.category] ?? <Gift className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="outline" className="font-mono">
                            <Star className="w-3 h-3 mr-1 text-amber-500" />
                            {item.pointsCost} 分
                          </Badge>
                          <Button size="sm" disabled={!canAfford} variant={canAfford ? "default" : "secondary"}>
                            {canAfford ? "兑换" : "积分不足"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 5: History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">积分明细</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2">日期</th>
                      <th className="text-left p-2">描述</th>
                      <th className="text-center p-2">类型</th>
                      <th className="text-right p-2">积分</th>
                      <th className="text-right p-2">余额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_HISTORY.map(tx => (
                      <tr key={tx.id} className="border-b">
                        <td className="p-2 text-muted-foreground">{tx.transactionDate}</td>
                        <td className="p-2">{tx.description}</td>
                        <td className="p-2 text-center">
                          <Badge variant={tx.type === "award" ? "default" : "destructive"} className="text-[10px]">
                            {tx.type === "award" ? "奖励" : tx.type === "penalty" ? "扣除" : "兑换"}
                          </Badge>
                        </td>
                        <td className={`p-2 text-right font-mono font-semibold ${tx.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {tx.points >= 0 ? "+" : ""}{tx.points}
                        </td>
                        <td className="p-2 text-right font-mono">{tx.balanceAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Suggestion Channel */}
        <TabsContent value="suggestions" className="space-y-4">
          {/* Suggestion Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Lightbulb className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                <div className="text-2xl font-bold">{MOCK_SUGGESTIONS.length}</div>
                <div className="text-xs text-muted-foreground">总建议数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
                <div className="text-2xl font-bold">{MOCK_SUGGESTIONS.filter(s => ["effective", "outstanding", "major", "implemented"].includes(s.status)).length}</div>
                <div className="text-xs text-muted-foreground">已采纳</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                <div className="text-2xl font-bold">{MOCK_SUGGESTIONS.reduce((s, r) => s + r.pointsAwarded, 0)}</div>
                <div className="text-xs text-muted-foreground">累计奖励积分</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold">{MOCK_SUGGESTIONS.filter(s => ["submitted", "under_review"].includes(s.status)).length}</div>
                <div className="text-xs text-muted-foreground">待评审</div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Suggestion CTA */}
          <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Lightbulb className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium">提交合理化建议</div>
                  <div className="text-xs text-muted-foreground">有效建议50分 | 突出价值建议500分 | 重大价值建议5000分</div>
                </div>
              </div>
              <Button size="sm">
                <Send className="w-4 h-4 mr-1" />
                提交建议
              </Button>
            </CardContent>
          </Card>

          {/* Suggestion Flow Diagram */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                建议评选流程
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs text-center gap-1">
                {[
                  { label: "提交建议", desc: "员工填写" },
                  { label: "部门评审", desc: "经理评估" },
                  { label: "定级", desc: "有效/突出/重大" },
                  { label: "CEO审批", desc: "100分以上" },
                  { label: "积分发放", desc: "自动到账" },
                  { label: "全员公告", desc: "自动发布" },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="text-muted-foreground">→</div>}
                    <div className="flex-1 p-2 rounded bg-muted/50">
                      <div className="font-medium">{step.label}</div>
                      <div className="text-muted-foreground">{step.desc}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Suggestion List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">建议列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_SUGGESTIONS.map(s => {
                  const statusInfo = SUGGESTION_STATUS_MAP[s.status] ?? { label: s.status, color: "bg-gray-100" };
                  return (
                    <div key={s.id} className="p-3 rounded-lg border hover:border-amber-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.title}</span>
                            <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {s.employeeName} · {s.department} · {s.submittedAt}
                          </div>
                          {s.evaluatorNotes && (
                            <div className="text-xs mt-1 text-blue-600">评审: {s.evaluatorNotes}</div>
                          )}
                        </div>
                        <div className="text-right">
                          {s.pointsAwarded > 0 && (
                            <div className="text-green-600 font-bold">+{s.pointsAwarded}分</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Company Community */}
        <TabsContent value="community" className="space-y-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: "公告通知", count: 12, icon: <FileText className="w-4 h-4" />, color: "text-blue-600" },
              { label: "员工讨论", count: 28, icon: <MessageSquare className="w-4 h-4" />, color: "text-green-600" },
              { label: "荣誉成就", count: 8, icon: <Trophy className="w-4 h-4" />, color: "text-yellow-600" },
              { label: "知识分享", count: 15, icon: <Lightbulb className="w-4 h-4" />, color: "text-purple-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={s.color}>{s.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                社区动态
              </CardTitle>
              <CardDescription>公告、通知、荣誉表彰、知识分享等均在此展示，重要公告需确认已读</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_COMMUNITY_POSTS.map(post => (
                  <div key={post.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={post.type === "announcement" ? "default" : post.type === "achievement" ? "secondary" : "outline"} className="text-xs">
                            {post.type === "announcement" ? "公告" : post.type === "achievement" ? "荣誉" : post.type === "notice" ? "通知" : post.type === "knowledge" ? "知识" : "讨论"}
                          </Badge>
                          {post.pinned && <Badge variant="destructive" className="text-xs">置顶</Badge>}
                          {post.requiresAck && <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">需确认</Badge>}
                          <span className="text-xs text-muted-foreground">{post.date}</span>
                        </div>
                        <h4 className="font-semibold text-sm">{post.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground ml-4">
                        <span>👁 {post.views}</span>
                        <span>👍 {post.likes}</span>
                        {post.requiresAck && <span>✅ {post.acks}/{post.totalRecipients}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">👍 点赞</Button>
                      {post.requiresAck && !post.acked && (
                        <Button variant="outline" size="sm" className="h-7 text-xs border-orange-400 text-orange-600">确认已读</Button>
                      )}
                      {post.requiresAck && post.acked && (
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 已确认</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">社区公约</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>1. 社区实行实名制，所有发帖与互动均记录在案</p>
              <p>2. 系统自动过滤敏感词: 涉及歧视、侮辱、泄密等内容将被自动屏蔽或拦截</p>
              <p>3. 重要公告和荣誉通报由系统自动发布，需要确认的通知请及时点击"确认已读"</p>
              <p>4. 鼓励知识分享、经验交流，优质内容将获得额外积分奖励</p>
              <p>5. 禁止发布虚假信息、恶意攻击他人的内容，违规者将按制度扣除相应积分</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 8: Observation List */}
        <TabsContent value="observation" className="space-y-4">
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                观察名录 & 评优暂停
              </CardTitle>
              <CardDescription>
                低于500分: 停止半年评优 | 低于0分: 进入观察名录 (需部门经理约谈)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                <p>当前无员工处于观察名录中</p>
                <p className="text-xs mt-1">系统会自动监控积分阈值并执行对应措施</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: CEO Policy */}
        <TabsContent value="policy" className="space-y-4">
          <Card>
            <CardContent className="p-6 max-w-3xl mx-auto">
              <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold">GRT集团员工积分奖惩制度</h2>
                <p className="text-sm text-muted-foreground mt-1">GRT Group Employee Points & Credit System Policy</p>
                <p className="text-xs text-muted-foreground mt-1">生效日期: 2026年3月13日</p>
              </div>

              <div className="prose prose-sm max-w-none space-y-4">
                <h3 className="font-bold text-base">第一章 总则</h3>
                <p>为建设高效、公平、透明的企业文化，激励员工持续改进工作质量和效率，特制定本积分奖惩制度。</p>

                <h3 className="font-bold text-base">第二章 每日合规要求</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li><strong>晨间工作计划</strong>: 员工在打卡上班后15分钟内须提交当日工作计划。按时提交奖励3分，迟交扣2分，未提交扣5分。</li>
                  <li><strong>工作总结</strong>: 员工须在下班前完成当日工作任务总结。按时完成奖励3分，未提交扣5分。</li>
                  <li><strong>次日工作计划</strong>: 完成第二个工作日计划，额外奖励2分。</li>
                  <li><strong>报告质量</strong>: 工作报告内容详实、数据完整、有决策建议者奖励5分；报告敷衍、缺乏数据支撑者扣5分。</li>
                </ol>

                <h3 className="font-bold text-base">第三章 职级乘数</h3>
                <p>根据"高标准高期望高回报"原则，积分按职级实行差异化乘数:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>普通员工 (staff/employee)</strong>: 基础分 ×1</li>
                  <li><strong>工程师及以上 (engineer/specialist/team_leader)</strong>: 基础分 ×10</li>
                  <li><strong>经理及以上 (manager/director)</strong>: 基础分 ×100</li>
                  <li><strong>事业部经理 (bu_gm)</strong>: 基础分 ×100</li>
                </ul>
                <p className="text-xs text-muted-foreground">注: 乘数同时适用于奖励和处罚 — 职级越高，责任越大，奖惩幅度越大。</p>

                <h3 className="font-bold text-base">第四章 考勤纪律</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>迟到: 扣3分 (基础分)</li>
                  <li><strong>未在系统里按照要求申请得到批准的迟到</strong>: 扣8分 (适用职级乘数)</li>
                  <li><strong>未在系统里按照要求申请得到批准的早退</strong>: 扣8分 (适用职级乘数)</li>
                  <li>已在系统申请并获批准的迟到/早退: 扣1分</li>
                  <li>非休息时段离岗: 扣5分 (适用职级乘数)</li>
                  <li>一周全勤: 奖励5分</li>
                  <li>月度全勤: 奖励20分</li>
                </ul>

                <h3 className="font-bold text-base">第四章B 工时填报</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>按时填报工时: 奖励2分 (适用职级乘数)</li>
                  <li><strong>未填报工时</strong>: 扣5分 (适用职级乘数)</li>
                  <li>工时填报不完整: 扣3分 (适用职级乘数)</li>
                  <li><strong>工时虚报</strong>: 扣20分 (适用职级乘数) — 情节严重者追究纪律处分</li>
                </ul>

                <h3 className="font-bold text-base">第四章C 员工推荐</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>推荐候选人通过GRT面试并入职 (工程师以下岗位): <strong>奖励300分</strong></li>
                  <li>推荐候选人通过GRT面试并入职 (工程师及以上岗位): <strong>奖励500分</strong></li>
                </ul>

                <h3 className="font-bold text-base">第五章 红黑榜积分联动</h3>
                <p>现有红黑榜处罚制度保持不变，违规事件同步扣除对应积分:</p>
                <h4 className="font-semibold text-sm mt-2">黑榜处罚 (按严重程度)</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>一般违规 (MINOR)</strong>: 扣10分 (适用职级乘数) — 警告记录</li>
                  <li><strong>重大违规 (MAJOR)</strong>: 扣50分 (适用职级乘数) — 冻结绩效 + 部门通报</li>
                  <li><strong>严重违规 (CRITICAL)</strong>: 扣100分 (适用职级乘数) — 冻结绩效 + 上报CEO</li>
                </ul>
                <h4 className="font-semibold text-sm mt-2">黑榜处罚 (按事件类型，与严重程度叠加)</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>质量缺陷: 额外扣15分 | 安全事故: 额外扣30分 | 合规违反: 额外扣20分</li>
                  <li>客户投诉: 额外扣20分 | 财务异常: 额外扣25分</li>
                </ul>
                <h4 className="font-semibold text-sm mt-2">红榜奖励</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>月度标兵 (绩效Top5): 奖励30分</li>
                  <li>连续3个月零缺陷: 奖励50分</li>
                  <li>客户书面表扬: 奖励25分</li>
                  <li>安全标兵 (全年无事故): 奖励40分</li>
                  <li>创新之星 (公司级创新奖项): 奖励100分</li>
                </ul>

                <h3 className="font-bold text-base">第五章B 绩效积分联动</h3>
                <p>系统每月自动评估员工综合绩效评分，与积分系统联动:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>KPI综合评分达到85分以上</strong>: 当月奖励200分</li>
                  <li>KPI综合评分低于60分: 当月扣除50分</li>
                  <li><strong>连续三个月绩效提高20%以上</strong>: 额外奖励50分</li>
                  <li><strong>连续三个月绩效下降20%以上</strong>: 扣除100分</li>
                </ul>
                <p className="text-xs text-muted-foreground">注: 绩效积分由系统按月自动评估，无需人工操作。</p>

                <h3 className="font-bold text-base">第五章C 合理化建议</h3>
                <p>鼓励员工积极提出改善公司运营、产品质量和管理效率的建议。按价值贡献大小分级激励:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>有效建议</strong>: 奖励50分 — 建议被采纳并产生改善效果</li>
                  <li><strong>突出价值建议</strong>: 奖励500分 — 显著降低成本、提高效率或改善质量</li>
                  <li><strong>重大价值建议</strong>: 奖励5000分 — 产生重大经济效益或战略影响</li>
                </ul>
                <p className="text-xs text-muted-foreground">注: 建议价值等级由部门经理评估，经CEO审批后生效。</p>

                <h3 className="font-bold text-base">第五章D 各岗位KPI积分</h3>
                <p>所有岗位均有对应KPI考核，<strong>连续2个月不达标首次扣500分，第3个月起每月翻倍处罚</strong> (-1000 → -2000 → -4000 → ...):</p>

                <h4 className="font-semibold text-sm mt-2">销售工程师</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>新销售工程师首个订单≥300万</strong>: 奖励1000分</li>
                  <li><strong>连续6个月未有订单</strong>: 扣除1000分，第7月起每月+1000</li>
                  <li><strong>连续2个月新客户进入M2阶段不足3个</strong>: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">研发工程师</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月项目里程碑完成率 &lt; 80%: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">质量工程师</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月客户投诉率超过目标值: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">生产主管</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月OEE低于85%目标: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">项目经理</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月项目延期率 &gt; 20%: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">售后工程师</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月工单48h关闭率 &lt; 90%: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">采购工程师</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月供应商准时交付率 &lt; 95%: 扣500分，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">事业部经理</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月BU利润率低于目标: 扣500分 ×100倍乘数，后续翻倍</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">HR</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>连续2个月关键岗位空缺率 &gt; 15%: 扣500分，后续翻倍</li>
                </ul>

                <h3 className="font-bold text-base">第五章E 团队/项目 — 高表现高作风激励</h3>
                <p>GRT倡导"高绩效+高作风"双高文化，绩效与作风同等重要:</p>

                <h4 className="font-semibold text-sm mt-2">团队高绩效奖励</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>季度最佳团队</strong>: 全员+100分</li>
                  <li>项目按时按质交付: 全员+80分 | 季度零缺陷: 全员+150分</li>
                  <li>客户满意度≥95%: +100分 | 创新突破: +200分 | 降本增效≥50万: +300分</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">团队低作风处罚 (适用职级乘数)</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>协作不力</strong>: -50分 — 推诿扯皮、信息不共享</li>
                  <li><strong>推卸责任</strong>: -80分 — 出现问题相互推诿而非解决</li>
                  <li><strong>信息孤岛</strong>: -60分 — 不共享关键信息导致重复工作</li>
                  <li><strong>集体延期</strong>: -100分 — 非不可抗力的团队整体交付延期</li>
                  <li>会议效率低下: -30分 — 无议程、无结论、无跟进</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">项目高绩效奖励</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>提前交付: +100分 | 低于预算: +120分 | 客户表彰: +150分 | 最佳实践沉淀: +80分</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">项目低作风处罚 (适用职级乘数)</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>风险隐瞒</strong>: -200分 — 已知风险未上报导致问题扩大</li>
                  <li><strong>质量偷工减料</strong>: -150分 — 赶进度跳过质量检查</li>
                  <li>需求镀金: -80分 | 交接不清: -60分 | 周报连续缺失: -50分</li>
                </ul>

                <h4 className="font-semibold text-sm mt-2">个人表现 vs 作风</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>高产出低团队意识</strong>: -30分 — 绩效优秀但拒绝帮助同事</li>
                  <li><strong>技术傲慢</strong>: -40分 — 以技术优势压制同事意见</li>
                  <li><strong>优秀导师</strong>: +100分 — 新人3个月内独立上岗</li>
                  <li>跨部门协作之星: +80分 | 知识分享达人(≥3次/季): +60分</li>
                </ul>

                <h3 className="font-bold text-base">第五章F 职场行为规范</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>吵架等行为影响他人工作</strong>: 扣1000分 (适用职级乘数) — 在工作场所吵架、争吵、大声喧哗等影响他人正常工作</li>
                  <li><strong>损害公司文化形象</strong>: 扣2000分 (适用职级乘数) — 行为造成公司文化形象负面影响，含对外场合、社交媒体等</li>
                </ul>

                <h3 className="font-bold text-base">第五章G 重大成就与重大失误 (±1000分)</h3>
                <p>以下场景奖励1000分，反之处罚1000分 (处罚适用职级乘数):</p>
                <div className="overflow-auto mt-2">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-1.5 text-left border">领域</th>
                        <th className="p-1.5 text-left border text-green-700">奖励 (+1000)</th>
                        <th className="p-1.5 text-left border text-red-700">处罚 (-1000 ×职级乘数)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-1.5 border font-medium">项目</td>
                        <td className="p-1.5 border">交付质量/进度/成本全面超越预期</td>
                        <td className="p-1.5 border">管理不善导致重大延期/超预算/质量事故</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">客户</td>
                        <td className="p-1.5 border">客户重大书面表彰、续签大单或主动推荐</td>
                        <td className="p-1.5 border">因服务/质量导致客户重大投诉、索赔或流失</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">风险</td>
                        <td className="p-1.5 border">及时发现并阻止重大质量/安全/财务失误</td>
                        <td className="p-1.5 border">因疏忽或失职导致重大质量/安全/财务损失</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">装配调试</td>
                        <td className="p-1.5 border">提出重大创新方案，显著提升效率或良率</td>
                        <td className="p-1.5 border">操作不当导致设备损坏或批量返工</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="font-bold text-base mt-4">第五章H 见义勇为与吹哨人保护</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>见义勇为</strong>: 奖励2000分 — 在工作场所或公司相关场合见义勇为</li>
                  <li><strong>重大险情处置得当</strong>: 奖励2000分 — 面对安全/设备/火灾等重大险情冷静处置，避免或减小损失</li>
                  <li><strong>吹哨人阻止/降低不当行为影响</strong>: 奖励2000分 — 主动举报或阻止违规、不当行为发生，或降低其影响</li>
                </ul>
                <p className="text-xs text-muted-foreground">注: 以上奖励不适用职级乘数，所有员工统一标准。公司保护吹哨人身份不受报复。</p>

                <h3 className="font-bold text-base">第五章I 经理工作区积分填报</h3>
                <p>经理及以上级别可在自己的工作区内直接填报员工积分奖惩:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>|积分| ≤ 100</strong>: 经理直接执行，实时生效</li>
                  <li><strong>|积分| &gt; 100</strong>: 需经上级审批后生效</li>
                  <li>所有填报记录保留审计轨迹</li>
                </ul>

                <h3 className="font-bold text-base">第六章 积分阈值、里程碑通报与范围</h3>

                <h4 className="font-semibold text-sm mt-2">一、通报场景与范围</h4>
                <div className="overflow-auto mt-2">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-1.5 text-left border">场景</th>
                        <th className="p-1.5 text-left border">触发条件</th>
                        <th className="p-1.5 text-left border">通报范围</th>
                        <th className="p-1.5 text-left border">通报形式</th>
                        <th className="p-1.5 text-left border">优先级</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-green-50">
                        <td className="p-1.5 border font-medium">10K里程碑表彰</td>
                        <td className="p-1.5 border">积分达到10,000</td>
                        <td className="p-1.5 border">全员</td>
                        <td className="p-1.5 border">系统通知 + 通报表彰</td>
                        <td className="p-1.5 border">高</td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="p-1.5 border font-medium">20K特别表彰</td>
                        <td className="p-1.5 border">积分达到20,000</td>
                        <td className="p-1.5 border">全员</td>
                        <td className="p-1.5 border">系统通知 + 特别表彰 + 授予荣誉称号</td>
                        <td className="p-1.5 border">紧急</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">评优暂停</td>
                        <td className="p-1.5 border">积分低于500</td>
                        <td className="p-1.5 border">管理链(经理→总监→CEO)</td>
                        <td className="p-1.5 border">系统通知</td>
                        <td className="p-1.5 border">普通</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">观察名录</td>
                        <td className="p-1.5 border">积分低于0</td>
                        <td className="p-1.5 border">本部门</td>
                        <td className="p-1.5 border">系统通知 + 要求3日内约谈</td>
                        <td className="p-1.5 border">高</td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="p-1.5 border font-medium">-5K通报警示</td>
                        <td className="p-1.5 border">积分跌至-5,000</td>
                        <td className="p-1.5 border">全员</td>
                        <td className="p-1.5 border">系统通知 + 通报警示 + 要求改善计划</td>
                        <td className="p-1.5 border">高</td>
                      </tr>
                      <tr className="bg-red-50">
                        <td className="p-1.5 border font-medium">-10K严重警示</td>
                        <td className="p-1.5 border">积分跌至-10,000</td>
                        <td className="p-1.5 border">全员</td>
                        <td className="p-1.5 border">系统通知 + 严重警示 + 专项评估</td>
                        <td className="p-1.5 border">紧急</td>
                      </tr>
                      <tr className="bg-amber-50">
                        <td className="p-1.5 border font-medium">合理化建议(有效)</td>
                        <td className="p-1.5 border">建议被采纳</td>
                        <td className="p-1.5 border">本部门</td>
                        <td className="p-1.5 border">部门内公告</td>
                        <td className="p-1.5 border">普通</td>
                      </tr>
                      <tr className="bg-amber-50">
                        <td className="p-1.5 border font-medium">合理化建议(突出/重大)</td>
                        <td className="p-1.5 border">CEO审批通过</td>
                        <td className="p-1.5 border">全员</td>
                        <td className="p-1.5 border">系统通知 + 特别公告 + 预计收益展示</td>
                        <td className="p-1.5 border">高</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-sm mt-3">二、通报内容格式</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>表彰通报</strong>: 员工姓名、部门、里程碑积分、主要贡献领域、号召学习</li>
                  <li><strong>特别表彰</strong>: 同上 + 授予"GRT卓越员工"荣誉称号 + 管理层署名</li>
                  <li><strong>警示通报</strong>: 员工姓名、部门、当前积分、主要不足领域、改善要求及时限</li>
                  <li><strong>严重警示</strong>: 同上 + 要求2日内书面说明 + 启动专项评估 + 管理层署名</li>
                  <li><strong>建议公告</strong>: 提出人、建议标题、预期收益/节省金额、奖励积分</li>
                </ul>

                <h4 className="font-semibold text-sm mt-3">三、通报范围说明</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>全员</strong>: 系统推送至所有在职员工，首页公告栏展示</li>
                  <li><strong>本部门</strong>: 仅同部门员工可见，部门公告栏展示</li>
                  <li><strong>管理链</strong>: 仅直属经理、总监、CEO收到通知</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-1">注: 所有通报由系统自动触发和发布，无需人工操作。通报记录永久保存，可追溯。</p>

                <h3 className="font-bold text-base">第七章 精英福利制度</h3>
                <p>积分系统与工作制度联动，持续高表现员工可逐级解锁精英福利:</p>

                <h4 className="font-semibold text-sm mt-2">一、大小休申请条件 (3个月)</h4>
                <p>同时满足以下三项条件的员工，可申请3个月大小休:</p>
                <div className="overflow-auto mt-2">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-1.5 text-left border">条件</th>
                        <th className="p-1.5 text-left border">要求</th>
                        <th className="p-1.5 text-left border">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-green-50">
                        <td className="p-1.5 border font-medium">积分余额</td>
                        <td className="p-1.5 border">≥5,000分</td>
                        <td className="p-1.5 border">需稳步增长并保持，非突击达标</td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="p-1.5 border font-medium">KPI考核</td>
                        <td className="p-1.5 border">连续6个月≥83分</td>
                        <td className="p-1.5 border">取最近6个月绩效平均分</td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="p-1.5 border font-medium">技能等级</td>
                        <td className="p-1.5 border">≥L3</td>
                        <td className="p-1.5 border">技能矩阵评定等级</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-sm mt-3">二、五天工作制升级条件</h4>
                <p>在享受大小休期间，连续两次以上保持高水准交付的员工，可申请升级为五天工作制（持续生效）:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>前提</strong>: 已在大小休生效期内</li>
                  <li><strong>交付标准</strong>: 项目交付质量评分≥85分，连续≥2次</li>
                  <li><strong>生效方式</strong>: 一旦获批，持续生效，无固定期限</li>
                </ul>

                <h4 className="font-semibold text-sm mt-3">三、动态考评与降级机制</h4>
                <p className="text-red-700 font-medium">精英福利不是终身制，系统每月自动考评，不满足条件者恢复六天工作制:</p>
                <div className="overflow-auto mt-2">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-1.5 text-left border">降级触发条件</th>
                        <th className="p-1.5 text-left border">处理流程</th>
                        <th className="p-1.5 text-left border">后果</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-1.5 border font-medium">KPI连续2个月 &lt; 80分</td>
                        <td className="p-1.5 border">第1个月发出警告，可提交承诺改善；第2个月仍未达标→强制恢复</td>
                        <td className="p-1.5 border text-red-600">恢复六天工作制 + 冷却期</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">积分降至 &lt; 5,000</td>
                        <td className="p-1.5 border">立即撤销，无缓冲期</td>
                        <td className="p-1.5 border text-red-600">恢复六天工作制 + 冷却期</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border font-medium">技能等级降级至L3以下</td>
                        <td className="p-1.5 border">立即撤销，无缓冲期</td>
                        <td className="p-1.5 border text-red-600">恢复六天工作制 + 冷却期</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-semibold text-sm mt-3">四、承诺改善机制</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>KPI首次低于80分时，员工可提交<strong>"加强承诺书"</strong>，承诺加强非周末时间投入以达成目标</li>
                  <li>承诺后给予<strong>2个月改善窗口</strong></li>
                  <li>2个月内KPI提升至80分以上 → 保留精英福利</li>
                  <li>2个月内仍未达标 → <strong>强制恢复六天工作制</strong></li>
                </ul>

                <h4 className="font-semibold text-sm mt-3">五、冷却期与重新申请</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>每次撤销后，下次申请的评选周期<strong>增加1个月</strong>冷却期</li>
                  <li>第1次撤销 → 冷却1个月；第2次 → 冷却2个月；以此类推</li>
                  <li>冷却期内不可申请任何精英福利</li>
                  <li>此规则同样适用于<strong>岗位提升评估</strong>——福利撤销记录作为晋升参考</li>
                </ul>

                <h4 className="font-semibold text-sm mt-3">六、申请与审批流程</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>员工在积分中心提交申请，系统自动校验条件（含冷却期检查）</li>
                  <li>条件满足后提交至HR/部门总监审批</li>
                  <li>审批通过后自动生效，同步更新考勤组</li>
                  <li>系统每月自动巡检考评，结果记录在月度考评表中</li>
                  <li>获批/撤销信息在公司社区公示</li>
                </ul>

                <h3 className="font-bold text-base">第八章 积分兑换</h3>
                <p>员工可在年底员工大会前将积分兑换为以下奖励:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>带薪休假 (200分/半天，400分/天，1000分/3天)</li>
                  <li>GRT欧洲公司工作2周 (3000分) / 4周 (5000分)</li>
                  <li>GRT美国公司工作2周 (3500分) / 4周 (6000分)</li>
                  <li>购物卡、培训经费、停车位等</li>
                </ul>

                <h3 className="font-bold text-base">第九章 附则</h3>
                <p>本制度自发布之日起执行。最终解释权归GRT集团管理层所有。</p>
              </div>

              {/* CEO Signature */}
              <div className="mt-8 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">批准人</div>
                    <div className="mt-2 text-2xl font-serif italic text-slate-700">倪亚东</div>
                    <div className="text-xs text-muted-foreground mt-1">CEO, GRT Group</div>
                    <div className="text-xs text-muted-foreground">2026年3月13日</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
