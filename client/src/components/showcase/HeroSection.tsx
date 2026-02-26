import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Target, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IndustryConfig {
  slug: string;
  label: string;
  labelCn: string;
  headline: string;
  headlineCn: string;
  subheadline: string;
  accent: string;
  accentGlow: string;
  icon: React.ReactNode;
  stats: { value: string; label: string }[];
}

export const INDUSTRIES: Record<string, IndustryConfig> = {
  "die-casting": {
    slug: "die-casting",
    label: "Die Casting",
    labelCn: "压力铸造",
    headline: "Precision Cleaning for High-Pressure Die Cast Components",
    headlineCn: "高压压铸零部件精密清洗解决方案",
    subheadline:
      "Eliminate porosity contamination and achieve VDA 19 / ISO 16232 compliance with our automated ultrasonic and high-pressure spray cleaning systems.",
    accent: "from-orange-500 to-red-600",
    accentGlow: "shadow-orange-500/20",
    icon: <Target className="w-6 h-6" />,
    stats: [
      { value: "99.7%", label: "Particle Removal Rate" },
      { value: "<50μm", label: "Residual Particle Size" },
      { value: "45s", label: "Cycle Time" },
      { value: "24/7", label: "Automated Operation" },
    ],
  },
  "ice": {
    slug: "ice",
    label: "Internal Combustion Engine",
    labelCn: "内燃机",
    headline: "Engine Block & Cylinder Head Cleaning Excellence",
    headlineCn: "发动机缸体/缸盖清洗卓越方案",
    subheadline:
      "Purpose-built cleaning lines for IC engine components — removing machining chips, oil residues, and burrs to meet OEM cleanliness specifications.",
    accent: "from-blue-500 to-cyan-600",
    accentGlow: "shadow-blue-500/20",
    icon: <Zap className="w-6 h-6" />,
    stats: [
      { value: "1.2M+", label: "Parts Cleaned Annually" },
      { value: "VDA 19", label: "Certified Compliance" },
      { value: "6σ", label: "Process Capability" },
      { value: "18+", label: "OEM Partners" },
    ],
  },
  "new-energy": {
    slug: "new-energy",
    label: "New Energy",
    labelCn: "新能源",
    headline: "Battery Housing Cleanliness & Insulation Security",
    headlineCn: "电池壳体清洁度与绝缘安全保障",
    subheadline:
      "Critical cleaning solutions for EV battery housings, motor components, and power electronics — ensuring zero-particle contamination for insulation integrity and thermal safety.",
    accent: "from-emerald-400 to-teal-600",
    accentGlow: "shadow-emerald-500/20",
    icon: <Shield className="w-6 h-6" />,
    stats: [
      { value: "0", label: "Metallic Particle Tolerance" },
      { value: "500V+", label: "Insulation Withstand" },
      { value: "ISO 16232", label: "Full Compliance" },
      { value: "3min", label: "Full Cycle Time" },
    ],
  },
  "fuel-injection": {
    slug: "fuel-injection",
    label: "Fuel Injection",
    labelCn: "燃油喷射",
    headline: "Micron-level Deburring & Supreme Millipore Standards",
    headlineCn: "微米级去毛刺与极致清洁度标准",
    subheadline:
      "Ultra-precision cleaning for fuel injector nozzles, rails, and pump bodies — achieving sub-micron particle control and meeting the world's most stringent Millipore cleanliness criteria.",
    accent: "from-violet-500 to-purple-700",
    accentGlow: "shadow-violet-500/20",
    icon: <Droplets className="w-6 h-6" />,
    stats: [
      { value: "<5μm", label: "Particle Control" },
      { value: "Class A", label: "Millipore Rating" },
      { value: "0.1mg", label: "Gravimetric Limit" },
      { value: "100%", label: "Inline Inspection" },
    ],
  },
};

export default function HeroSection({
  industry,
  onScrollToForm,
}: {
  industry: string;
  onScrollToForm: () => void;
}) {
  const config = INDUSTRIES[industry] || INDUSTRIES["new-energy"];

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br ${config.accent} opacity-[0.07] blur-[120px]`}
      />

      {/* Video/image placeholder */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
          <div className="text-center space-y-2 opacity-30">
            <div className="w-24 h-24 mx-auto rounded-xl border border-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/40" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-xs text-white/30 tracking-widest uppercase">
              Automated Cleaning Line — Background Video
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-4xl">
          {/* Industry badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${config.accent} bg-opacity-10 border border-white/10 text-sm font-medium tracking-wide`}
            >
              {config.icon}
              <span className="text-white/90">
                {config.label} · {config.labelCn}
              </span>
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-4"
          >
            <span className="text-white">{config.headline}</span>
          </motion.h1>

          {/* Chinese headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`text-xl sm:text-2xl font-semibold bg-gradient-to-r ${config.accent} bg-clip-text text-transparent mb-6`}
          >
            {config.headlineCn}
          </motion.p>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-neutral-400 max-w-2xl leading-relaxed mb-10"
          >
            {config.subheadline}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-4"
          >
            <Button
              size="lg"
              onClick={onScrollToForm}
              className={`bg-gradient-to-r ${config.accent} text-white border-0 hover:opacity-90 text-base px-8 py-6 rounded-xl ${config.accentGlow} shadow-2xl`}
            >
              Request Custom Engineering Proposal
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 text-base px-8 py-6 rounded-xl"
            >
              Watch Factory Tour
            </Button>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {config.stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 text-center"
            >
              <div
                className={`text-3xl lg:text-4xl font-bold bg-gradient-to-r ${config.accent} bg-clip-text text-transparent`}
              >
                {stat.value}
              </div>
              <div className="text-sm text-neutral-500 mt-1 tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
