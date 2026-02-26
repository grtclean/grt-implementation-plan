import { motion } from "framer-motion";
import {
  Box,
  Microscope,
  Gauge,
  Bot,
  ShieldCheck,
  Waves,
  Cpu,
  BarChart3,
} from "lucide-react";

const CORE_SPECS = [
  {
    icon: <Microscope className="w-7 h-7" />,
    title: "Millipore Cleanliness Test Validation",
    titleCn: "清洁度测试达标保障",
    description:
      "End-to-end gravimetric and particle count validation per ISO 16232 / VDA 19. Every batch is tested and traceable.",
    highlight: true,
  },
  {
    icon: <Bot className="w-7 h-7" />,
    title: "Intelligent Automation Rate",
    titleCn: "智能自动化率",
    description:
      "95%+ automation across loading, cleaning, drying, and inspection. PLC/SCADA integration with real-time MES feedback.",
    highlight: true,
  },
  {
    icon: <Waves className="w-7 h-7" />,
    title: "Multi-Stage Ultrasonic Cleaning",
    titleCn: "多级超声清洗",
    description:
      "Cascading ultrasonic frequencies (25kHz–120kHz) paired with high-pressure spray for complex geometries and blind holes.",
    highlight: false,
  },
  {
    icon: <ShieldCheck className="w-7 h-7" />,
    title: "Vacuum Drying & Corrosion Protection",
    titleCn: "真空干燥与防腐保护",
    description:
      "Integrated vacuum drying chambers and optional rust-inhibitor application ensure part integrity post-clean.",
    highlight: false,
  },
  {
    icon: <Gauge className="w-7 h-7" />,
    title: "Real-Time Process Monitoring",
    titleCn: "实时过程监控",
    description:
      "IoT sensors track temperature, pressure, concentration, and conductivity. AI-driven anomaly detection triggers alerts.",
    highlight: false,
  },
  {
    icon: <Cpu className="w-7 h-7" />,
    title: "Digital Twin Integration",
    titleCn: "数字孪生集成",
    description:
      "Full digital replica of the cleaning line for simulation, predictive maintenance, and virtual commissioning.",
    highlight: false,
  },
];

export default function TechCapabilities({ industry }: { industry: string }) {
  return (
    <section className="py-24 px-6 lg:px-8 relative">
      {/* Section background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-4 block">
            Technical Prowess / 技术实力
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Core Technology Specifications
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Engineered for the world's most demanding cleanliness standards
          </p>
        </motion.div>

        {/* 3D Equipment Viewer placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-20"
        >
          <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-neutral-900/80 via-neutral-900/60 to-neutral-800/40 backdrop-blur-xl overflow-hidden">
            {/* WebGL header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Box className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-white/80">
                  Interactive 3D CAD Model Viewer
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  WebGL
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-neutral-500">Rotate</span>
                <span className="text-xs text-neutral-500">|</span>
                <span className="text-xs text-neutral-500">Zoom</span>
                <span className="text-xs text-neutral-500">|</span>
                <span className="text-xs text-neutral-500">Pan</span>
              </div>
            </div>

            {/* 3D viewport placeholder */}
            <div className="aspect-[16/7] flex items-center justify-center relative">
              {/* Grid floor */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  transform: "perspective(500px) rotateX(60deg)",
                  transformOrigin: "bottom center",
                }}
              />

              {/* Mock 3D object wireframe */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-80 h-48 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/[0.01]">
                    {/* Wireframe cube hint */}
                    <svg
                      viewBox="0 0 200 140"
                      className="w-56 h-36 text-emerald-500/40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    >
                      {/* Front face */}
                      <rect x="40" y="40" width="80" height="60" rx="2" />
                      {/* Back face */}
                      <rect x="60" y="20" width="80" height="60" rx="2" />
                      {/* Connecting lines */}
                      <line x1="40" y1="40" x2="60" y2="20" />
                      <line x1="120" y1="40" x2="140" y2="20" />
                      <line x1="40" y1="100" x2="60" y2="80" />
                      <line x1="120" y1="100" x2="140" y2="80" />
                      {/* Label arrow */}
                      <line x1="150" y1="50" x2="180" y2="35" strokeDasharray="4,4" />
                      <circle cx="180" cy="35" r="3" fill="currentColor" />
                    </svg>
                  </div>
                  {/* Rotating indicator */}
                  <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-white/60 font-medium">
                    Interactive 3D CAD Model (WebGL)
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    GRT Multi-Stage Automated Cleaning Line — {industry === "new-energy" ? "Battery Housing" : industry === "fuel-injection" ? "Injector Nozzle" : industry === "ice" ? "Engine Block" : "Die Cast"} Configuration
                  </p>
                </div>
              </div>

              {/* Floating annotations */}
              <div className="absolute top-6 left-8 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400">
                <BarChart3 className="w-3 h-3 inline mr-1.5 text-emerald-400" />
                Station 1: Pre-wash
              </div>
              <div className="absolute top-6 right-8 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400">
                <Waves className="w-3 h-3 inline mr-1.5 text-blue-400" />
                Station 3: Ultrasonic
              </div>
              <div className="absolute bottom-6 left-8 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400">
                <Gauge className="w-3 h-3 inline mr-1.5 text-orange-400" />
                Station 5: Vacuum Dry
              </div>
              <div className="absolute bottom-6 right-8 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-400">
                <Microscope className="w-3 h-3 inline mr-1.5 text-violet-400" />
                Station 7: Millipore Test
              </div>
            </div>
          </div>
        </motion.div>

        {/* Core Technology Specs grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CORE_SPECS.map((spec, i) => (
            <motion.div
              key={spec.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`group relative rounded-2xl border p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.03] ${
                spec.highlight
                  ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-white/[0.06] bg-white/[0.01]"
              }`}
            >
              {spec.highlight && (
                <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
              )}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  spec.highlight
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-white/[0.04] text-neutral-400 group-hover:text-white/80"
                }`}
              >
                {spec.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                {spec.title}
              </h3>
              <p className="text-xs text-emerald-400/80 mb-3 font-medium">
                {spec.titleCn}
              </p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {spec.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
