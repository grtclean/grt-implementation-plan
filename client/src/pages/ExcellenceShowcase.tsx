/**
 * ExcellenceShowcase — 全域组织赋能中枢 (Organization Excellence Hub)
 *
 * Immersive full-screen standalone page at /excellence-showcase.
 * No sidebar, dark-space sci-fi aesthetic, combining:
 * - Hero with animated particles + GRT manifesto
 * - ValueChainVisualizer (horizontal flow)
 * - DepartmentExcellenceCards (grid)
 * - Organizational culture pillars
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Zap,
  Globe,
  Shield,
  Award,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Heart,
  Users,
  Target,
  ChevronDown,
} from "lucide-react";
import ValueChainVisualizer from "@/components/ValueChainVisualizer";
import DepartmentExcellenceGrid from "@/components/DepartmentExcellenceCard";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Palette ────────────────────────────────────────────────────────
const C = {
  bg: "#060a14",
  surface: "rgba(15,23,42,0.6)",
  border: "rgba(0,212,255,0.12)",
  cyan: "#00d4ff",
  cyanGlow: "rgba(0,212,255,0.15)",
  silver: "#c0c8d8",
  purple: "#a855f7",
  amber: "#fbbf24",
};

// ─── Animation helpers ──────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

function AnimatedSection({ children, className, id, style }: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
      id={id}
      style={style}
    >
      {children}
    </motion.section>
  );
}

// ─── Particle field (background) ────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: C.cyan,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [-10, 10, -10],
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: `radial-gradient(circle, ${C.cyan}, transparent 70%)` }}
      />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
        style={{ background: `radial-gradient(circle, ${C.purple}, transparent 70%)` }}
      />
    </div>
  );
}

// ─── Culture Pillar ─────────────────────────────────────────────────
interface PillarData {
  icon: typeof Zap;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
}

const PILLARS: PillarData[] = [
  {
    icon: Shield,
    title: "零缺陷文化",
    subtitle: "ZERO DEFECT",
    desc: "质量是不可妥协的底线。从设计源头到售后闭环，每一环节都以零缺陷为目标。",
    color: C.cyan,
  },
  {
    icon: TrendingUp,
    title: "持续改善",
    subtitle: "KAIZEN",
    desc: "每一天都比昨天更好。通过PDCA循环和A3思维，将改善嵌入组织DNA。",
    color: C.purple,
  },
  {
    icon: Users,
    title: "跨部门协同",
    subtitle: "COLLABORATION",
    desc: "打破部门墙，以价值流为主线实现端到端协同，让信息流动创造价值。",
    color: C.amber,
  },
  {
    icon: Heart,
    title: "客户成功",
    subtitle: "CUSTOMER SUCCESS",
    desc: "客户的成功就是我们的成功。从理解需求到超越期望，全链路以客户价值为导向。",
    color: "#f472b6",
  },
];

function CulturePillar({ pillar, index }: { pillar: PillarData; index: number }) {
  const Icon = pillar.icon;
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative p-5 rounded-xl border backdrop-blur-xl overflow-hidden group"
      style={{ background: C.surface, borderColor: C.border }}
    >
      {/* Gradient corner */}
      <div
        className="absolute top-0 right-0 w-24 h-24 opacity-20 rounded-bl-full"
        style={{ background: `radial-gradient(circle at top right, ${pillar.color}, transparent 70%)` }}
      />

      <motion.div
        className="inline-flex p-2.5 rounded-lg border mb-3"
        style={{ background: `${pillar.color}10`, borderColor: `${pillar.color}25` }}
        whileHover={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-5 h-5" style={{ color: pillar.color }} />
      </motion.div>

      <h4 className="text-sm font-bold tracking-wide mb-0.5" style={{ color: C.silver }}>
        {pillar.title}
      </h4>
      <span className="text-[9px] font-mono tracking-[0.2em] block mb-2" style={{ color: `${pillar.color}90` }}>
        {pillar.subtitle}
      </span>
      <p className="text-xs leading-relaxed" style={{ color: `${C.silver}70` }}>
        {pillar.desc}
      </p>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${pillar.color}60, transparent)` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: index * 0.1 }}
      />
    </motion.div>
  );
}

// ─── Stat Counter ───────────────────────────────────────────────────
function StatCounter({ value, label, suffix }: { value: string; label: string; suffix?: string }) {
  return (
    <motion.div variants={fadeUp} className="text-center">
      <div className="text-3xl md:text-4xl font-bold font-mono tracking-tight" style={{ color: C.cyan }}>
        {value}
        {suffix && <span className="text-lg ml-0.5" style={{ color: `${C.cyan}80` }}>{suffix}</span>}
      </div>
      <div className="text-[11px] mt-1 tracking-wide" style={{ color: `${C.silver}60` }}>{label}</div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════
export default function ExcellenceShowcase() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen relative" style={{ background: C.bg, color: C.silver }}>
      <ParticleField />

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(${C.cyan}40 1px, transparent 1px), linear-gradient(90deg, ${C.cyan}40 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: `radial-gradient(circle, ${C.cyanGlow}, transparent 70%)` }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative text-center max-w-4xl z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 backdrop-blur-sm"
            style={{ borderColor: C.border, background: `${C.cyan}08` }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: C.cyan }} />
            </motion.div>
            <span className="text-[11px] font-mono tracking-[0.2em]" style={{ color: C.cyan }}>
              GRT ORGANIZATION EXCELLENCE HUB
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="block" style={{ color: C.silver }}>全域组织赋能中枢</span>
            <span
              className="block mt-2 bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${C.cyan}, ${C.purple}, ${C.amber})`,
              }}
            >
              卓越力 · 价值链 · 文化引擎
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: `${C.silver}70` }}>
            从营销触点到售后闭环，以价值链为主线构建组织卓越力体系。
            每个部门都是价值创造的关键节点，每条红线都是不可妥协的质量底线。
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4">
            <motion.a
              href="#value-chain"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm tracking-wide border"
              style={{
                background: `linear-gradient(135deg, ${C.cyan}20, ${C.purple}15)`,
                borderColor: `${C.cyan}40`,
                color: C.cyan,
              }}
            >
              <Globe className="w-4 h-4" />
              探索价值链
              <ArrowRight className="w-4 h-4" />
            </motion.a>
            <motion.a
              href="#departments"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm tracking-wide border"
              style={{ borderColor: C.border, color: C.silver, background: C.surface }}
            >
              <Award className="w-4 h-4" />
              部门卓越力
            </motion.a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown className="w-5 h-5" style={{ color: `${C.cyan}50` }} />
        </motion.div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────── */}
      <AnimatedSection className="relative z-10 py-12 border-y" style={{ borderColor: C.border } as any}>
        <div className="max-w-5xl mx-auto px-4">
          <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter value="313" label="全球员工" suffix="+" />
            <StatCounter value="5" label="核心价值链节点" />
            <StatCounter value="6" label="部门卓越力画像" />
            <StatCounter value="20" label="红线质量指标" suffix="+" />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── Value Chain Section ──────────────────────────────────── */}
      <AnimatedSection className="relative z-10 py-16 px-4" id="value-chain">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <span className="text-[10px] font-mono tracking-[0.3em] block mb-2" style={{ color: C.cyan }}>
              VALUE CHAIN PANORAMA
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.silver }}>
              端到端价值流全景
            </h2>
            <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: `${C.silver}60` }}>
              从市场洞察到客户成功，五大核心部门串联起完整的价值创造闭环——一场完美的接力赛
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ValueChainVisualizer />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── Department Cards ─────────────────────────────────────── */}
      <AnimatedSection className="relative z-10 py-16 px-4" id="departments">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <span className="text-[10px] font-mono tracking-[0.3em] block mb-2" style={{ color: C.purple }}>
              DEPARTMENT EXCELLENCE
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.silver }}>
              部门卓越力画像
            </h2>
            <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: `${C.silver}60` }}>
              六大部门的组织定位、核心竞争力、西门子级行为标准与不可妥协的红线
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <DepartmentExcellenceGrid hasPermission />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── Culture Pillars ──────────────────────────────────────── */}
      <AnimatedSection className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <span className="text-[10px] font-mono tracking-[0.3em] block mb-2" style={{ color: C.amber }}>
              CULTURE PILLARS
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.silver }}>
              组织文化四大支柱
            </h2>
            <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: `${C.silver}60` }}>
              文化是战略的基石——从零缺陷到客户成功，四大支柱支撑卓越组织力
            </p>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PILLARS.map((pillar, i) => (
              <CulturePillar key={pillar.subtitle} pillar={pillar} index={i} />
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ─── Manifesto Footer ─────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="w-12 h-[1px] mx-auto mb-8"
              style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)` }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
            />

            <blockquote className="text-lg md:text-xl font-medium italic leading-relaxed mb-6"
              style={{ color: `${C.silver}90` }}
            >
              "我们不只是制造清洗设备的工厂，<br />
              我们是帮助客户实现清洁工艺卓越的伙伴。<br />
              从每一滴清洗液到每一个数据点，<br />
              都承载着GRT对品质的承诺。"
            </blockquote>

            <p className="text-xs font-mono tracking-widest" style={{ color: `${C.cyan}60` }}>
              — GRT ADVANCED CLEANING TECHNOLOGY
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── Fixed bottom bar ─────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 h-10 flex items-center justify-between px-6 border-t backdrop-blur-xl"
        style={{
          background: "rgba(6,10,20,0.85)",
          borderColor: C.border,
        }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" style={{ color: C.cyan }} />
          <span className="text-[10px] font-mono tracking-[0.15em]" style={{ color: `${C.silver}60` }}>
            GRT EXCELLENCE HUB v1.0
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono" style={{ color: `${C.silver}40` }}>
            © 2026 GRT Advanced Cleaning Technology
          </span>
        </div>
      </div>

      {/* Bottom padding for fixed bar */}
      <div className="h-10" />
    </div>
  );
}
