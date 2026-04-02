/**
 * CustomerAuth — 客户注册门户 (Microsoft Fluent 白色风格)
 * Route: /customer/auth (STANDALONE, via customer-entry.tsx)
 *
 * ZERO external deps beyond React — no shadcn, no radix, no lucide-react.
 * This eliminates vendor-radix (48KB gzip) + vendor-icons (30KB gzip) from
 * the customer load path, cutting total JS by ~60% on slow DDNS networks.
 */
import { useEffect, useRef, useState } from "react";

type Lang = "zh" | "en";
const LANG_KEY = "grt_customer_lang";

// ── Inline SVG icons (replace lucide-react to avoid 30KB vendor chunk) ──
const Icon = ({ d, className = "w-3.5 h-3.5" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const PhoneIcon = ({ className }: { className?: string }) => <Icon className={className} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const UserIcon = ({ className }: { className?: string }) => <><Icon className={className} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none" className={className} /></>;
const BuildingIcon = ({ className }: { className?: string }) => <Icon className={className} d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4" />;
const ArrowRightIcon = ({ className }: { className?: string }) => <Icon className={className} d="M5 12h14M12 5l7 7-7 7" />;
const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
);
const GlobeIcon = ({ className }: { className?: string }) => <Icon className={className} d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10zM2 12h20" />;
const FactoryIcon = () => <span className="text-[#0078d4] text-sm">🏭</span>;
const TargetIcon = () => <span className="text-[#0078d4] text-sm">🎯</span>;
const ClockIcon = () => <span className="text-[#0078d4] text-sm">⏱️</span>;

const STAT_ICONS = [FactoryIcon, TargetIcon, ClockIcon];
const SOLUTION_EMOJIS = ["⚡", "🏭", "💧", "⚙️", "⭐", "🌍"];
const SOLUTION_COLORS = ["border-l-emerald-600", "border-l-blue-600", "border-l-red-500", "border-l-orange-500", "border-l-purple-600", "border-l-cyan-600"];
const SOLUTION_PATHS = ["/showcase/new-energy", "/showcase/die-casting", "/showcase/fuel-injection", "/showcase/ice", "/showroom", "/showcase/company-intro"];

const T = {
  zh: {
    portal: "GRT 客户门户", subtitle: "全球机器人科技 · 工业精密清洗",
    heroTitle: "工业精密清洗", heroHighlight: "为您的行业量身定制",
    heroDesc: "获取定制清洗方案、跟踪项目进度、查看质量报告，直接对接工程技术团队。",
    heroMetrics: "ISO 16232 颗粒度检测 · 94%+ 首次直通率 · 500+ 套系统交付",
    stats: [
      { num: "500+", label: "套清洗系统", detail: "服务全球领军制造企业" },
      { num: "94%", label: "首次直通率", detail: "行业领先清洁度达标率" },
      { num: "20+", label: "年行业经验", detail: "德国技术 · 全球交付" },
    ],
    trustedBy: "BMW · BYD · CATL · Bosch · Continental · ZF 等全球客户信赖",
    exploreSolutions: "浏览清洗方案",
    solutions: [
      { label: "新能源清洗方案", desc: "电驱壳体 · 电池托盘 · 电机端盖", spec: "颗粒 ≤50μm · IoT集成" },
      { label: "铝压铸清洗方案", desc: "一体化压铸件 · 电驱壳体", spec: "Mega Casting · 全自动" },
      { label: "燃油喷射精密清洗", desc: "喷油嘴 · 高压共轨 · 阀芯", spec: "残油 ≤0.5mg · 三频超声" },
      { label: "动力总成清洗", desc: "发动机缸体 · 缸盖 · 曲轴", spec: "节拍 60s · 碳氢清洗" },
      { label: "设备展厅", desc: "交互式产品演示与性能数据", spec: "闭环自适应系统" },
      { label: "GRT 公司介绍", desc: "中/英/德/法 四语言展示", spec: "20+ 年发展历程" },
    ],
    formTitle: "立即获取专属方案", formSubtitle: "填写您的信息，30秒内获取匹配您行业的设备推荐",
    phoneLabel: "联系电话", phonePlaceholder: "138 0013 8000",
    nameLabel: "您的姓名", nameOptional: "(选填)", namePlaceholder: "例如：张三",
    companyLabel: "公司名称", companyPlaceholder: "请输入公司全称",
    industryLabel: "所属行业", industryPlaceholder: "请选择行业",
    industries: ["新能源汽车", "铝压铸", "燃油喷射系统", "动力总成", "齿轮齿轴", "半导体", "医疗器械", "其他"],
    requirementLabel: "需求简述", requirementOptional: "(选填)",
    requirementPlaceholder: "例如：年产量50万件，工件尺寸约400×300mm，需ISO 16232 Class A...",
    submit: "立即获取专属方案",
    errPhone: "请输入联系电话", errPhoneFmt: "电话格式不正确", errCompany: "请输入公司名称",
    errNetwork: "网络错误，请稍后重试", errRegFail: "注册失败",
    copyright: "© 2026 GRT · 无锡 · 斯图加特 · 底特律", employeeLogin: "员工登录", switchLang: "EN",
  },
  en: {
    portal: "GRT Customer Portal", subtitle: "Global Robot Technology",
    heroTitle: "Industrial Precision Cleaning", heroHighlight: "Engineered for Your Industry",
    heroDesc: "Access tailored cleaning solutions, track your project, review quality reports, and connect directly with our engineering team.",
    heroMetrics: "ISO 16232 Particle Testing · 94%+ First-Pass Yield · 500+ Systems Delivered",
    stats: [
      { num: "500+", label: "Cleaning Systems", detail: "Serving global OEMs" },
      { num: "94%", label: "First-Pass Yield", detail: "Industry-leading cleanliness" },
      { num: "20+", label: "Years Experience", detail: "German tech · Global delivery" },
    ],
    trustedBy: "Trusted by BMW · BYD · CATL · Bosch · Continental · ZF and more",
    exploreSolutions: "Explore Our Solutions",
    solutions: [
      { label: "New Energy Cleaning", desc: "E-drive housing · Battery tray · Motor cover", spec: "Particle ≤50μm · IoT" },
      { label: "Die Casting Solutions", desc: "Mega casting · E-drive housings", spec: "Mega Casting · Full-auto" },
      { label: "Fuel Injection Cleaning", desc: "Injectors · Common rail · Valve spools", spec: "Oil ≤0.5mg · Tri-freq" },
      { label: "Powertrain / ICE", desc: "Engine blocks · Heads · Crankshafts", spec: "60s takt · HC cleaning" },
      { label: "Equipment Showroom", desc: "Interactive demos & performance data", spec: "Adaptive loop system" },
      { label: "About GRT", desc: "Company presentation (4 languages)", spec: "20+ years history" },
    ],
    formTitle: "Get Your Tailored Solution", formSubtitle: "Fill in your details — see matched equipment in 30 seconds",
    phoneLabel: "Phone Number", phonePlaceholder: "+86 138 0013 8000",
    nameLabel: "Your Name", nameOptional: "(optional)", namePlaceholder: "e.g. Zhang San",
    companyLabel: "Company", companyPlaceholder: "Company name",
    industryLabel: "Industry", industryPlaceholder: "Select your industry",
    industries: ["New Energy Vehicle", "Die Casting", "Fuel Injection", "Powertrain", "Gears & Shafts", "Semiconductor", "Medical Device", "Other"],
    requirementLabel: "Requirements", requirementOptional: "(optional)",
    requirementPlaceholder: "e.g. 500K pcs/year, workpiece ~400×300mm, ISO 16232 Class A required...",
    submit: "Get My Tailored Solution",
    errPhone: "Please enter your phone number", errPhoneFmt: "Invalid phone format", errCompany: "Please enter your company name",
    errNetwork: "Network error, please try again", errRegFail: "Registration failed",
    copyright: "© 2026 GRT · Wuxi · Stuttgart · Detroit", employeeLogin: "Employee Login", switchLang: "中文",
  },
};

// ── Shared styles ──
const inputCls = "w-full h-9 rounded-md border border-[#8a8886] bg-white text-sm px-2.5 outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/20 text-[#323130] disabled:opacity-50";
const labelCls = "text-[11px] font-medium text-[#605e5c] flex items-center gap-0.5";

export default function CustomerAuth() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "zh");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const t = T[lang];

  const toggleLang = () => { const n = lang === "zh" ? "en" : "zh"; setLang(n); localStorage.setItem(LANG_KEY, n); };
  useEffect(() => { phoneRef.current?.focus(); }, []);

  function validatePhone(phone: string): string | null {
    if (!phone) return t.errPhone;
    const digits = phone.replace(/[\s\-\+\(\)]/g, "");
    if (!/^\d{6,15}$/.test(digits)) return t.errPhoneFmt;
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const form = formRef.current; if (!form) return;
    const fd = new FormData(form);
    const phone = (fd.get("phone") as string)?.trim() || "";
    const name = (fd.get("name") as string)?.trim() || "";
    const company = (fd.get("company") as string)?.trim() || "";
    const phoneErr = validatePhone(phone);
    if (phoneErr) { setError(phoneErr); return; }
    if (!company) { setError(t.errCompany); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/customer-register", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ phone, name: name || undefined, company }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t.errRegFail); setLoading(false); return; }
      // Inject user data into auth store so CustomerWorkspace has it immediately
      try {
        const { setUserDirect } = await import("@/_core/hooks/useAuth");
        if (data.user) setUserDirect(data.user);
      } catch { /* non-blocking */ }
      if ((window as any).grtCustomerNavigate) {
        (window as any).grtCustomerNavigate("/customer/portal");
      } else {
        window.location.href = "/customer/portal";
      }
    } catch { setError(t.errNetwork); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#faf9f8]" style={{ fontFamily: "'Segoe UI', 'PingFang SC', system-ui, sans-serif" }}>

      {/* Hero */}
      <div className="border-b border-[#edebe9]">
        <div className="max-w-lg mx-auto px-5 pt-7 pb-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <img src="/GRTlogo.gif" alt="GRT" className="w-11 h-11 rounded-lg shadow-sm" />
              <div>
                <div className="text-base font-semibold text-[#323130]">{t.portal}</div>
                <div className="text-xs text-[#a19f9d]">{t.subtitle}</div>
              </div>
            </div>
            <button onClick={toggleLang} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#edebe9] hover:bg-[#f3f2f1] text-xs text-[#605e5c]">
              <GlobeIcon className="w-3.5 h-3.5" />{t.switchLang}
            </button>
          </div>
          <div className="w-8 h-1 bg-[#0078d4] rounded-full mb-4" />
          <h1 className="text-2xl font-semibold leading-snug mb-2 text-[#323130]">
            {t.heroTitle}<span className="block text-[#0078d4]">{t.heroHighlight}</span>
          </h1>
          <p className="text-sm leading-relaxed mb-3 text-[#605e5c]">{t.heroDesc}</p>
          <div className="text-[11px] text-[#0078d4] font-medium tracking-wide">{t.heroMetrics}</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-4 py-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {t.stats.map((s, i) => {
            const StatIcon = STAT_ICONS[i];
            return (
              <div key={s.label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white border border-[#edebe9] shadow-sm">
                <StatIcon />
                <div className="text-xl font-bold leading-none text-[#323130]">{s.num}</div>
                <div className="text-[10px] font-semibold text-center text-[#605e5c]">{s.label}</div>
                <div className="text-[9px] text-center leading-tight text-[#a19f9d]">{s.detail}</div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-[10px] py-1 text-[#a19f9d]">{t.trustedBy}</div>

        {/* Solutions */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-1 text-[#605e5c]">{t.exploreSolutions}</div>
          <div className="grid grid-cols-2 gap-2">
            {SOLUTION_PATHS.map((path, i) => {
              const sol = t.solutions[i];
              return (
                <a key={path} href={path} target="_blank" rel="noopener"
                  className={`flex flex-col gap-1 px-3 py-2.5 rounded-lg border-l-2 ${SOLUTION_COLORS[i]} border border-[#edebe9] bg-white hover:bg-[#f3f2f1] transition-colors shadow-sm`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{SOLUTION_EMOJIS[i]}</span>
                    <span className="text-xs font-semibold truncate text-[#323130]">{sol.label}</span>
                  </div>
                  <div className="text-[10px] truncate text-[#a19f9d]">{sol.desc}</div>
                  <div className="text-[9px] text-[#0078d4]/60 font-mono truncate">{sol.spec}</div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white border border-[#edebe9] shadow-md rounded-lg p-5">
          <div className="mb-4">
            <div className="text-base font-semibold text-[#323130]">{t.formTitle}</div>
            <div className="text-xs text-[#a19f9d]">{t.formSubtitle}</div>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="phone" className={labelCls}>
                  <PhoneIcon className="w-3 h-3" />{t.phoneLabel} <span className="text-red-500">*</span>
                </label>
                <input ref={phoneRef} id="phone" name="phone" type="tel" placeholder={t.phonePlaceholder}
                  required autoComplete="tel" autoFocus disabled={loading} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="name" className={labelCls}>
                  <UserIcon className="w-3 h-3" />{t.nameLabel} <span className="text-[9px] text-[#a19f9d]">{t.nameOptional}</span>
                </label>
                <input id="name" name="name" type="text" placeholder={t.namePlaceholder}
                  autoComplete="name" disabled={loading} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="company" className={labelCls}>
                  <BuildingIcon className="w-3 h-3" />{t.companyLabel} <span className="text-red-500">*</span>
                </label>
                <input id="company" name="company" type="text" placeholder={t.companyPlaceholder}
                  required disabled={loading} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="industry" className={labelCls}>{t.industryLabel}</label>
                <select id="industry" name="industry" disabled={loading} className={inputCls}>
                  <option value="">{t.industryPlaceholder}</option>
                  {t.industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="requirement" className={labelCls}>{t.requirementLabel} <span className="text-[9px] text-[#a19f9d]">{t.requirementOptional}</span></label>
              <textarea id="requirement" name="requirement" rows={2} placeholder={t.requirementPlaceholder} disabled={loading}
                className="w-full rounded-md border border-[#8a8886] bg-white text-[#323130] text-xs p-2.5 outline-none resize-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/20" />
            </div>

            {error && <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold h-11 text-sm rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {loading ? <SpinnerIcon className="h-4 w-4" /> : <ArrowRightIcon className="h-4 w-4" />}
              {t.submit}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#edebe9] pt-4 pb-20 flex items-center justify-between">
          <div className="text-[10px] text-[#a19f9d]">{t.copyright}</div>
          <button onClick={() => { window.location.href = "/login"; }} className="text-[10px] text-[#a19f9d] hover:text-[#605e5c]">
            {t.employeeLogin}
          </button>
        </div>
      </div>

      {/* Floating Nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/95 backdrop-blur border border-[#edebe9] shadow-lg">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#0078d4] hover:bg-[#f3f2f1]">
          {lang === "zh" ? "回顶部" : "Top"}
        </button>
        <a href="/showroom" target="_blank" rel="noopener" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#8764b8] hover:bg-[#f3f2f1]">
          {lang === "zh" ? "展厅" : "Showroom"}
        </a>
        <a href="/showcase/new-energy" target="_blank" rel="noopener" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#107c10] hover:bg-[#f3f2f1]">
          {lang === "zh" ? "新能源" : "NEV"}
        </a>
      </nav>
    </div>
  );
}
