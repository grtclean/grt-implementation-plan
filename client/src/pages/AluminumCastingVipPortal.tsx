/**
 * 铝压铸行业 VIP 客户门户 — 统一版
 *
 * 支持：美利信 / 旭升 / 爱柯迪 等新能源压铸客户专属通道
 * Route: /client-portal/:clientSlug (STANDALONE)
 *
 * 4大板块：
 *   1. 客户专属看板（项目追踪 + 质量透明 + 全球服务）
 *   2. GRT铝压铸核心竞争力介绍
 *   3. 标准产品性能及定价
 *   4. 战略合作伙伴123计划
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import {
  Shield, CheckCircle2, Activity, Globe, Zap, TrendingUp, Clock,
  Award, Lock, Microscope, Cpu, Wifi, ArrowRight, Mail, Phone,
  MapPin, Factory, Star, Crown, FileText, Target, BarChart3,
  Layers, Wrench, BookOpen, Sparkles, Users, DollarSign,
} from "lucide-react";

// ── Client configurations ──
interface ClientConfig {
  slug: string;
  name: string;
  nameEn: string;
  chairman: string;
  industry: string;
  color: string;          // primary accent hex
  colorClass: string;     // tailwind color prefix
  projects: Array<{
    name: string; nameEn: string; code: string;
    progress: number; stage: string; delivery: string;
  }>;
  qualityAvg: number;
  partnerYears: number;
  onTimeRate: number;
}

const CLIENTS: Record<string, ClientConfig> = {
  "meilixin-vip": {
    slug: "meilixin-vip", name: "美利信集团", nameEn: "Meilixin Group",
    chairman: "余亚军", industry: "新能源铝压铸",
    color: "#F59E0B", colorClass: "amber",
    projects: [
      { name: "压铸件高洁净度清洗线", nameEn: "Die Casting Washer Line", code: "GRT-2026-MLX-001", progress: 92, stage: "M5 机械装配", delivery: "2026-08" },
      { name: "一体化车身清洗系统", nameEn: "Mega Casting Wash System", code: "GRT-2026-MLX-002", progress: 45, stage: "M3 采购", delivery: "2026-12" },
    ],
    qualityAvg: 0.015, partnerYears: 15, onTimeRate: 99.2,
  },
  "xusheng-vip": {
    slug: "xusheng-vip", name: "旭升集团", nameEn: "Xusheng Group",
    chairman: "徐旭东", industry: "新能源铝压铸·Tesla Tier 1",
    color: "#06B6D4", colorClass: "cyan",
    projects: [
      { name: "电驱壳体精密清洗线", nameEn: "E-Drive Housing Wash Line", code: "GRT-2026-XS-001", progress: 78, stage: "M5 装配", delivery: "2026-07" },
      { name: "电池包托盘清洗系统", nameEn: "Battery Tray Wash System", code: "GRT-2026-XS-002", progress: 30, stage: "M2 设计", delivery: "2027-01" },
    ],
    qualityAvg: 0.012, partnerYears: 8, onTimeRate: 99.5,
  },
  "ikd-vip": {
    slug: "ikd-vip", name: "爱柯迪集团", nameEn: "IKD Group",
    chairman: "张志", industry: "新能源铝压铸·精密组件",
    color: "#8B5CF6", colorClass: "violet",
    projects: [
      { name: "转向器壳体清洗线", nameEn: "Steering Housing Wash", code: "GRT-2026-IKD-001", progress: 65, stage: "M4 制造", delivery: "2026-09" },
    ],
    qualityAvg: 0.018, partnerYears: 5, onTimeRate: 98.8,
  },
};

// ── Standard products ──
const STANDARD_PRODUCTS = [
  { model: "KLT-3600", name: "通过式连续清洗线", spec: "600×400mm工件 · 60s节拍 · 碳氢清洗", price: "¥128-168万", target: "中批量压铸件", highlight: true },
  { model: "KLT-4200", name: "双工位高洁净清洗机", spec: "ISO 16232 Class A · 颗粒≤50μm · 残油≤0.5mg", price: "¥198-258万", target: "精密压铸件", highlight: false },
  { model: "TSL-8000", name: "多槽浸没超声清洗系统", spec: "28/40/68kHz三频 · 真空干燥 · 8槽配置", price: "¥298-388万", target: "高精密组件", highlight: false },
  { model: "MCL-12000", name: "一体化压铸件清洗岛", spec: "Mega Casting适配 · 全自动上下料 · MES集成", price: "¥480-680万", target: "一体化压铸", highlight: true },
];

// ── Animated number ──
function AnimNum({ target, suffix = "", dur = 2000 }: { target: number; suffix?: string; dur?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const s = Date.now();
    const tick = () => { const p = Math.min((Date.now() - s) / dur, 1); setV(Math.round(target * (1 - Math.pow(1 - p, 3)) * 10) / 10); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [target, dur]);
  return <>{v}{suffix}</>;
}

function PulseDot({ color = "bg-emerald-400" }: { color?: string }) {
  return <span className="relative flex h-3 w-3"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} /><span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} /></span>;
}

export default function AluminumCastingVipPortal() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "meilixin-vip";
  const client = CLIENTS[slug] ?? CLIENTS["meilixin-vip"];
  const [loaded, setLoaded] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => { setLoaded(true); }, []);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const accentBg = `${client.color}15`;
  const accentBorder = `${client.color}40`;

  return (
    <div className="min-h-screen bg-[#040810] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full" style={{ background: `${client.color}08`, filter: "blur(180px)" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03]" style={{ filter: "blur(160px)" }} />
      </div>

      {/* ═══ Nav ═══ */}
      <nav className="relative z-10 border-b bg-[#040810]/80 backdrop-blur-xl" style={{ borderColor: `${client.color}15` }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/GRTlogo.gif" alt="GRT" className="h-9 w-9" />
            <div className="h-7 w-px" style={{ background: `${client.color}30` }} />
            <div>
              <div className="text-sm font-bold tracking-wide" style={{ color: client.color }}>{client.name}</div>
              <div className="text-[10px] tracking-widest" style={{ color: `${client.color}80` }}>STRATEGIC PARTNER PORTAL</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <PulseDot /><span className="text-xs text-emerald-300">Online</span>
            </div>
            <span className="text-xs text-gray-500 font-mono">{time.toLocaleTimeString("zh-CN", { hour12: false })}</span>
            <button onClick={() => window.history.back()} className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10">← 返回</button>
            <button onClick={() => { window.location.href = "/showcase-hub"; }} className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10">展示中枢</button>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className={`relative z-10 py-14 px-6 text-center transition-all duration-1000 ${loaded ? "opacity-100" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border mb-8" style={{ borderColor: accentBorder, background: accentBg }}>
            <Crown className="h-4 w-4" style={{ color: client.color }} />
            <span className="text-sm font-bold tracking-wider" style={{ color: client.color }}>V-VIP · {client.industry}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-3">
            <span className="text-white">Welcome, </span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${client.color}, ${client.color}cc, ${client.color})`, filter: `drop-shadow(0 0 30px ${client.color}40)` }}>
              {client.nameEn}
            </span>
          </h1>
          <p className="text-lg text-gray-400">{client.name} · 战略合作伙伴专属看板</p>

          <div className="flex justify-center gap-8 mt-10">
            {[
              { v: client.projects.length, s: "", l: "在执行项目", c: "text-cyan-400" },
              { v: client.partnerYears, s: "+年", l: "合作历史", c: `text-[${client.color}]` },
              { v: client.onTimeRate, s: "%", l: "准时交付率", c: "text-emerald-400" },
              { v: 100, s: "%", l: "质量合格率", c: "text-blue-400" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className={`text-3xl font-black ${s.c}`} style={s.c.includes("[") ? { color: client.color } : undefined}>
                  <AnimNum target={s.v} suffix={s.s} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Section 1: Projects ═══ */}
      <Section icon={Activity} title="项目实时追踪" titleEn="Live Project Tracking" color={client.color}>
        <div className="space-y-6">
          {client.projects.map((p, pi) => (
            <div key={pi} className="bg-[#0c1120] rounded-xl border border-gray-700/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.nameEn} · {p.code}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color: client.color }}>{p.progress}%</div>
                  <div className="text-xs text-gray-500">{p.stage}</div>
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${client.color}cc, ${client.color})`, boxShadow: `0 0 12px ${client.color}40` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>预计交付: {p.delivery}</span>
                <span>质量: A+ (IATF 16949)</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ Section 2: GRT铝压铸核心竞争力 ═══ */}
      <Section icon={Shield} title="GRT 铝压铸领域核心竞争力" titleEn="Core Competency in Aluminum Die Casting" color="#06B6D4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Factory, title: "20年专注", desc: "铝压铸清洗设备研发制造", value: "500+套交付" },
            { icon: Award, title: "行业标准理事", desc: "铝压铸行业清洗标准制定参与单位", value: "VDA 19.1 认证" },
            { icon: Globe, title: "全球服务", desc: "无锡·斯图加特·底特律三中心", value: "24h响应" },
            { icon: Cpu, title: "AI+清洗", desc: "工艺参数自适应·数字孪生驱动", value: "AI Brain" },
          ].map((c, i) => (
            <div key={i} className="bg-[#0c1120] rounded-xl border border-cyan-500/15 p-5 hover:border-cyan-500/30 transition-all">
              <c.icon className="h-6 w-6 text-cyan-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">{c.title}</h4>
              <p className="text-sm text-gray-400 mb-2">{c.desc}</p>
              <span className="text-xs font-mono text-cyan-400">{c.value}</span>
            </div>
          ))}
        </div>

        {/* Standards body badge */}
        <div className="bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 rounded-xl border border-cyan-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="h-8 w-8 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-white mb-1">
                《新能源汽车用铝压铸件 清洁度技术要求》团体标准 · 主要起草单位
              </h4>
              <p className="text-sm text-gray-400">
                GRT（无锡杰瑞德）被中国电子装备技术开发协会认定为 T/CAEE 005-2025
                《新能源汽车用铝压铸件 清洁度技术要求》团体标准的<span className="text-cyan-300 font-semibold">主要起草单位</span>，
                同时参与 VDA 19.1、ISO 16232 等国际清洁度标准的本土化实施与推广。
              </p>
            </div>
            <div className="shrink-0">
              <img
                src="/conference-assets/grt-standards-plaque.jpg"
                alt="GRT 团体标准主要起草单位证书"
                className="w-40 h-28 object-cover rounded-lg border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:scale-105 transition-transform cursor-pointer"
                onClick={() => window.open("/conference-assets/grt-standards-plaque.jpg", "_blank")}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ Section 3: 标准产品 ═══ */}
      <Section icon={Layers} title="标准产品性能及定价" titleEn="Standard Products & Pricing" color="#10B981">
        <div className="grid grid-cols-2 gap-4">
          {STANDARD_PRODUCTS.map((p, i) => (
            <div key={i} className={`bg-[#0c1120] rounded-xl border p-6 transition-all hover:scale-[1.01] ${
              p.highlight ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]" : "border-gray-700/30"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{p.model}</span>
                  {p.highlight && <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">HOT</span>}
                </div>
                <DollarSign className="h-4 w-4 text-emerald-500/50" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">{p.name}</h4>
              <p className="text-sm text-gray-400 mb-3">{p.spec}</p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-gray-500">适用</div>
                  <div className="text-sm text-gray-300">{p.target}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-400">{p.price}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ Section 4: 战略合作伙伴123计划 ═══ */}
      <Section icon={Star} title="战略合作伙伴 · 123计划" titleEn="Strategic Partnership Program 123" color="#F59E0B">
        <div className="bg-gradient-to-br from-amber-500/5 via-[#0a0f1a] to-amber-900/5 rounded-2xl border border-amber-500/20 p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-white mb-2">精密智造 · 共赢未来</h3>
            <p className="text-gray-400">GRT为战略合作伙伴提供超越设备交易的长期价值承诺</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="bg-[#0c1120] rounded-2xl border border-amber-500/20 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <div className="w-14 h-14 rounded-full bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-amber-400">1</span>
              </div>
              <h4 className="text-lg font-bold text-amber-200 mb-2">项目履约让利</h4>
              <div className="text-3xl font-black text-amber-400 mb-2">10<span className="text-lg">%</span></div>
              <p className="text-sm text-gray-400 mb-3">每年</p>
              <ul className="text-sm text-gray-300 space-y-2 text-left">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />年度项目合同总额的10%作为履约优惠返利</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />优先交付排期，确保项目节拍不受影响</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />专属项目经理一对一服务</li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="bg-[#0c1120] rounded-2xl border border-cyan-500/20 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              <div className="w-14 h-14 rounded-full bg-cyan-500/15 border-2 border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-cyan-400">2</span>
              </div>
              <h4 className="text-lg font-bold text-cyan-200 mb-2">智力资产溢出</h4>
              <div className="text-3xl font-black text-cyan-400 mb-2">20<span className="text-lg">%</span></div>
              <p className="text-sm text-gray-400 mb-3">每年</p>
              <ul className="text-sm text-gray-300 space-y-2 text-left">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />GRT年度研发成果的20%开放给战略伙伴</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />AI清洗算法、工艺参数库共享</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />行业标准制定委员会联席参与权</li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="bg-[#0c1120] rounded-2xl border border-emerald-500/20 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-black text-emerald-400">3</span>
              </div>
              <h4 className="text-lg font-bold text-emerald-200 mb-2">前沿接口预付</h4>
              <div className="text-3xl font-black text-emerald-400 mb-2">3<span className="text-lg">期</span></div>
              <p className="text-sm text-gray-400 mb-3">分期预付</p>
              <ul className="text-sm text-gray-300 space-y-2 text-left">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />下一代设备接口提前3期开放对接</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />IoT/MES/ERP集成零额外费用</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />数字孪生平台终身免费升级</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ Section 5: 全球服务网络 + 报修 + 反馈 ═══ */}
      <Section icon={Globe} title="GRT 全球服务网络" titleEn="Global Service Network & Support" color="#3B82F6">
        <div className="grid grid-cols-3 gap-5 mb-6">
          {[
            { city: "无锡总部", cityEn: "Wuxi HQ", country: "China", status: "active", role: "研发·制造·交付中心", team: "313人", ping: "2ms", icon: Factory },
            { city: "斯图加特技术中心", cityEn: "Stuttgart TC", country: "Germany", status: "active", role: "欧洲技术支持·VDA标准", team: "12人", ping: "85ms", icon: Wrench },
            { city: "底特律服务中心", cityEn: "Detroit SC", country: "USA", status: "active", role: "北美售后·远程运维", team: "5人", ping: "145ms", icon: Globe },
          ].map((n, i) => (
            <div key={i} className="bg-[#0c1120] rounded-xl border border-blue-500/20 p-5 hover:border-blue-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                  <n.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-white">{n.city}</div>
                  <div className="text-xs text-gray-400">{n.cityEn} · {n.country}</div>
                </div>
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400" /></span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">职能</span><span className="text-gray-200">{n.role}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">团队</span><span className="text-gray-200">{n.team}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">延迟</span><span className="text-emerald-400 font-mono">{n.ping}</span></div>
              </div>
              <div className="mt-3 text-center text-xs py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-300">🔒 安全隧道在线</div>
            </div>
          ))}
        </div>

        {/* 客户报修 & 反馈入口 */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-[#0c1120] rounded-xl border border-orange-500/20 p-6 hover:border-orange-500/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">设备报修通道</h4>
                <p className="text-sm text-gray-400">Equipment Service Request</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-4">7×24小时全球响应 · 远程诊断优先 · 现场服务48h到达</p>
            <div className="space-y-2">
              {[
                { label: "远程诊断", desc: "VPN安全隧道 · PLC远程访问 · 实时工艺参数监控", time: "< 2h响应" },
                { label: "现场服务", desc: "国内48h · 海外72h · 备件库前置部署", time: "紧急可加急" },
                { label: "预防性维护", desc: "IoT数据驱动 · AI预测性维护 · 零停机保障", time: "季度巡检" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />
                  <div className="flex-1"><span className="text-sm text-white font-medium">{s.label}</span><span className="text-xs text-gray-400 ml-2">{s.desc}</span></div>
                  <span className="text-xs text-orange-300 font-mono shrink-0">{s.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 font-semibold text-sm hover:bg-orange-500/25 transition-colors flex items-center justify-center gap-2">
              <Phone className="h-4 w-4" />提交报修工单
            </button>
          </div>

          <div className="bg-[#0c1120] rounded-xl border border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">客户反馈中心</h4>
                <p className="text-sm text-gray-400">Customer Feedback Portal</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-4">您的每一条反馈都直达CEO · 48h内闭环回复</p>
            <div className="space-y-2">
              {[
                { score: "9.2", label: "设备性能满意度", max: "10" },
                { score: "9.5", label: "服务响应速度", max: "10" },
                { score: "9.0", label: "技术支持专业度", max: "10" },
                { score: "9.4", label: "总体合作满意度", max: "10" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-32">{s.label}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${Number(s.score) / Number(s.max) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-emerald-400 w-12 text-right">{s.score}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />提交反馈建议
            </button>
          </div>
        </div>
      </Section>

      {/* ═══ Section 6: FAT数字孪生验收 (类似大众VW模式) ═══ */}
      <Section icon={Cpu} title="FAT 数字孪生验收系统" titleEn="Factory Acceptance Test · Digital Twin" color="#A855F7">
        <div className="bg-[#0c1120] rounded-2xl border border-purple-500/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">出厂验收 · 全流程数字化</h3>
              <p className="text-sm text-gray-400">参照大众集团FAT标准 · VDA 19.1 + ISO 16232 全检 · 实时报告</p>
            </div>
            <button
              onClick={() => window.open("/customer-digital-twin", "_blank")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-sm hover:bg-purple-500/25 transition-colors"
            >
              <Cpu className="h-4 w-4" />进入数字孪生验收系统<ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: Microscope, name: "颗粒度检测", nameEn: "Millipore Test", desc: "VDA 19.1 颗粒物重量法 · ≤0.030mg/part", status: "标配" },
              { icon: Zap, name: "功能性测试", nameEn: "Functional Test", desc: "清洗压力/流量/温度/节拍全参数验证", status: "标配" },
              { icon: Shield, name: "安全认证", nameEn: "Safety Cert", desc: "CE/UL/CSA 电气安全 · 急停/门锁/光栅", status: "标配" },
              { icon: Activity, name: "连续运行测试", nameEn: "Endurance Test", desc: "72h无故障连续运行 · OEE ≥ 95%", status: "标配" },
            ].map((item, i) => (
              <div key={i} className="bg-purple-500/5 rounded-xl border border-purple-500/15 p-4 hover:border-purple-500/30 transition-all">
                <item.icon className="h-6 w-6 text-purple-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-0.5">{item.name}</h4>
                <p className="text-xs text-gray-400 mb-2">{item.desc}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">{item.status}</span>
              </div>
            ))}
          </div>

          {/* FAT timeline preview */}
          <div className="bg-purple-500/5 rounded-xl border border-purple-500/10 p-5">
            <h4 className="text-sm font-bold text-white mb-3">FAT 验收流程 (Preview)</h4>
            <div className="flex items-center gap-2">
              {[
                { step: "1", name: "外观检查", done: true },
                { step: "2", name: "尺寸验证", done: true },
                { step: "3", name: "电气安全", done: true },
                { step: "4", name: "功能测试", done: false, active: true },
                { step: "5", name: "清洁度检测", done: false },
                { step: "6", name: "连续运行", done: false },
                { step: "7", name: "文档交付", done: false },
                { step: "8", name: "签署放行", done: false },
              ].map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold mb-1 ${
                    s.done ? "bg-purple-500/20 border-purple-400 text-purple-300" :
                    s.active ? "bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse" :
                    "bg-gray-800 border-gray-600 text-gray-500"
                  }`}>
                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                  </div>
                  <span className={`text-[10px] text-center ${s.active ? "text-amber-300" : s.done ? "text-gray-300" : "text-gray-600"}`}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ Handover + CTA ═══ */}
      <section className="relative z-10 py-14 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border mb-8" style={{ borderColor: `${client.color}30`, background: `${client.color}08` }}>
            <Award className="h-5 w-5" style={{ color: client.color }} />
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color: `${client.color}dd` }}>Collaboratively Managed by</div>
              <div className="text-xs" style={{ color: `${client.color}80` }}>倪微薇 Ni Weiwei · Next-Gen Representative · AI数智&人事行政部经理</div>
            </div>
          </div>

          <h2 className="text-3xl font-black text-white mb-3">
            Experience the Future of <span style={{ color: client.color }}>Digital Transparency</span>
          </h2>

          {!requestSent ? (
            <button onClick={() => setRequestSent(true)}
              className="mt-6 inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-black font-bold text-lg transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${client.color}, ${client.color}dd)`, boxShadow: `0 0 30px ${client.color}40` }}>
              <Lock className="h-5 w-5" />Request Full Access<ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="mt-6 inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400/30 text-emerald-300 font-bold text-lg">
              <CheckCircle2 className="h-5 w-5" />Request Sent · Our team will contact you shortly
            </div>
          )}

          <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> info@grt-group.com</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> +86 510 834 83999</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> 无锡 · 斯图加特 · 底特律</span>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-gray-800/50 py-5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span>© 2026 GRT · Global Robot Technology · 杰瑞德自动化</span>
          <span className="flex items-center gap-2"><Shield className="h-3 w-3" />Encrypted · TISAX AL3 · ISO 27001</span>
        </div>
      </footer>
    </div>
  );
}

// ── Reusable section wrapper ──
function Section({ icon: Icon, title, titleEn, color, children }: {
  icon: any; title: string; titleEn: string; color: string; children: React.ReactNode;
}) {
  return (
    <section className="relative z-10 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: `${color}15`, borderColor: `${color}30` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{title}</h2>
            <p className="text-sm text-gray-500">{titleEn}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
