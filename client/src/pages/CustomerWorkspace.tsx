/**
 * CustomerWorkspace — 客户工作台 (专业版)
 * 首次欢迎横幅 + 行业选择 + 参数化推荐卡片 + 报价确认号 + 资源描述
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Factory, Headphones, Shield, Globe, Award,
  LogOut, Zap, Layout, Cog, Droplets, Settings, Languages,
  Phone, Mail, Building2, Send, MessageSquare, X, Loader2,
  ChevronRight, ChevronDown, Sparkles, CheckCircle2, ExternalLink,
  Target, Clock, Ruler, Gauge,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";

type Lang = "zh" | "en";
const LANG_KEY = "grt_customer_lang";
const STORAGE_KEY = "grt_customer_industry";
const WELCOME_KEY = "grt_welcome_dismissed";

// ══════════════════════════════════════════════════
// Industry + Recommendation data (bilingual, with specs)
// ══════════════════════════════════════════════════

interface Industry {
  id: string;
  nameZh: string; nameEn: string;
  color: string; showcasePath: string;
  descZh: string; descEn: string;
  partsZh: string; partsEn: string; // 适用零件
  Icon: typeof Factory;
  recommendations: Rec[];
}
interface Rec {
  model: string;
  nameZh: string; nameEn: string;
  fit: "best" | "good" | "optional";
  reasonZh: string; reasonEn: string;
  specs: { cleanliness: string; takt: string; workpiece: string; line: string };
}

const INDUSTRIES: Industry[] = [
  {
    id: "die-casting", nameZh: "铝压铸", nameEn: "Die Casting",
    Icon: Factory, color: "from-blue-500 to-blue-600",
    showcasePath: "/showcase/die-casting",
    descZh: "一体化压铸件、电驱壳体清洗", descEn: "Mega casting, e-drive housings",
    partsZh: "电驱壳体 · 变速箱壳体 · 一体化压铸件", partsEn: "E-drive housing · Gearbox housing · Mega castings",
    recommendations: [
      { model: "MCL-12000", nameZh: "一体化压铸件清洗岛", nameEn: "Mega Casting Cleaning Island", fit: "best",
        reasonZh: "专为一体化压铸设计，支持超大工件", reasonEn: "Purpose-built for mega castings",
        specs: { cleanliness: "ISO 16232 A", takt: "120s", workpiece: "≤1200mm", line: "MES 集成" } },
      { model: "KLT-4200", nameZh: "双工位高洁净清洗机", nameEn: "Dual-Station HPC", fit: "good",
        reasonZh: "中等批量精密压铸件首选", reasonEn: "Mid-volume precision die-cast parts",
        specs: { cleanliness: "ISO 16232 A", takt: "60s", workpiece: "≤600mm", line: "CCD 在线检测" } },
      { model: "TSL-8000", nameZh: "多槽浸没超声系统", nameEn: "Multi-Tank Ultrasonic", fit: "good",
        reasonZh: "高精密壳体多品种切换", reasonEn: "High-precision multi-variant housings",
        specs: { cleanliness: "≤50μm", takt: "90s", workpiece: "≤800mm", line: "三频超声" } },
    ],
  },
  {
    id: "injection", nameZh: "喷射系统", nameEn: "Injection System",
    Icon: Droplets, color: "from-red-500 to-red-600",
    showcasePath: "/showcase/fuel-injection",
    descZh: "喷油嘴、高压共轨精密清洗", descEn: "Injectors, common rail, valve spools",
    partsZh: "喷油嘴 · 高压共轨 · 液压阀芯", partsEn: "Fuel injectors · Common rail · Valve spools",
    recommendations: [
      { model: "TSL-8000", nameZh: "多槽浸没超声系统", nameEn: "Multi-Tank Ultrasonic", fit: "best",
        reasonZh: "喷油嘴级精密清洗行业标准", reasonEn: "Industry standard for injector-grade cleaning",
        specs: { cleanliness: "残油 ≤0.5mg", takt: "90s", workpiece: "≤200mm", line: "真空干燥" } },
      { model: "KLT-4200", nameZh: "双工位高洁净清洗机", nameEn: "Dual-Station HPC", fit: "good",
        reasonZh: "中批量喷射零件在线清洗", reasonEn: "Mid-batch injection part inline cleaning",
        specs: { cleanliness: "≤50μm", takt: "60s", workpiece: "≤400mm", line: "CCD 全检" } },
    ],
  },
  {
    id: "powertrain", nameZh: "动力总成", nameEn: "Powertrain",
    Icon: Cog, color: "from-orange-500 to-orange-600",
    showcasePath: "/showcase/ice",
    descZh: "发动机缸体、缸盖、曲轴清洗", descEn: "Engine blocks, heads, crankshafts",
    partsZh: "缸体 · 缸盖 · 曲轴 · 连杆", partsEn: "Blocks · Heads · Crankshafts · Conrods",
    recommendations: [
      { model: "KLT-3600", nameZh: "通过式连续清洗线", nameEn: "Through-Type Continuous Line", fit: "best",
        reasonZh: "高产量发动机零件连续生产首选", reasonEn: "Best for high-volume engine production",
        specs: { cleanliness: "ISO 16232 B", takt: "60s", workpiece: "600×400mm", line: "碳氢清洗" } },
      { model: "KLT-4200", nameZh: "双工位高洁净清洗机", nameEn: "Dual-Station HPC", fit: "good",
        reasonZh: "缸盖油道高洁净度需求", reasonEn: "Cylinder head oil gallery deep clean",
        specs: { cleanliness: "ISO 16232 A", takt: "60s", workpiece: "≤600mm", line: "高压喷淋" } },
      { model: "MCL-12000", nameZh: "一体化清洗岛", nameEn: "Integrated Cleaning Island", fit: "optional",
        reasonZh: "大型缸体自动化产线集成", reasonEn: "Large block automated line integration",
        specs: { cleanliness: "ISO 16232 A", takt: "120s", workpiece: "≤1200mm", line: "MES 集成" } },
    ],
  },
  {
    id: "new-energy", nameZh: "新能源", nameEn: "New Energy",
    Icon: Zap, color: "from-emerald-500 to-emerald-600",
    showcasePath: "/showcase/new-energy",
    descZh: "电驱动总成、电池包托盘清洗", descEn: "E-drive, battery tray, motor housing",
    partsZh: "电驱壳体 · 电池包托盘 · 电机端盖", partsEn: "E-drive housing · Battery tray · Motor cover",
    recommendations: [
      { model: "MCL-12000", nameZh: "新能源电驱清洗岛", nameEn: "E-Drive Cleaning Island", fit: "best",
        reasonZh: "新能源电驱壳体一体化清洗首选", reasonEn: "Purpose-built for NEV e-drive housings",
        specs: { cleanliness: "ISO 16232 A", takt: "120s", workpiece: "≤1200mm", line: "IoT + MES" } },
      { model: "KLT-4200", nameZh: "双工位高洁净清洗机", nameEn: "Dual-Station HPC", fit: "good",
        reasonZh: "电池包组件中批量清洗", reasonEn: "Battery pack mid-volume cleaning",
        specs: { cleanliness: "≤50μm", takt: "60s", workpiece: "≤600mm", line: "CCD 颗粒度" } },
      { model: "KLT-3600", nameZh: "通过式连续清洗线", nameEn: "Through-Type Continuous Line", fit: "good",
        reasonZh: "电机定子/转子连续清洗", reasonEn: "Motor stator/rotor continuous cleaning",
        specs: { cleanliness: "ISO 16232 B", takt: "60s", workpiece: "600×400mm", line: "碳氢清洗" } },
    ],
  },
  {
    id: "gear-shaft", nameZh: "齿轴", nameEn: "Shaft & Gear",
    Icon: Settings, color: "from-violet-500 to-violet-600",
    showcasePath: "/showcase/die-casting",
    descZh: "齿轮、齿轴、减速器精密清洗", descEn: "Gears, shafts, gearbox components",
    partsZh: "齿轮 · 齿轴 · 减速器组件", partsEn: "Gears · Shafts · Gearbox components",
    recommendations: [
      { model: "KLT-4200", nameZh: "双腔高洁净清洗机", nameEn: "Dual-Chamber HPC Machine", fit: "best",
        reasonZh: "齿轮行业龙头双环传动验证方案", reasonEn: "Proven at Shuanghuan — gear industry leader",
        specs: { cleanliness: "ISO 16232 A", takt: "45s", workpiece: "≤400mm", line: "CCD 100%全检" } },
      { model: "KLT-3600", nameZh: "通过式连续清洗线", nameEn: "Through-Type Continuous Line", fit: "good",
        reasonZh: "大批量齿轮连续在线清洗", reasonEn: "High-volume gear continuous inline",
        specs: { cleanliness: "ISO 16232 B", takt: "60s", workpiece: "600×400mm", line: "多品种适配" } },
      { model: "TSL-8000", nameZh: "多槽浸没超声系统", nameEn: "Multi-Tank Ultrasonic", fit: "optional",
        reasonZh: "高精密减速器齿轮深度清洗", reasonEn: "Precision reducer gear deep clean",
        specs: { cleanliness: "≤30μm", takt: "90s", workpiece: "≤800mm", line: "三频超声" } },
    ],
  },
];

const FIT = {
  best: { zh: "最佳推荐", en: "Best Fit", bg: "bg-emerald-500", ring: "ring-1 ring-emerald-500/20 border-emerald-500/30" },
  good: { zh: "推荐", en: "Recommended", bg: "bg-[#0078d4]", ring: "" },
  optional: { zh: "可选", en: "Optional", bg: "bg-slate-400", ring: "" },
};

// ══════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════

export default function CustomerWorkspace() {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "zh");
  const zh = lang === "zh";
  const toggleLang = () => { const n = zh ? "en" : "zh"; setLang(n); localStorage.setItem(LANG_KEY, n); };

  const [selectedIndustry, setSelectedIndustry] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || "");
  const [showAllIndustries, setShowAllIndustries] = useState(!localStorage.getItem(STORAGE_KEY));
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_KEY));
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const proposalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (selectedIndustry) localStorage.setItem(STORAGE_KEY, selectedIndustry); }, [selectedIndustry]);

  const displayName = user?.name || user?.email || (zh ? "客户" : "Customer");
  const company = user?.company || "";
  const industry = INDUSTRIES.find(i => i.id === selectedIndustry);

  const dismissWelcome = () => { setShowWelcome(false); localStorage.setItem(WELCOME_KEY, "1"); };
  const scrollToProposal = () => { setShowProposalForm(true); setTimeout(() => proposalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100); };

  const handleProposalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProposalError("");
    const fd = new FormData(e.currentTarget);
    const guestName = (fd.get("name") as string)?.trim() || displayName;
    const guestEmail = (fd.get("email") as string)?.trim() || "";
    const message = (fd.get("message") as string)?.trim() || "";

    if (!guestEmail) { setProposalError(zh ? "请填写邮箱" : "Email is required"); return; }

    setProposalLoading(true);
    fetch("/api/trpc/targetedShowcase.supportTicket.submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json: {
        issueType: "demo_request",
        subject: `${zh ? "客户询价" : "Customer Inquiry"} — ${company || guestName}`,
        guestName,
        guestEmail,
        guestPhone: user?.openId?.replace("cust:", "") || "",
        companyName: company,
        description: `${message}\n\n[${zh ? "行业" : "Industry"}: ${industry ? (zh ? industry.nameZh : industry.nameEn) : "N/A"}]`,
      }}),
    }).then(r => r.json()).then(data => {
      const res = data?.result?.data?.json || data?.result?.data || {};
      setInquiryId(res.ticketCode || "INQ-OK");
      setProposalSent(true);
      setProposalLoading(false);
    }).catch(err => {
      setProposalError(err?.message || (zh ? "提交失败，请稍后重试" : "Submission failed"));
      setProposalLoading(false);
    });
  };

  const SPEC_LABELS = zh
    ? { cleanliness: "清洁度", takt: "节拍", workpiece: "工件", line: "产线" }
    : { cleanliness: "Cleanliness", takt: "Takt", workpiece: "Workpiece", line: "Line" };
  const SPEC_ICONS = [Shield, Gauge, Ruler, Factory];

  return (
    <div className="min-h-screen bg-[#faf9f8] pb-20" style={{ fontFamily: "'Segoe UI', 'PingFang SC', system-ui, sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-[#edebe9] px-4 pt-5 pb-4">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <img src="/GRTlogo.gif" alt="GRT" className="w-9 h-9 rounded-lg shadow-sm" />
              <div>
                <div className="text-base font-semibold text-[#323130] leading-tight">{zh ? "GRT 客户平台" : "GRT Portal"}</div>
                <div className="text-[10px] text-[#a19f9d]">{zh ? "您的专属清洗方案中心" : "Your Cleaning Solutions Hub"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleLang} className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#edebe9] hover:bg-[#f3f2f1] text-[11px] text-[#605e5c]">
                <Languages className="h-3 w-3" />{zh ? "EN" : "中文"}
              </button>
              <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#edebe9] hover:bg-[#f3f2f1] text-xs text-[#605e5c]">
                <LogOut className="h-3.5 w-3.5" />{zh ? "退出" : "Sign Out"}
              </button>
            </div>
          </div>
          {/* Welcome card */}
          <div className="bg-[#f3f2f1] rounded-lg border border-[#edebe9] p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#deecf9] flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-[#0078d4]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#323130] truncate">{zh ? `${displayName}，欢迎回来` : `Welcome, ${displayName}`}</div>
                {company && <div className="text-xs text-[#605e5c] truncate">{company}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg md:max-w-2xl mx-auto px-4 space-y-5 mt-4">

        {/* ── First-time Welcome Banner ── */}
        {showWelcome && (
          <div className="relative p-4 rounded-lg bg-[#deecf9] border border-[#c7e0f4]">
            <button onClick={dismissWelcome} className="absolute top-3 right-3 text-[#605e5c] hover:text-[#323130]"><X className="h-4 w-4" /></button>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-[#0078d4] shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-[#323130] mb-1">{zh ? "欢迎来到 GRT 客户平台！" : "Welcome to GRT Customer Platform!"}</div>
                <p className="text-xs text-[#605e5c] leading-relaxed">
                  {zh ? "选择您的行业，即刻获取量身定制的清洗设备推荐。您还可以浏览设备展厅、加入技术论坛与行业专家交流。" : "Select your industry to get tailored equipment recommendations. You can also browse our showroom and join the tech forum to connect with industry experts."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Industry Selector ── */}
        <div>
          {selectedIndustry && !showAllIndustries ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[#0078d4]/30 bg-[#deecf9]">
              {industry && (
                <>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${industry.color} flex items-center justify-center shrink-0`}>
                    <industry.Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#323130]">{zh ? industry.nameZh : industry.nameEn}</div>
                    <div className="text-[10px] text-[#605e5c]">{industry.recommendations.length} {zh ? "套推荐系统" : "systems recommended"}</div>
                  </div>
                </>
              )}
              <button onClick={() => setShowAllIndustries(true)} className="text-[11px] text-[#0078d4] hover:text-[#106ebe] flex items-center gap-0.5">
                {zh ? "切换" : "Change"} <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider mb-3 px-1">
                {selectedIndustry ? (zh ? "切换行业" : "Change Industry") : (zh ? "选择您的行业" : "Select Your Industry")}
              </div>
              <div className="space-y-2">
                {INDUSTRIES.map(ind => {
                  const sel = selectedIndustry === ind.id;
                  return (
                    <button key={ind.id} onClick={() => { setSelectedIndustry(ind.id); setShowAllIndustries(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left active:scale-[0.98] ${sel ? "border-[#0078d4] bg-[#deecf9] ring-1 ring-[#0078d4]/20" : "border-[#edebe9] bg-white hover:bg-[#f3f2f1] shadow-sm"}`}>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ind.color} flex items-center justify-center shrink-0`}>
                        <ind.Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#323130]">{zh ? ind.nameZh : ind.nameEn}</div>
                        <div className="text-[11px] text-[#605e5c]">{zh ? ind.partsZh : ind.partsEn}</div>
                      </div>
                      <div className="text-[10px] text-[#a19f9d] shrink-0">{ind.recommendations.length} {zh ? "套" : "sys"}</div>
                      {sel && <CheckCircle2 className="h-4 w-4 text-[#0078d4] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Recommended Solutions with spec grids ── */}
        {industry && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Target className="h-4 w-4 text-[#0078d4]" />
              <span className="text-xs font-medium text-[#605e5c] uppercase tracking-wider">
                {zh ? `${industry.nameZh}行业推荐方案` : `Recommended for ${industry.nameEn}`}
              </span>
            </div>
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {industry.recommendations.map((rec, i) => {
                const f = FIT[rec.fit];
                return (
                  <Card key={i} className={`bg-white border-[#edebe9] shadow-none ${rec.fit === "best" ? f.ring : ""}`}>
                    <CardContent className="pt-3.5 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-mono text-[#0078d4] bg-[#deecf9] px-1.5 py-0.5 rounded">{rec.model}</span>
                        <Badge className={`text-[10px] ${f.bg} text-white border-0`}>{zh ? f.zh : f.en}</Badge>
                      </div>
                      <h3 className="text-sm font-medium text-[#323130] mb-1">{zh ? rec.nameZh : rec.nameEn}</h3>

                      {/* Spec grid — 2x2 */}
                      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                        {(Object.keys(rec.specs) as Array<keyof typeof rec.specs>).map((key, si) => {
                          const SIcon = SPEC_ICONS[si];
                          return (
                            <div key={key} className="flex items-center gap-1.5 p-1.5 rounded bg-white border border-[#edebe9]">
                              <SIcon className="h-3 w-3 text-[#a19f9d] shrink-0" />
                              <div>
                                <div className="text-[8px] text-[#a19f9d] uppercase">{SPEC_LABELS[key]}</div>
                                <div className="text-[10px] text-[#323130] font-mono">{rec.specs[key]}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-start gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/5 rounded-lg px-2.5 py-2 border border-emerald-500/10 mb-2">
                        <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{zh ? rec.reasonZh : rec.reasonEn}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button onClick={scrollToProposal} className="text-[11px] text-[#0078d4] hover:text-sky-300 flex items-center gap-1">
                          <Send className="h-3 w-3" />{zh ? "获取报价" : "Request Quote"}
                        </button>
                        <a href={industry.showcasePath} target="_blank" rel="noopener" className="text-[11px] text-[#605e5c] hover:text-[#323130] flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />{zh ? "查看完整规格" : "Full Specs"}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Resources (with descriptions) ── */}
        <div>
          <div className="text-xs font-medium text-[#605e5c] uppercase tracking-wider mb-3 px-1">{zh ? "平台资源" : "Resources"}</div>
          <div className="space-y-2">
            {[
              { icon: MessageSquare, zh: "技术论坛", en: "Tech Forum", descZh: "与行业专家交流清洗技术与经验", descEn: "Exchange cleaning insights with industry experts", path: "/customer/forum", color: "from-sky-500 to-sky-600", external: false },
              { icon: Zap, zh: "新能源方案展示", en: "New Energy Showcase", descZh: "电驱壳体、电池托盘清洗方案详情", descEn: "E-drive & battery tray cleaning solutions", path: "/showcase/new-energy", color: "from-emerald-500 to-emerald-600", external: true },
              { icon: Layout, zh: "设备产品目录", en: "Equipment Catalog", descZh: "浏览全部产品线、规格与配置", descEn: "Browse all product lines & configurations", path: "/showroom", color: "from-violet-500 to-violet-600", external: true },
              { icon: Globe, zh: "GRT 公司介绍", en: "About GRT", descZh: "20年发展历程 · 中英德法四语展示", descEn: "20-year history · 4-language presentation", path: "/showcase/company-intro", color: "from-cyan-500 to-cyan-600", external: true },
              { icon: Factory, zh: "设备展厅", en: "Showroom", descZh: "闭环自适应清洗系统交互式演示", descEn: "Interactive adaptive cleaning system demo", path: "/showroom", color: "from-purple-500 to-purple-600", external: true },
              { icon: Shield, zh: "行业标准与合规", en: "Standards", descZh: "ISO 16232 · VDA 19.1 · IATF 16949", descEn: "ISO 16232 · VDA 19.1 · IATF 16949", path: "/conference/gear-shaft", color: "from-blue-500 to-blue-600", external: true },
            ].map(r => {
              const cls = "flex items-center gap-3 p-3 rounded-xl border border-[#edebe9] bg-white hover:bg-[#f3f2f1] transition-all";
              const inner = (
                <>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center shrink-0`}>
                    <r.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#323130]">{zh ? r.zh : r.en}</div>
                    <div className="text-[10px] text-[#605e5c] truncate">{zh ? r.descZh : r.descEn}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#a19f9d] shrink-0" />
                </>
              );
              return r.external
                ? <a key={r.en} href={r.path} target="_blank" rel="noopener" className={cls}>{inner}</a>
                : <Link key={r.en} href={r.path} className={cls}>{inner}</Link>;
            })}
          </div>
        </div>

        {/* ── Request a Proposal (with inquiry ID, no auto-dismiss) ── */}
        <div ref={proposalRef}>
          <Card className="bg-white border-[#edebe9] shadow-none overflow-hidden">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold text-[#323130] mb-1">{zh ? "技术咨询与方案报价" : "Technical Inquiry & Quotation"}</div>
              <p className="text-[11px] text-[#605e5c] mb-3">{zh ? "GRT 工程技术部将在 24 小时内为您提供专业方案与报价。" : "GRT Engineering will provide a tailored proposal within 24 hours."}</p>

              {!showProposalForm && !proposalSent ? (
                <div className="flex gap-2">
                  <Button onClick={() => setShowProposalForm(true)} className="flex-1 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs h-9">
                    <Send className="h-3.5 w-3.5 mr-1.5" />{zh ? "获取方案报价" : "Request Proposal"}
                  </Button>
                  <Button variant="outline" onClick={() => window.open("tel:+8651083483999")} className="border-white/10 text-[#323130] hover:bg-[#f3f2f1] text-xs h-9">
                    <Phone className="h-3.5 w-3.5 mr-1.5" />{zh ? "电话咨询" : "Call Us"}
                  </Button>
                </div>
              ) : proposalSent ? (
                /* Permanent confirmation — no auto-dismiss */
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <div className="text-sm font-bold text-[#323130] mb-1">{zh ? "询价已提交" : "Inquiry Submitted"}</div>
                    <div className="text-xs text-emerald-400 font-mono mb-2">{inquiryId}</div>
                    <p className="text-[11px] text-[#605e5c]">{zh ? "GRT 工程技术部将在 24 小时内与您联系" : "Our engineering team will contact you within 24 hours"}</p>
                  </div>
                  <Button variant="outline" onClick={() => { setProposalSent(false); setShowProposalForm(false); }} className="w-full border-white/10 text-[#605e5c] text-xs h-8">
                    {zh ? "确定" : "OK"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleProposalSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[#605e5c] text-[10px]">{zh ? "姓名" : "Name"}</Label>
                      <Input name="name" defaultValue={displayName !== "客户" && displayName !== "Customer" ? displayName : ""} placeholder={zh ? "您的姓名" : "Your name"} className="bg-white/5 border-white/10 text-[#323130] placeholder:text-[#a19f9d] text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-[#605e5c] text-[10px]">{zh ? "邮箱" : "Email"} <span className="text-red-400">*</span></Label>
                      <Input name="email" type="email" required placeholder={zh ? "邮箱地址" : "you@company.com"} className="bg-white/5 border-white/10 text-[#323130] placeholder:text-[#a19f9d] text-xs h-8" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[#605e5c] text-[10px]">{zh ? "需求描述" : "Requirements"}</Label>
                    <textarea name="message" rows={2} placeholder={zh ? "请描述您的清洗需求、零件类型、产量要求..." : "Describe your cleaning requirements..."} className="w-full rounded-md bg-white/5 border border-white/10 text-[#323130] placeholder:text-[#a19f9d] text-xs p-2 focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/20 outline-none resize-none" />
                  </div>
                  {proposalError && (
                    <div className="p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">{proposalError}</div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={proposalLoading} className="flex-1 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs h-8">
                      {proposalLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Send className="h-3 w-3 mr-1.5" />}
                      {zh ? "发送" : "Send"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowProposalForm(false)} className="text-[#605e5c] text-xs h-8">{zh ? "取消" : "Cancel"}</Button>
                  </div>
                </form>
              )}

              <div className="flex gap-4 mt-3 pt-3 border-t border-[#edebe9]">
                <a href="tel:+8651083483999" className="flex items-center gap-1.5 text-[11px] text-[#605e5c] hover:text-[#323130]"><Phone className="h-3 w-3" /> +86 510 834 83999</a>
                <a href="mailto:info@grt-group.com" className="flex items-center gap-1.5 text-[11px] text-[#605e5c] hover:text-[#323130]"><Mail className="h-3 w-3" /> info@grt-group.com</a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-[10px] text-[#a19f9d] pt-2 pb-4">
          © 2026 GRT · Global Robot Technology · {zh ? "无锡 · 斯图加特 · 底特律" : "Wuxi · Stuttgart · Detroit"}
        </div>
      </div>

      {/* ── Floating Quick Nav ── */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/95 backdrop-blur border border-[#edebe9] shadow-lg">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#0078d4] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "回顶部" : "Top"}
        </button>
        <Link href="/customer/forum" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#8764b8] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "论坛" : "Forum"}
        </Link>
        <a href="/showcase/new-energy" target="_blank" rel="noopener" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#107c10] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "新能源" : "NEV"}
        </a>
        <a href="/showroom" target="_blank" rel="noopener" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#d83b01] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "展厅" : "Showroom"}
        </a>
      </nav>
    </div>
  );
}
