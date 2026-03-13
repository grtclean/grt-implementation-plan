/**
 * The Arena — 斗兽场全景战情室
 *
 * Left: 月度述职战情板 (AI data declaration + improvement plan input)
 * Right: 弃猫效应排行榜 (4 leaderboards with framer-motion animations)
 *
 * Gold glow for #1, grey flicker for bottom 10%, bonus gap bar chart
 * Dark industrial theme: bg-[#0a0e14] / border-[#1b2332]
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Swords,
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Skull,
  Target,
  BarChart3,
  Users,
  Zap,
  ChevronUp,
  ChevronDown,
  Shield,
  Flame,
} from "lucide-react";

// ── Dark Arena theme ──────────────────────────────────
const A_BG = "bg-[#0a0e14]";
const A_CARD = "bg-[#111820] border-[#1b2332]";
const A_TEXT = "text-[#e2e8f0]";
const A_MUTED = "text-[#64748b]";
const A_INPUT = "bg-[#0a0e14] border-[#1b2332] text-[#e2e8f0] placeholder:text-[#374151]";

// ── Tier colors & labels ──────────────────────────────
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  S: { label: "S 吃肉", color: "text-amber-300", bg: "bg-amber-900/30 border-amber-600", icon: <Crown className="h-3.5 w-3.5" /> },
  A: { label: "A 喝汤", color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-700", icon: <Trophy className="h-3.5 w-3.5" /> },
  B: { label: "B 温饱", color: "text-blue-400", bg: "bg-blue-900/20 border-blue-700", icon: <Shield className="h-3.5 w-3.5" /> },
  C: { label: "C 警告", color: "text-orange-400", bg: "bg-orange-900/20 border-orange-700", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  D: { label: "D 淘汰", color: "text-red-400", bg: "bg-red-900/20 border-red-700", icon: <Skull className="h-3.5 w-3.5" /> },
};

const BOARD_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  SALES: { label: "销售虎将榜", icon: <Flame className="h-4 w-4 text-orange-400" /> },
  ENGINEER: { label: "设计极客榜", icon: <Zap className="h-4 w-4 text-cyan-400" /> },
  DIVISION: { label: "事业部利润榜", icon: <BarChart3 className="h-4 w-4 text-emerald-400" /> },
  MANAGER: { label: "大管家榜", icon: <Users className="h-4 w-4 text-violet-400" /> },
};

// ── Demo data: 真实人名 & 事业部 ─────────────────────
const DEMO_RANKINGS: Record<string, any[]> = {
  SALES: [
    { entityId: 101, entityName: "吴卫成", entityType: "SALES",    department: "海外事业部·欧洲区",   comprehensiveScore: "96.50", rankPosition: 1,  totalInCategory: 18, bonusTier: "S", bonusMultiplier: "3.00", rankChange: 2,  buCode: "BU_OS" },
    { entityId: 102, entityName: "焦斌",   entityType: "SALES",    department: "商用车事业部",        comprehensiveScore: "93.20", rankPosition: 2,  totalInCategory: 18, bonusTier: "S", bonusMultiplier: "3.00", rankChange: 0,  buCode: "BU_CV" },
    { entityId: 103, entityName: "孙淼",   entityType: "SALES",    department: "海外事业部·北美区",   comprehensiveScore: "88.70", rankPosition: 3,  totalInCategory: 18, bonusTier: "A", bonusMultiplier: "1.80", rankChange: 1,  buCode: "BU_OS" },
    { entityId: 104, entityName: "杜显文", entityType: "SALES",    department: "乘用车事业部",        comprehensiveScore: "85.30", rankPosition: 4,  totalInCategory: 18, bonusTier: "A", bonusMultiplier: "1.80", rankChange: -1, buCode: "BU_PV" },
    { entityId: 105, entityName: "廉龙海", entityType: "SALES",    department: "半导体事业部",        comprehensiveScore: "82.10", rankPosition: 5,  totalInCategory: 18, bonusTier: "A", bonusMultiplier: "1.80", rankChange: 3,  buCode: "BU_SC" },
    { entityId: 106, entityName: "杨会龙", entityType: "SALES",    department: "工业通用事业部",      comprehensiveScore: "78.90", rankPosition: 6,  totalInCategory: 18, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 0,  buCode: "BU_IG" },
    { entityId: 107, entityName: "李兴伟", entityType: "SALES",    department: "海外事业部·东南亚区", comprehensiveScore: "75.40", rankPosition: 7,  totalInCategory: 18, bonusTier: "B", bonusMultiplier: "1.00", rankChange: -2, buCode: "BU_OS" },
    { entityId: 108, entityName: "张超",   entityType: "SALES",    department: "商用车事业部",        comprehensiveScore: "72.80", rankPosition: 8,  totalInCategory: 18, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 1,  buCode: "BU_CV" },
    { entityId: 109, entityName: "王犇",   entityType: "SALES",    department: "乘用车事业部",        comprehensiveScore: "70.10", rankPosition: 9,  totalInCategory: 18, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 0,  buCode: "BU_PV" },
    { entityId: 110, entityName: "沈龙翔", entityType: "SALES",    department: "工业通用事业部",      comprehensiveScore: "67.50", rankPosition: 10, totalInCategory: 18, bonusTier: "B", bonusMultiplier: "1.00", rankChange: -1, buCode: "BU_IG" },
    { entityId: 111, entityName: "周辉",   entityType: "SALES",    department: "半导体事业部",        comprehensiveScore: "63.20", rankPosition: 11, totalInCategory: 18, bonusTier: "B", bonusMultiplier: "1.00", rankChange: -3, buCode: "BU_SC" },
    { entityId: 112, entityName: "韩品来", entityType: "SALES",    department: "海外事业部·中东区",   comprehensiveScore: "58.80", rankPosition: 12, totalInCategory: 18, bonusTier: "C", bonusMultiplier: "0.50", rankChange: 0,  buCode: "BU_OS" },
    { entityId: 113, entityName: "王勇",   entityType: "SALES",    department: "商用车事业部",        comprehensiveScore: "55.40", rankPosition: 13, totalInCategory: 18, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -2, buCode: "BU_CV" },
    { entityId: 114, entityName: "王志强", entityType: "SALES",    department: "乘用车事业部",        comprehensiveScore: "51.90", rankPosition: 14, totalInCategory: 18, bonusTier: "C", bonusMultiplier: "0.50", rankChange: 1,  buCode: "BU_PV" },
    { entityId: 115, entityName: "殷小勇", entityType: "SALES",    department: "工业通用事业部",      comprehensiveScore: "48.30", rankPosition: 15, totalInCategory: 18, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -1, buCode: "BU_IG" },
    { entityId: 116, entityName: "匡凯旋", entityType: "SALES",    department: "半导体事业部",        comprehensiveScore: "42.70", rankPosition: 16, totalInCategory: 18, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -4, buCode: "BU_SC" },
    { entityId: 117, entityName: "刘坤",   entityType: "SALES",    department: "海外事业部·南美区",   comprehensiveScore: "35.10", rankPosition: 17, totalInCategory: 18, bonusTier: "D", bonusMultiplier: "0.00", rankChange: -3, buCode: "BU_OS" },
    { entityId: 118, entityName: "蒋秋瑞", entityType: "SALES",    department: "商用车事业部",        comprehensiveScore: "28.40", rankPosition: 18, totalInCategory: 18, bonusTier: "D", bonusMultiplier: "0.00", rankChange: -5, buCode: "BU_CV" },
  ],
  ENGINEER: [
    { entityId: 201, entityName: "曹工·曹庆伟", entityType: "ENGINEER", department: "清洗机研发中心",   comprehensiveScore: "97.80", rankPosition: 1,  totalInCategory: 14, bonusTier: "S", bonusMultiplier: "3.00", rankChange: 0,  buCode: "BU_IG" },
    { entityId: 202, entityName: "张工·张洵",   entityType: "ENGINEER", department: "视觉检测研发中心", comprehensiveScore: "94.30", rankPosition: 2,  totalInCategory: 14, bonusTier: "A", bonusMultiplier: "1.80", rankChange: 1,  buCode: "BU_SC" },
    { entityId: 203, entityName: "李工·李大鹏", entityType: "ENGINEER", department: "机械设计部",       comprehensiveScore: "91.60", rankPosition: 3,  totalInCategory: 14, bonusTier: "A", bonusMultiplier: "1.80", rankChange: -1, buCode: "BU_CV" },
    { entityId: 204, entityName: "杨工·杨之雲", entityType: "ENGINEER", department: "电气设计部",       comprehensiveScore: "87.20", rankPosition: 4,  totalInCategory: 14, bonusTier: "A", bonusMultiplier: "1.80", rankChange: 2,  buCode: "BU_PV" },
    { entityId: 205, entityName: "张工·张腾飞", entityType: "ENGINEER", department: "PLC软件开发组",    comprehensiveScore: "83.50", rankPosition: 5,  totalInCategory: 14, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 0,  buCode: "BU_IG" },
    { entityId: 206, entityName: "肖工·肖博雅", entityType: "ENGINEER", department: "ZLD系统研发",      comprehensiveScore: "79.40", rankPosition: 6,  totalInCategory: 14, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 1,  buCode: "BU_IG" },
    { entityId: 207, entityName: "朱工·朱明华", entityType: "ENGINEER", department: "结构仿真组",       comprehensiveScore: "75.80", rankPosition: 7,  totalInCategory: 14, bonusTier: "B", bonusMultiplier: "1.00", rankChange: -2, buCode: "BU_CV" },
    { entityId: 208, entityName: "蔡工·蔡瑞",   entityType: "ENGINEER", department: "清洗工艺研发",     comprehensiveScore: "71.30", rankPosition: 8,  totalInCategory: 14, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 0,  buCode: "BU_OS" },
    { entityId: 209, entityName: "范工·范威",   entityType: "ENGINEER", department: "电控系统组",       comprehensiveScore: "66.90", rankPosition: 9,  totalInCategory: 14, bonusTier: "B", bonusMultiplier: "1.00", rankChange: -1, buCode: "BU_PV" },
    { entityId: 210, entityName: "刘工·刘琛杨", entityType: "ENGINEER", department: "视觉算法组",       comprehensiveScore: "60.20", rankPosition: 10, totalInCategory: 14, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -3, buCode: "BU_SC" },
    { entityId: 211, entityName: "赵工·赵铖杰", entityType: "ENGINEER", department: "机械装配组",       comprehensiveScore: "54.70", rankPosition: 11, totalInCategory: 14, bonusTier: "C", bonusMultiplier: "0.50", rankChange: 0,  buCode: "BU_CV" },
    { entityId: 212, entityName: "胡工·胡绍杰", entityType: "ENGINEER", department: "液压系统组",       comprehensiveScore: "48.10", rankPosition: 12, totalInCategory: 14, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -2, buCode: "BU_IG" },
    { entityId: 213, entityName: "王工·王森",   entityType: "ENGINEER", department: "ZLD膜组件研发",    comprehensiveScore: "38.50", rankPosition: 13, totalInCategory: 14, bonusTier: "D", bonusMultiplier: "0.00", rankChange: -4, buCode: "BU_IG" },
    { entityId: 214, entityName: "吴工·吴阳洋", entityType: "ENGINEER", department: "自动化集成组",     comprehensiveScore: "31.20", rankPosition: 14, totalInCategory: 14, bonusTier: "D", bonusMultiplier: "0.00", rankChange: -3, buCode: "BU_OS" },
  ],
  DIVISION: [
    { entityId: 301, entityName: "海外事业部",     entityType: "DIVISION", department: "BU_OS · 欧洲+北美+东南亚+中东+南美", comprehensiveScore: "92.30", rankPosition: 1, totalInCategory: 5, bonusTier: "S", bonusMultiplier: "3.00", rankChange: 0,  buCode: "BU_OS" },
    { entityId: 302, entityName: "半导体事业部",   entityType: "DIVISION", department: "BU_SC · 视觉检测+晶圆清洗",         comprehensiveScore: "87.60", rankPosition: 2, totalInCategory: 5, bonusTier: "A", bonusMultiplier: "1.80", rankChange: 1,  buCode: "BU_SC" },
    { entityId: 303, entityName: "商用车事业部",   entityType: "DIVISION", department: "BU_CV · 商用车零部件清洗",          comprehensiveScore: "78.90", rankPosition: 3, totalInCategory: 5, bonusTier: "B", bonusMultiplier: "1.00", rankChange: -1, buCode: "BU_CV" },
    { entityId: 304, entityName: "乘用车事业部",   entityType: "DIVISION", department: "BU_PV · 乘用车精密清洗",            comprehensiveScore: "71.40", rankPosition: 4, totalInCategory: 5, bonusTier: "C", bonusMultiplier: "0.50", rankChange: 0,  buCode: "BU_PV" },
    { entityId: 305, entityName: "工业通用事业部", entityType: "DIVISION", department: "BU_IG · 通用工业清洗+ZLD",           comprehensiveScore: "64.20", rankPosition: 5, totalInCategory: 5, bonusTier: "D", bonusMultiplier: "0.00", rankChange: -2, buCode: "BU_IG" },
  ],
  MANAGER: [
    { entityId: 401, entityName: "金总·金晓锋",   entityType: "MANAGER", department: "海外事业部总经理",     comprehensiveScore: "95.10", rankPosition: 1, totalInCategory: 8, bonusTier: "S", bonusMultiplier: "3.00", rankChange: 0,  buCode: "BU_OS" },
    { entityId: 402, entityName: "洪总·洪香龙",   entityType: "MANAGER", department: "半导体事业部总经理",   comprehensiveScore: "89.70", rankPosition: 2, totalInCategory: 8, bonusTier: "A", bonusMultiplier: "1.80", rankChange: 1,  buCode: "BU_SC" },
    { entityId: 403, entityName: "孙总·孙坚",     entityType: "MANAGER", department: "研发总监",             comprehensiveScore: "86.30", rankPosition: 3, totalInCategory: 8, bonusTier: "A", bonusMultiplier: "1.80", rankChange: -1, buCode: "BU_IG" },
    { entityId: 404, entityName: "马总·马柯",     entityType: "MANAGER", department: "商用车事业部总经理",   comprehensiveScore: "80.50", rankPosition: 4, totalInCategory: 8, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 0,  buCode: "BU_CV" },
    { entityId: 405, entityName: "史总·史龙昌",   entityType: "MANAGER", department: "运营总监",             comprehensiveScore: "76.20", rankPosition: 5, totalInCategory: 8, bonusTier: "B", bonusMultiplier: "1.00", rankChange: 2,  buCode: "BU_IG" },
    { entityId: 406, entityName: "曹总·曹庆伟",   entityType: "MANAGER", department: "乘用车事业部总经理",   comprehensiveScore: "68.90", rankPosition: 6, totalInCategory: 8, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -2, buCode: "BU_PV" },
    { entityId: 407, entityName: "张总·张超",     entityType: "MANAGER", department: "工业通用事业部总经理", comprehensiveScore: "55.40", rankPosition: 7, totalInCategory: 8, bonusTier: "C", bonusMultiplier: "0.50", rankChange: -1, buCode: "BU_IG" },
    { entityId: 408, entityName: "杨总·杨勇",     entityType: "MANAGER", department: "供应链总监",           comprehensiveScore: "41.80", rankPosition: 8, totalInCategory: 8, bonusTier: "D", bonusMultiplier: "0.00", rankChange: -3, buCode: "BU_CV" },
  ],
};

// Demo battle report for left panel
const DEMO_BATTLE_REPORT = {
  id: 999,
  userId: 1,
  period: "",
  aiGeneratedSummary: "【本月战情综述】\n\n销售管道整体健康度较上月提升 8.3%，M0→M1 转化率达 42%，超出目标值。海外事业部欧洲区吴卫成连续3个月位居榜首，其清洗线方案在大众集团竞标中以技术分第一入围。\n\n关键亮点：\n• 半导体事业部新签中芯国际晶圆清洗线订单 ¥2,800万\n• 商用车事业部焦斌拿下潍柴动力年度清洗设备合同\n• 视觉检测产品线本月新增3个M1阶段项目\n\n风险警示：\n• 乘用车事业部 CAPEX 覆盖率仅 38%，需加速客户预算录入\n• 工业通用事业部 M3 项目数为0，管道断层风险",
  actualVsTargetKpi: {
    salesTarget: 18000000,
    salesActual: 14200000,
    salesGapPercent: 21.1,
    newClientTarget: 12,
    newClientActual: 9,
    meetingCount: 47,
    actionItemsCompleted: 38,
    actionItemsTotal: 52,
    m0Count: 15,
    m1Count: 8,
    m2Count: 5,
    m3Count: 3,
    capexCoveragePercent: 62,
  },
  meetingHighlights: [
    { meetingTitle: "大众集团清洗线技术方案评审", date: "03-08", keyDecisions: ["方案通过"] },
    { meetingTitle: "中芯国际晶圆清洗商务谈判", date: "03-05", keyDecisions: ["价格敲定"] },
    { meetingTitle: "月度销售复盘会议", date: "03-01", keyDecisions: ["调整Q2目标"] },
  ],
  aiTacticalSuggestions: [
    "加速乘用车事业部CAPEX录入，本周完成宝马、奔驰、一汽大众三家客户的年度预算采集",
    "吴卫成欧洲区经验可复制：安排与东南亚区李兴伟做1对1经验分享会",
    "工业通用事业部需在2周内推动至少2个M0→M1转化，建议锁定重点客户三一重工和徐工集团",
    "半导体视觉算法组需配合刘琛杨提升交付能力，当前10号位排名有持续下滑风险",
  ],
  improvementActionPlan: null,
  status: "ai_draft",
  generationTaskId: null,
  buCode: null,
  createdAt: "2026-03-01",
  updatedAt: "2026-03-10",
};

// Demo bonus gap data
const DEMO_GAP: Record<string, { top: any[]; bottom: any[]; gapMultiplier: string; topMultiplier: number; bottomMultiplier: number }> = {
  SALES: {
    top: [DEMO_RANKINGS.SALES[0], DEMO_RANKINGS.SALES[1], DEMO_RANKINGS.SALES[2]],
    bottom: [DEMO_RANKINGS.SALES[15], DEMO_RANKINGS.SALES[16], DEMO_RANKINGS.SALES[17]],
    gapMultiplier: "∞x", topMultiplier: 3.0, bottomMultiplier: 0,
  },
  ENGINEER: {
    top: [DEMO_RANKINGS.ENGINEER[0], DEMO_RANKINGS.ENGINEER[1], DEMO_RANKINGS.ENGINEER[2]],
    bottom: [DEMO_RANKINGS.ENGINEER[11], DEMO_RANKINGS.ENGINEER[12], DEMO_RANKINGS.ENGINEER[13]],
    gapMultiplier: "∞x", topMultiplier: 3.0, bottomMultiplier: 0,
  },
  DIVISION: {
    top: [DEMO_RANKINGS.DIVISION[0], DEMO_RANKINGS.DIVISION[1]],
    bottom: [DEMO_RANKINGS.DIVISION[3], DEMO_RANKINGS.DIVISION[4]],
    gapMultiplier: "∞x", topMultiplier: 3.0, bottomMultiplier: 0,
  },
  MANAGER: {
    top: [DEMO_RANKINGS.MANAGER[0], DEMO_RANKINGS.MANAGER[1], DEMO_RANKINGS.MANAGER[2]],
    bottom: [DEMO_RANKINGS.MANAGER[5], DEMO_RANKINGS.MANAGER[6], DEMO_RANKINGS.MANAGER[7]],
    gapMultiplier: "∞x", topMultiplier: 3.0, bottomMultiplier: 0,
  },
};

// ══════════════════════════════════════════════════════
// RankBadge — animated rank position
// ══════════════════════════════════════════════════════

function RankChange({ change }: { change: number | null }) {
  if (!change || change === 0) return <Minus className="h-3 w-3 text-[#374151]" />;
  if (change > 0) return (
    <span className="flex items-center text-emerald-400 text-[10px] font-bold">
      <ChevronUp className="h-3 w-3" />{change}
    </span>
  );
  return (
    <span className="flex items-center text-red-400 text-[10px] font-bold">
      <ChevronDown className="h-3 w-3" />{Math.abs(change)}
    </span>
  );
}

// ══════════════════════════════════════════════════════
// LeaderboardCard — Single ranked entity
// ══════════════════════════════════════════════════════

function LeaderboardCard({
  rank,
  totalInCategory,
}: {
  rank: any;
  totalInCategory: number;
}) {
  const isTop1 = rank.rankPosition === 1;
  const isBottom10 = totalInCategory > 0 && rank.rankPosition / totalInCategory > 0.9;
  const tier = TIER_CONFIG[rank.bonusTier] ?? TIER_CONFIG.B;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4, delay: rank.rankPosition * 0.03 }}
      className={`relative flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
        isTop1
          ? "border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-[#111820] to-amber-950/20"
          : isBottom10
          ? "border-red-900/40 bg-red-950/10"
          : "border-[#1b2332] bg-[#0f1419]"
      }`}
    >
      {/* Gold glow for #1 */}
      {isTop1 && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          animate={{
            boxShadow: [
              "0 0 8px rgba(251,191,36,0.15)",
              "0 0 20px rgba(251,191,36,0.3)",
              "0 0 8px rgba(251,191,36,0.15)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Crisis flicker for bottom 10% */}
      {isBottom10 && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-red-900/5"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Rank number */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        isTop1 ? "bg-amber-500 text-black" :
        rank.rankPosition <= 3 ? "bg-[#1b2332] text-amber-400 border border-amber-700" :
        isBottom10 ? "bg-red-950/50 text-red-400 border border-red-800" :
        "bg-[#1b2332] text-[#64748b]"
      }`}>
        {rank.rankPosition}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate ${
            isTop1 ? "text-amber-200" : isBottom10 ? "text-red-300/70" : A_TEXT
          }`}>
            {rank.entityName || `#${rank.entityId}`}
          </p>
          <RankChange change={rank.rankChange} />
        </div>
        {rank.department && (
          <p className={`text-[10px] ${A_MUTED} truncate`}>{rank.department}</p>
        )}
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-mono font-bold ${
          isTop1 ? "text-amber-300" : isBottom10 ? "text-red-400" : A_TEXT
        }`}>
          {Number(rank.comprehensiveScore).toFixed(1)}
        </p>
      </div>

      {/* Tier badge */}
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 shrink-0 ${tier.bg} ${tier.color}`}
      >
        {tier.icon}
        <span className="ml-0.5">{rank.bonusTier}</span>
      </Badge>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════
// BonusGapBar — Visual multiplier disparity
// ══════════════════════════════════════════════════════

function BonusGapBar({ entityType, period }: { entityType: string; period: string }) {
  const gap = trpc.battleArena.rankings.getBonusGapChart.useQuery({
    period,
    entityType: entityType as any,
  });

  // Use demo gap data when backend returns empty
  const gapData = (gap.data && gap.data.top.length > 0) ? gap.data : DEMO_GAP[entityType];
  if (!gapData || gapData.top.length === 0) return null;

  const topName = gapData.top[0]?.entityName ?? "#1";
  const bottomName = gapData.bottom[gapData.bottom.length - 1]?.entityName ?? "末位";

  return (
    <div className="mt-3 p-3 rounded-lg border border-[#1b2332] bg-[#0a0e14]">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-semibold ${A_MUTED}`}>奖金倍数差距</span>
        <motion.span
          className="text-lg font-black text-red-400 font-mono"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {gapData.gapMultiplier}
        </motion.span>
      </div>
      <div className="flex items-end gap-2 h-12">
        {/* Top bar */}
        <div className="flex-1 flex flex-col items-center">
          <motion.div
            className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: "100%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <p className="text-[9px] text-amber-400 mt-1 truncate w-full text-center">{topName}</p>
        </div>
        {/* Bottom bar */}
        <div className="flex-1 flex flex-col items-center">
          <motion.div
            className="w-full bg-gradient-to-t from-red-800 to-red-600 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(gapData.topMultiplier > 0 ? (gapData.bottomMultiplier / gapData.topMultiplier) * 100 : 5, 5)}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          />
          <p className="text-[9px] text-red-400 mt-1 truncate w-full text-center">{bottomName}</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Leaderboard Panel — Single entity type board
// ══════════════════════════════════════════════════════

function LeaderboardPanel({ entityType, period }: { entityType: string; period: string }) {
  const board = trpc.battleArena.rankings.getLeaderboard.useQuery({
    period,
    entityType: entityType as any,
    limit: 30,
  });

  const config = BOARD_CONFIG[entityType] ?? { label: entityType, icon: null };

  if (board.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 bg-[#1b2332] rounded-lg" />
        ))}
      </div>
    );
  }

  // Use demo data when backend returns empty
  const raw = board.data ?? [];
  const data = raw.length > 0 ? raw : (DEMO_RANKINGS[entityType] ?? []);
  const total = data[0]?.totalInCategory ?? data.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {config.icon}
        <h3 className={`text-sm font-bold ${A_TEXT}`}>{config.label}</h3>
        <Badge variant="outline" className="text-[10px] border-[#1b2332] text-[#64748b] ml-auto">
          {data.length}人
        </Badge>
      </div>

      <AnimatePresence>
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto scrollbar-hide">
          {data.map((rank: any) => (
            <LeaderboardCard
              key={`${rank.entityType}-${rank.entityId}`}
              rank={rank}
              totalInCategory={total}
            />
          ))}
          {data.length === 0 && (
            <div className={`text-center py-8 ${A_MUTED} text-sm`}>
              暂无排名数据
            </div>
          )}
        </div>
      </AnimatePresence>

      <BonusGapBar entityType={entityType} period={period} />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// BattleReportPanel — Left side: AI述职 + 改进计划
// ══════════════════════════════════════════════════════

function BattleReportPanel({ period }: { period: string }) {
  const report = trpc.battleArena.report.getMyReport.useQuery({ period });
  const [plan, setPlan] = useState("");
  const submitPlan = trpc.battleArena.report.submitPlan.useMutation({
    onSuccess: () => {
      toast.success("改进计划已提交");
      report.refetch();
    },
    onError: (err) => toast.error("提交失败: " + err.message),
  });

  if (report.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 bg-[#1b2332]" />
        <Skeleton className="h-24 bg-[#1b2332]" />
        <Skeleton className="h-32 bg-[#1b2332]" />
      </div>
    );
  }

  // Use demo data if backend returns null
  const data = report.data ?? { ...DEMO_BATTLE_REPORT, period };
  const kpi = data?.actualVsTargetKpi as any;

  return (
    <div className="space-y-4">
      {/* AI Data Declaration */}
      <Card className={`${A_CARD} border-l-4 border-l-cyan-600`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-bold ${A_TEXT} flex items-center gap-2`}>
            <Target className="h-4 w-4 text-cyan-400" />
            AI 战情数据宣告
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.aiGeneratedSummary ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <p className={`text-sm ${A_TEXT} leading-relaxed whitespace-pre-line`}>
                {data.aiGeneratedSummary}
              </p>
            </motion.div>
          ) : (
            <div className={`text-center py-6 ${A_MUTED}`}>
              <Skeleton className="h-4 w-full bg-[#1b2332] mb-2" />
              <Skeleton className="h-4 w-3/4 bg-[#1b2332] mb-2" />
              <Skeleton className="h-4 w-5/6 bg-[#1b2332]" />
              <p className="text-xs mt-3 flex items-center justify-center gap-1">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="inline-block w-2 h-2 rounded-full bg-cyan-400"
                />
                AI正在汇算战情...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Grid */}
      {kpi && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "销售目标", value: `¥${((kpi.salesTarget || 0) / 10000).toFixed(0)}万`, sub: `实际: ¥${((kpi.salesActual || 0) / 10000).toFixed(0)}万`, alert: kpi.salesGapPercent > 20 },
            { label: "M阶段项目", value: `${(kpi.m0Count || 0) + (kpi.m1Count || 0) + (kpi.m2Count || 0) + (kpi.m3Count || 0)}`, sub: `M0:${kpi.m0Count} M1:${kpi.m1Count} M2:${kpi.m2Count} M3:${kpi.m3Count}` },
            { label: "会议转化", value: `${kpi.actionItemsTotal > 0 ? Math.round((kpi.actionItemsCompleted / kpi.actionItemsTotal) * 100) : 0}%`, sub: `${kpi.actionItemsCompleted}/${kpi.actionItemsTotal} 行动项` },
            { label: "CAPEX覆盖", value: `${kpi.capexCoveragePercent || 0}%`, sub: `${kpi.meetingCount || 0} 次会议`, alert: (kpi.capexCoveragePercent || 0) < 50 },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-3 rounded-lg border ${
                item.alert ? "border-red-800/60 bg-red-950/20" : "border-[#1b2332] bg-[#0f1419]"
              }`}
            >
              <p className={`text-[10px] ${A_MUTED}`}>{item.label}</p>
              <p className={`text-lg font-bold font-mono ${item.alert ? "text-red-400" : A_TEXT}`}>
                {item.value}
              </p>
              <p className={`text-[10px] ${A_MUTED}`}>{item.sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Meeting Highlights */}
      {data?.meetingHighlights && (data.meetingHighlights as any[]).length > 0 && (
        <Card className={A_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-xs font-semibold ${A_MUTED}`}>
              本月会议要点
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.meetingHighlights as any[]).slice(0, 3).map((m: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`${A_MUTED} shrink-0`}>{m.date}</span>
                <span className={A_TEXT}>{m.meetingTitle}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Improvement Plan Input */}
      <Card className={`${A_CARD} border-l-4 border-l-red-600`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            亟待改进计划
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={plan || data?.improvementActionPlan || ""}
            onChange={e => setPlan(e.target.value)}
            placeholder="请详细阐述下月的改进措施、资源需求和时间节点..."
            className={`${A_INPUT} min-h-[100px] text-sm border-red-900/30 focus:border-red-600`}
            rows={5}
          />
          {data?.aiTacticalSuggestions && (data.aiTacticalSuggestions as string[]).length > 0 && (
            <div>
              <p className={`text-[10px] font-semibold text-cyan-400 mb-1`}>AI 建议参考:</p>
              <ul className="space-y-1">
                {(data.aiTacticalSuggestions as string[]).map((s, i) => (
                  <li key={i} className={`text-xs ${A_MUTED} flex items-start gap-1`}>
                    <span className="text-cyan-600">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button
            onClick={() => {
              if (!data?.id) return;
              submitPlan.mutate({
                reportId: data.id,
                improvementActionPlan: plan || data?.improvementActionPlan || "",
              });
            }}
            disabled={!data?.id || submitPlan.isPending || data?.status === "locked"}
            className="w-full bg-red-700 hover:bg-red-800 text-white h-8 text-sm"
          >
            {data?.status === "locked" ? "已锁定" :
             submitPlan.isPending ? "提交中..." : "提交改进计划"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TierDistribution — Pie-like tier breakdown
// ══════════════════════════════════════════════════════

function TierDistribution({ tierCounts, total }: { tierCounts: Record<string, number>; total: number }) {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {(["S", "A", "B", "C", "D"] as const).map(tier => {
        const count = tierCounts[tier] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const cfg = TIER_CONFIG[tier];
        return (
          <motion.div
            key={tier}
            className={`rounded ${cfg.bg} border px-1.5 py-0.5 text-center`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            title={`${cfg.label}: ${count}人 (${pct.toFixed(0)}%)`}
          >
            <p className={`text-[10px] font-bold ${cfg.color}`}>{tier}</p>
            <p className={`text-xs font-mono ${A_TEXT}`}>{count}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main: TheArena
// ══════════════════════════════════════════════════════

export default function TheArena() {
  const [period] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [activeBoard, setActiveBoard] = useState("SALES");

  const warRoom = trpc.battleArena.arena.getWarRoomData.useQuery({ period });
  const overview = trpc.battleArena.arena.getArenaOverview.useQuery({ period });

  // Demo tier counts & overview when backend is empty
  const demoTierCounts = useMemo(() => {
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    for (const list of Object.values(DEMO_RANKINGS)) {
      for (const r of list) counts[r.bonusTier] = (counts[r.bonusTier] ?? 0) + 1;
    }
    return counts;
  }, []);
  const demoTotal = useMemo(() =>
    Object.values(DEMO_RANKINGS).reduce((s, list) => s + list.length, 0),
  []);

  return (
    <div className={`min-h-screen ${A_BG} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Swords className="h-7 w-7 text-red-500" />
          </motion.div>
          <div>
            <h1 className={`text-xl font-black ${A_TEXT} tracking-tight`}>
              THE ARENA — 全景战情室
            </h1>
            <p className={`text-xs ${A_MUTED}`}>
              弃猫效应排名系统 · {period} · {overview.data?.totalRankings || demoTotal} 参战实体
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TierDistribution
            tierCounts={warRoom.data?.tierCounts ?? demoTierCounts}
            total={warRoom.data?.totalEntities ?? demoTotal}
          />
          <Badge variant="outline" className="border-red-800 text-red-400 text-xs font-mono">
            {period}
          </Badge>
        </div>
      </div>

      {/* Main Layout: Battle Report + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Battle Report — 40% */}
        <div className="lg:col-span-2">
          <Card className={A_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-bold ${A_TEXT} flex items-center gap-2`}>
                <Target className="h-4 w-4 text-cyan-400" />
                月度述职战情板
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BattleReportPanel period={period} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Arena Leaderboards — 60% */}
        <div className="lg:col-span-3">
          <Card className={A_CARD}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-sm font-bold ${A_TEXT} flex items-center gap-2`}>
                  <Trophy className="h-4 w-4 text-amber-400" />
                  弃猫效应排行榜
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeBoard} onValueChange={setActiveBoard}>
                <TabsList className="grid grid-cols-4 bg-[#0a0e14] border border-[#1b2332] mb-4">
                  {(["SALES", "ENGINEER", "DIVISION", "MANAGER"] as const).map(type => {
                    const cfg = BOARD_CONFIG[type];
                    return (
                      <TabsTrigger
                        key={type}
                        value={type}
                        className="text-xs data-[state=active]:bg-[#1b2332] data-[state=active]:text-white"
                      >
                        <span className="flex items-center gap-1">
                          {cfg.icon}
                          <span className="hidden sm:inline">{cfg.label}</span>
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {(["SALES", "ENGINEER", "DIVISION", "MANAGER"] as const).map(type => (
                  <TabsContent key={type} value={type}>
                    <LeaderboardPanel entityType={type} period={period} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
