/**
 * ValueChainVisualizer — GRT 客户价值实现的"黄金链条"
 *
 * CEO 原文："在 GRT，没有哪个部门是孤立的岛屿。客户价值的实现是一场完美的接力赛。"
 *
 * Horizontal relay-race flow:
 *   Sales(洞察与开局) → R&D(定义与破局) → Production(兑现与铸造)
 *   → Quality(捍卫与封锁) → Service(守护与延续)
 *
 * Features:
 * - framer-motion staggered spring entry + pulsing relay connectors
 * - hover-to-expand: 核心竞争力 + 西门子级模范行为标准 + 红线
 * - Deep Space Black / Laser Blue / Metallic Silver palette
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Lightbulb,
  Factory,
  ShieldCheck,
  Headphones,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
  Award,
  AlertTriangle,
  Crosshair,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

// ─── Sci-fi palette ─────────────────────────────────────────────────
const COLORS = {
  deepSpace: "#0a0e1a",
  laserBlue: "#00d4ff",
  laserBlueGlow: "rgba(0,212,255,0.25)",
  metallicSilver: "#c0c8d8",
  accentCyan: "#06f5d6",
  accentPurple: "#a855f7",
  warningAmber: "#fbbf24",
  cardBg: "rgba(15,23,42,0.7)",
  cardBorder: "rgba(0,212,255,0.15)",
};

// ─── Chain node data (CEO manifesto verbatim) ───────────────────────
export interface ValueChainNode {
  id: string;
  name: string;
  nameEn: string;
  relayVerb: string;            // 接力动词
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  gradient: string;
  glowColor: string;
  position: string;             // 组织定位
  coreCompetency: string;       // 核心竞争力
  behaviorStandard: string;     // 西门子级模范行为标准
  redLine: string;
  kpiLabels: string[];
}

export const VALUE_CHAIN_NODES: ValueChainNode[] = [
  {
    id: "sales",
    name: "全球销售与项目拓展部",
    nameEn: "Global Sales & Business Dev",
    relayVerb: "洞察与开局",
    icon: Target,
    gradient: "from-cyan-500/20 via-blue-600/10 to-transparent",
    glowColor: COLORS.laserBlue,
    position: "攻城略地的先锋，降维打击的引导者",
    coreCompetency: `顾问式技术营销——不是卖铁皮，而是卖"基于客户工艺痛点的整体解决方案"。`,
    behaviorStandard: `绝不给后方传导"脏数据"。M0 阶段的客情、竞争对手分析必须 100% 录入系统；对客户的承诺必须基于系统 AI 给出的能力边界，严禁"乱拍胸脯"导致的过度承诺。`,
    redLine: "M0 客情录入率 100% · 商机转化率 ≥ 35% · 报价响应 ≤ 48h",
    kpiLabels: ["商机转化率", "报价响应时间", "客户满意度", "CRM数据完整率"],
  },
  {
    id: "rnd",
    name: "研发与工程中心",
    nameEn: "R&D and Engineering Center",
    relayVerb: "定义与破局",
    icon: Lightbulb,
    gradient: "from-purple-500/20 via-violet-600/10 to-transparent",
    glowColor: COLORS.accentPurple,
    position: "GRT 的最强大脑，非标设备标准化的炼金术士",
    coreCompetency: "顶级的工业设计审美与模块化复用能力。",
    behaviorStandard: `图纸就是法律。所有 3D 模型与 P&ID 必须严格遵守 GRT 设定的规范体系上传系统。对标博世研发，做到"一次设计对"（First Time Right），利用数字孪生在 M3 阶段彻底消灭干涉和逻辑错误。`,
    redLine: "First Time Right ≥ 85% · 标准化复用率 ≥ 60% · DFMEA 覆盖率 100%",
    kpiLabels: ["设计一次通过率", "标准化复用率", "交付准时率", "DFMEA覆盖率"],
  },
  {
    id: "production",
    name: "生产制造与供应链部",
    nameEn: "Production & Supply Chain",
    relayVerb: "兑现与铸造",
    icon: Factory,
    gradient: "from-emerald-500/20 via-green-600/10 to-transparent",
    glowColor: COLORS.accentCyan,
    position: "铁军与交付心脏",
    coreCompetency: "极致的精益制造（Lean Manufacturing）与准时制交期控制。",
    behaviorStandard: `车间现场绝不允许出现"随心所欲的装配"。严格依照系统下发的 3D SOP 施工，扭矩打多少、线缆怎么走，必须符合系统红线。物料齐套率与装配防错率是唯一的考核尊严。`,
    redLine: "3D SOP 执行率 100% · OEE ≥ 75% · 一次合格率 ≥ 95% · 安全零事故",
    kpiLabels: ["OEE", "一次合格率", "物料齐套率", "交付准时率"],
  },
  {
    id: "quality",
    name: "质量管控部",
    nameEn: "Quality Assurance",
    relayVerb: "捍卫与封锁",
    icon: ShieldCheck,
    gradient: "from-red-500/20 via-rose-600/10 to-transparent",
    glowColor: "#f43f5e",
    position: "死守出厂最后一道红线的执剑人",
    coreCompetency: "拥有一票否决权——对任何不符合 VDA19 清洁度标准的设备敢于亮红牌停线。",
    behaviorStandard: "QA 拥有一票否决权。对任何不符合 VDA19 清洁度标准的设备敢于亮红牌停线。FAT 流程零妥协，不合格品绝不放行。",
    redLine: "FAT 一次通过率 ≥ 98% · VDA19 合规率 100% · 不合格品放行率 0%",
    kpiLabels: ["FAT一次通过率", "VDA19合规率", "客诉率", "过程审核评分"],
  },
  {
    id: "service",
    name: "全球客户服务部",
    nameEn: "Global Customer Service",
    relayVerb: "守护与延续",
    icon: Headphones,
    gradient: "from-amber-500/20 via-orange-600/10 to-transparent",
    glowColor: COLORS.warningAmber,
    position: "GRT 品牌在海外的特种部队",
    coreCompetency: `跨越时区的极速响应与"神兵天降"般的解决能力。`,
    behaviorStandard: `在底特律或梅明根的现场，你代表的就是中国高端制造的脸面。必须 100% 遵守北美 OSHA 或欧洲安全规范。现场日志每日必传，遇到技术死角立刻连线"数字云厅"，绝不留隐患给客户。`,
    redLine: "首次响应 ≤ 4h · OSHA/CE 合规率 100% · 现场日志日传率 100%",
    kpiLabels: ["首次响应时间", "备件交付周期", "客户续约率", "MTTR"],
  },
];

// ─── Animation variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const nodeVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14 },
  },
};

const expandVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: "auto" as const,
    marginTop: 12,
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.2 },
  },
};

const connectorVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const pulseKeyframes = {
  boxShadow: [
    "0 0 0px rgba(0,212,255,0)",
    "0 0 20px rgba(0,212,255,0.4)",
    "0 0 0px rgba(0,212,255,0)",
  ],
};

// ─── Subcomponents ──────────────────────────────────────────────────

function ConnectorArrow() {
  return (
    <motion.div
      variants={connectorVariants}
      className="hidden lg:flex items-center justify-center flex-shrink-0 w-10 origin-left"
    >
      <div className="relative w-full h-[2px]">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${COLORS.laserBlue}40, ${COLORS.laserBlue})` }}
        />
        <motion.div
          className="absolute right-0 -top-[3px] w-2 h-2 rounded-full"
          style={{ background: COLORS.laserBlue }}
          animate={pulseKeyframes}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <ChevronRight
          className="absolute -right-2 -top-[7px] w-4 h-4"
          style={{ color: COLORS.laserBlue }}
        />
      </div>
    </motion.div>
  );
}

function KpiBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border"
      style={{
        background: "rgba(0,212,255,0.06)",
        borderColor: "rgba(0,212,255,0.2)",
        color: COLORS.metallicSilver,
      }}
    >
      <TrendingUp className="w-2.5 h-2.5" style={{ color: COLORS.laserBlue }} />
      {label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface ValueChainVisualizerProps {
  compact?: boolean;
  onNodeClick?: (nodeId: string) => void;
}

export default function ValueChainVisualizer({ compact, onNodeClick }: ValueChainVisualizerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    onNodeClick?.(id);
  };

  return (
    <div className="w-full">
      {/* Title bar */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="relative">
            <Zap className="w-5 h-5" style={{ color: COLORS.laserBlue }} />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{ background: COLORS.laserBlueGlow }}
            />
          </div>
          <h2 className="text-lg font-bold tracking-wide" style={{ color: COLORS.metallicSilver }}>
            客户价值实现的"黄金链条"
          </h2>
          <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full border"
            style={{ borderColor: COLORS.cardBorder, color: COLORS.laserBlue }}
          >
            THE VALUE CHAIN
          </span>
        </motion.div>
      )}

      {/* Chain flow */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col lg:flex-row items-stretch gap-2 lg:gap-0"
      >
        {VALUE_CHAIN_NODES.map((node, index) => {
          const Icon = node.icon;
          const isExpanded = expandedId === node.id;
          return (
            <div key={node.id} className="flex items-start lg:items-center flex-1 min-w-0">
              {/* Node card */}
              <motion.div
                variants={nodeVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleExpand(node.id)}
                className="relative flex-1 rounded-xl cursor-pointer overflow-hidden border transition-colors"
                style={{
                  background: COLORS.cardBg,
                  borderColor: isExpanded ? node.glowColor : COLORS.cardBorder,
                  boxShadow: isExpanded ? `0 0 24px ${node.glowColor}30` : "none",
                }}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${node.gradient} pointer-events-none`} />

                {/* Content */}
                <div className="relative p-3">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      className="p-1.5 rounded-lg border"
                      style={{
                        borderColor: `${node.glowColor}40`,
                        background: `${node.glowColor}10`,
                      }}
                      animate={isExpanded ? { rotate: [0, 5, -5, 0] } : {}}
                      transition={{ repeat: isExpanded ? Infinity : 0, duration: 3 }}
                    >
                      <Icon className="w-4 h-4" style={{ color: node.glowColor }} />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-sm font-bold tracking-wide leading-tight"
                        style={{ color: COLORS.metallicSilver }}
                      >
                        {compact ? node.name.replace(/^全球|^生产制造与/, "") : node.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono tracking-widest" style={{ color: `${node.glowColor}90` }}>
                          {node.relayVerb.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      className="flex-shrink-0"
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: COLORS.metallicSilver }} />
                    </motion.div>
                  </div>

                  {/* Collapsed: position subtitle */}
                  {!compact && (
                    <p className="mt-1.5 text-[11px] leading-relaxed line-clamp-1 italic"
                      style={{ color: `${COLORS.metallicSilver}70` }}
                    >
                      "{node.position}"
                    </p>
                  )}

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        variants={expandVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="overflow-hidden"
                      >
                        {/* Core Competency */}
                        <div className="p-3 rounded-lg border mb-2"
                          style={{ background: `${node.glowColor}06`, borderColor: `${node.glowColor}15` }}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Crosshair className="w-3 h-3" style={{ color: node.glowColor }} />
                            <span className="text-[10px] font-mono tracking-widest" style={{ color: node.glowColor }}>
                              CORE COMPETENCY
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: COLORS.metallicSilver }}>
                            {node.coreCompetency}
                          </p>
                        </div>

                        {/* Behavioral Standard */}
                        <div className="p-3 rounded-lg border mb-2"
                          style={{ background: `${node.glowColor}04`, borderColor: `${node.glowColor}10` }}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Award className="w-3 h-3" style={{ color: node.glowColor }} />
                            <span className="text-[10px] font-mono tracking-widest" style={{ color: node.glowColor }}>
                              西门子级行为标准
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: `${COLORS.metallicSilver}cc` }}>
                            {node.behaviorStandard}
                          </p>
                        </div>

                        {/* Red line */}
                        <div className="p-3 rounded-lg border mb-2"
                          style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" }}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="text-[10px] font-mono tracking-widest text-red-400">RED LINE</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-red-300/80 font-mono">
                            {node.redLine}
                          </p>
                        </div>

                        {/* KPI badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {node.kpiLabels.map(kpi => (
                            <KpiBadge key={kpi} label={kpi} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom glow line */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${node.glowColor}, transparent)` }}
                  animate={{ opacity: isExpanded ? 1 : 0.3 }}
                />
              </motion.div>

              {/* Connector arrow */}
              {index < VALUE_CHAIN_NODES.length - 1 && <ConnectorArrow />}
            </div>
          );
        })}
      </motion.div>

      {/* Manifesto quote (non-compact only) */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center"
        >
          <p className="text-[11px] italic leading-relaxed max-w-3xl mx-auto"
            style={{ color: `${COLORS.metallicSilver}50` }}
          >
            "任何一个环节的掉链子，都是对客户信任的背叛。"
          </p>
        </motion.div>
      )}
    </div>
  );
}
