/**
 * DepartmentExcellenceCard — 各部门动态军令状与名录卡片
 *
 * CEO manifesto: "西门子级"模范行为标准 × 科技感 × 实时 KPI
 *
 * Card structure:
 * - Header: abstract sci-fi background + department glow
 * - Position: organizational role quotation
 * - Core Competency: what makes this department elite
 * - Behavioral Standard: "Siemens-grade" requirements (CEO language)
 * - Red Lines: non-negotiable metrics
 * - KPI Grid: RBAC-gated (lock icon if no permission)
 * - framer-motion entrance + hover animations
 */
import { motion } from "framer-motion";
import {
  Lock,
  TrendingUp,
  Shield,
  Award,
  Sparkles,
  Eye,
  Users,
  Target,
  Lightbulb,
  Factory,
  ShieldCheck,
  Headphones,
  BarChart3,
  CheckCircle,
  Crosshair,
  AlertTriangle,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

// ─── Sci-fi palette ─────────────────────────────────────────────────
const COLORS = {
  deepSpace: "#0a0e1a",
  laserBlue: "#00d4ff",
  metallicSilver: "#c0c8d8",
  accentCyan: "#06f5d6",
  accentPurple: "#a855f7",
  warningAmber: "#fbbf24",
  cardBg: "rgba(15,23,42,0.7)",
  cardBorder: "rgba(0,212,255,0.15)",
};

// ─── Types ──────────────────────────────────────────────────────────

export interface DepartmentKpi {
  label: string;
  value?: string | number;
  target?: string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  status?: "good" | "warning" | "critical";
}

export interface DepartmentData {
  id: string;
  name: string;
  nameEn: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  position: string;
  coreCompetency: string;
  behaviorStandard: string;
  redLines: string[];
  kpis: DepartmentKpi[];
  teamSize?: number;
  gradient: string;
  glowColor: string;
}

// ─── Static department data (CEO manifesto verbatim) ────────────────

export const DEPARTMENTS: DepartmentData[] = [
  {
    id: "sales",
    name: "全球销售与项目拓展部",
    nameEn: "Global Sales & Business Dev",
    icon: Target,
    position: "攻城略地的先锋，降维打击的引导者",
    coreCompetency: `顾问式技术营销——不是卖铁皮，而是卖"基于客户工艺痛点的整体解决方案"。`,
    behaviorStandard: `绝不给后方传导"脏数据"。M0 阶段的客情、竞争对手分析必须 100% 录入系统；对客户的承诺必须基于系统 AI 给出的能力边界，严禁"乱拍胸脯"导致的过度承诺。`,
    redLines: [
      "M0 客情录入率 100%",
      "商机转化率 ≥ 35%",
      "报价响应 ≤ 48h",
      "严禁过度承诺",
    ],
    kpis: [
      { label: "商机转化率", target: "≥35%", unit: "%", status: "good" },
      { label: "报价响应时间", target: "≤48h", unit: "h", status: "good" },
      { label: "客户满意度", target: "≥4.5/5", unit: "", status: "good" },
      { label: "CRM数据完整率", target: "≥95%", unit: "%", status: "warning" },
    ],
    teamSize: 42,
    gradient: "from-cyan-500/30 via-blue-600/15 to-transparent",
    glowColor: COLORS.laserBlue,
  },
  {
    id: "rnd",
    name: "研发与工程中心",
    nameEn: "R&D and Engineering Center",
    icon: Lightbulb,
    position: "GRT 的最强大脑，非标设备标准化的炼金术士",
    coreCompetency: "顶级的工业设计审美与模块化复用能力。",
    behaviorStandard: `图纸就是法律。所有 3D 模型与 P&ID 必须严格遵守 GRT 设定的规范体系上传系统。对标博世研发，做到"一次设计对"（First Time Right），利用数字孪生在 M3 阶段彻底消灭干涉和逻辑错误。`,
    redLines: [
      "First Time Right ≥ 85%",
      "标准化复用率 ≥ 60%",
      "DFMEA 覆盖率 100%",
      "图纸即法律",
    ],
    kpis: [
      { label: "设计一次通过率", target: "≥85%", unit: "%", status: "good" },
      { label: "交付准时率", target: "≥90%", unit: "%", status: "warning" },
      { label: "标准化复用", target: "≥60%", unit: "%", status: "good" },
      { label: "专利产出", target: "≥8/年", unit: "件", status: "good" },
    ],
    teamSize: 68,
    gradient: "from-purple-500/30 via-violet-600/15 to-transparent",
    glowColor: COLORS.accentPurple,
  },
  {
    id: "production",
    name: "生产制造与供应链部",
    nameEn: "Production & Supply Chain",
    icon: Factory,
    position: "铁军与交付心脏",
    coreCompetency: "极致的精益制造（Lean Manufacturing）与准时制交期控制。",
    behaviorStandard: `车间现场绝不允许出现"随心所欲的装配"。严格依照系统下发的 3D SOP 施工，扭矩打多少、线缆怎么走，必须符合系统红线。物料齐套率与装配防错率是唯一的考核尊严。`,
    redLines: [
      "3D SOP 执行率 100%",
      "OEE ≥ 75%",
      "一次合格率 ≥ 95%",
      "安全零事故",
    ],
    kpis: [
      { label: "OEE", target: "≥75%", unit: "%", status: "good" },
      { label: "一次合格率", target: "≥95%", unit: "%", status: "good" },
      { label: "交付准时率", target: "≥92%", unit: "%", status: "warning" },
      { label: "物料齐套率", target: "≥98%", unit: "%", status: "good" },
    ],
    teamSize: 156,
    gradient: "from-emerald-500/30 via-green-600/15 to-transparent",
    glowColor: COLORS.accentCyan,
  },
  {
    id: "quality",
    name: "质量管控部",
    nameEn: "Quality Assurance",
    icon: ShieldCheck,
    position: "死守出厂最后一道红线的执剑人",
    coreCompetency: "拥有一票否决权——对任何不符合 VDA19 清洁度标准的设备敢于亮红牌停线。",
    behaviorStandard: "QA 拥有一票否决权。FAT 流程零妥协，不合格品绝不放行。所有清洁度检测必须完整录入系统，任何偏差立即触发自动上报链。",
    redLines: [
      "FAT 一次通过率 ≥ 98%",
      "VDA19 合规率 100%",
      "不合格品放行率 0%",
      "一票否决权不可妥协",
    ],
    kpis: [
      { label: "FAT通过率", target: "≥98%", unit: "%", status: "good" },
      { label: "VDA19合规", target: "100%", unit: "%", status: "good" },
      { label: "客诉率", target: "≤0.5%", unit: "%", status: "warning" },
      { label: "过程审核", target: "≥90", unit: "分", status: "good" },
    ],
    teamSize: 28,
    gradient: "from-red-500/30 via-rose-600/15 to-transparent",
    glowColor: "#f43f5e",
  },
  {
    id: "service",
    name: "全球客户服务部",
    nameEn: "Global Customer Service",
    icon: Headphones,
    position: "GRT 品牌在海外的特种部队",
    coreCompetency: `跨越时区的极速响应与"神兵天降"般的解决能力。`,
    behaviorStandard: `在底特律或梅明根的现场，你代表的就是中国高端制造的脸面。必须 100% 遵守北美 OSHA 或欧洲安全规范。现场日志每日必传，遇到技术死角立刻连线"数字云厅"，绝不留隐患给客户。`,
    redLines: [
      "首次响应 ≤ 4h",
      "OSHA/CE 合规 100%",
      "现场日志日传率 100%",
      "绝不留隐患给客户",
    ],
    kpis: [
      { label: "首次响应", target: "≤4h", unit: "h", status: "good" },
      { label: "备件交付", target: "≤72h", unit: "h", status: "critical" },
      { label: "客户续约率", target: "≥80%", unit: "%", status: "good" },
      { label: "MTTR", target: "≤24h", unit: "h", status: "warning" },
    ],
    teamSize: 35,
    gradient: "from-amber-500/30 via-orange-600/15 to-transparent",
    glowColor: COLORS.warningAmber,
  },
  {
    id: "strategy",
    name: "战略支持中枢",
    nameEn: "HR · Finance · QA Hub",
    icon: BarChart3,
    position: "赋能者与执剑人",
    coreCompetency: "财务死守项目预算（M4）红线；HR 驱动员工能力矩阵的不断跃迁；跨部门协同驱动战略落地。",
    behaviorStandard: "财务死守项目预算（M4）红线，任何超支必须经过系统审批链。HR 驱动员工能力矩阵的不断跃迁，确保每个岗位都有 A/B 角。战略项目按 OKR 节奏回顾，偏差 > 10% 即触发复盘。",
    redLines: [
      "项目预算偏差 ≤ 5%",
      "OKR 对齐率 ≥ 90%",
      "关键岗位 A/B 角覆盖",
      "战略项目按期率 ≥ 85%",
    ],
    kpis: [
      { label: "OKR对齐率", target: "≥90%", unit: "%", status: "good" },
      { label: "预算偏差", target: "≤5%", unit: "%", status: "good" },
      { label: "战略项目按期", target: "≥85%", unit: "%", status: "warning" },
      { label: "人才覆盖率", target: "≥95%", unit: "%", status: "good" },
    ],
    teamSize: 24,
    gradient: "from-indigo-500/30 via-blue-600/15 to-transparent",
    glowColor: "#818cf8",
  },
];

// ─── Animation variants ─────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.1, type: "spring" as const, stiffness: 100, damping: 14 },
  }),
};

const statusColors: Record<string, string> = {
  good: "#22c55e",
  warning: "#fbbf24",
  critical: "#ef4444",
};

// ─── Card Component ─────────────────────────────────────────────────

interface DepartmentExcellenceCardProps {
  department: DepartmentData;
  index?: number;
  hasPermission?: boolean;
  onViewDetail?: (deptId: string) => void;
}

export function DepartmentExcellenceCard({
  department,
  index = 0,
  hasPermission = true,
  onViewDetail,
}: DepartmentExcellenceCardProps) {
  const Icon = department.icon;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative rounded-xl overflow-hidden border backdrop-blur-xl"
      style={{
        background: COLORS.cardBg,
        borderColor: COLORS.cardBorder,
      }}
    >
      {/* Header gradient */}
      <div className={`relative h-28 bg-gradient-to-br ${department.gradient} overflow-hidden`}>
        {/* Animated grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(${department.glowColor}20 1px, transparent 1px), linear-gradient(90deg, ${department.glowColor}20 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Floating particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ background: department.glowColor, left: `${15 + i * 22}%`, top: `${20 + i * 15}%` }}
            animate={{
              y: [-5, 5, -5],
              opacity: [0.2, 0.7, 0.2],
            }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.4, delay: i * 0.2 }}
          />
        ))}

        {/* Icon + name */}
        <div className="absolute bottom-3 left-4 flex items-end gap-3">
          <motion.div
            className="p-2.5 rounded-lg border backdrop-blur-md"
            style={{
              background: `${department.glowColor}15`,
              borderColor: `${department.glowColor}30`,
            }}
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Icon className="w-6 h-6" style={{ color: department.glowColor }} />
          </motion.div>
          <div>
            <h3 className="text-base font-bold tracking-wide" style={{ color: COLORS.metallicSilver }}>
              {department.name}
            </h3>
            <span className="text-[9px] font-mono tracking-[0.15em]" style={{ color: `${department.glowColor}90` }}>
              {department.nameEn.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Team size badge */}
        {department.teamSize && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border backdrop-blur-sm"
            style={{
              background: "rgba(0,0,0,0.3)",
              borderColor: `${department.glowColor}30`,
              color: COLORS.metallicSilver,
            }}
          >
            <Users className="w-2.5 h-2.5" />
            {department.teamSize}
          </div>
        )}

        {/* Bottom glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${department.glowColor}, transparent)` }}
        />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Position quotation */}
        <div className="flex items-start gap-1.5">
          <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: department.glowColor }} />
          <span className="text-[11px] italic leading-tight" style={{ color: `${COLORS.metallicSilver}90` }}>
            "{department.position}"
          </span>
        </div>

        {/* Core Competency */}
        <div className="p-2.5 rounded-lg border"
          style={{ background: `${department.glowColor}05`, borderColor: `${department.glowColor}12` }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Crosshair className="w-3 h-3" style={{ color: department.glowColor }} />
            <span className="text-[9px] font-mono tracking-[0.12em]" style={{ color: department.glowColor }}>
              CORE COMPETENCY
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: `${COLORS.metallicSilver}cc` }}>
            {department.coreCompetency}
          </p>
        </div>

        {/* Behavioral Standard */}
        <div className="p-2.5 rounded-lg border"
          style={{ background: `${department.glowColor}03`, borderColor: `${department.glowColor}10` }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Award className="w-3 h-3" style={{ color: department.glowColor }} />
            <span className="text-[9px] font-mono tracking-[0.12em]" style={{ color: department.glowColor }}>
              西门子级行为标准
            </span>
          </div>
          <p className="text-[10.5px] leading-relaxed" style={{ color: `${COLORS.metallicSilver}99` }}>
            {department.behaviorStandard}
          </p>
        </div>

        {/* Red lines */}
        <div className="p-2.5 rounded-lg border" style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.12)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[9px] font-mono tracking-[0.12em] text-red-400">RED LINES</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {department.redLines.map(rl => (
              <span key={rl} className="text-[10px] font-mono text-red-300/70 flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5 text-red-400/50 flex-shrink-0" />
                {rl}
              </span>
            ))}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" style={{ color: COLORS.laserBlue }} />
            <span className="text-[9px] font-mono tracking-[0.12em]" style={{ color: COLORS.laserBlue }}>
              KEY METRICS
            </span>
            {!hasPermission && (
              <Lock className="w-3 h-3 ml-auto text-amber-400/60" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {department.kpis.map(kpi => (
              <div
                key={kpi.label}
                className="relative p-2 rounded-lg border overflow-hidden"
                style={{
                  background: hasPermission ? `${COLORS.cardBg}` : "rgba(15,23,42,0.4)",
                  borderColor: hasPermission ? `${statusColors[kpi.status ?? "good"]}20` : "rgba(100,100,100,0.1)",
                }}
              >
                {hasPermission ? (
                  <>
                    <div className="text-[10px] mb-0.5" style={{ color: `${COLORS.metallicSilver}60` }}>
                      {kpi.label}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold font-mono" style={{ color: statusColors[kpi.status ?? "good"] }}>
                        {kpi.value ?? kpi.target ?? "—"}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: `${statusColors[kpi.status ?? "good"]}40` }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-8 gap-1.5">
                    <Lock className="w-3 h-3 text-neutral-500" />
                    <span className="text-[10px] text-neutral-500 font-mono">LOCKED</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* View detail CTA */}
        {onViewDetail && (
          <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onViewDetail(department.id)}
            className="flex items-center gap-1.5 text-[11px] font-medium pt-1"
            style={{ color: department.glowColor }}
          >
            <Eye className="w-3 h-3" />
            查看详情
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Grid Layout Helper ─────────────────────────────────────────────

interface DepartmentGridProps {
  hasPermission?: boolean;
  onViewDetail?: (deptId: string) => void;
}

export default function DepartmentExcellenceGrid({ hasPermission = true, onViewDetail }: DepartmentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {DEPARTMENTS.map((dept, i) => (
        <DepartmentExcellenceCard
          key={dept.id}
          department={dept}
          index={i}
          hasPermission={hasPermission}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  );
}
