import { useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ExternalLink,
  Globe,
} from "lucide-react";
import HeroSection, { INDUSTRIES } from "@/components/showcase/HeroSection";
import TechCapabilities from "@/components/showcase/TechCapabilities";
import TrustAndConversion from "@/components/showcase/TrustAndConversion";

const INDUSTRY_OPTIONS = [
  { slug: "die-casting", label: "Die Casting", labelCn: "压力铸造" },
  { slug: "ice", label: "ICE", labelCn: "内燃机" },
  { slug: "new-energy", label: "New Energy", labelCn: "新能源" },
  { slug: "fuel-injection", label: "Fuel Injection", labelCn: "燃油喷射" },
];

export default function ShowcasePortal() {
  const [, params] = useRoute("/showcase/:industry");
  const [, navigate] = useLocation();
  const formRef = useRef<HTMLElement>(null);

  const industry = params?.industry || "new-energy";
  const config = INDUSTRIES[industry] || INDUSTRIES["new-energy"];

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
      {/* ========== Top Navigation Bar ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-neutral-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo area */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-bold text-sm text-white">
              GRT
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white tracking-wide">
                GRT Cloud Showcase
              </div>
              <div className="text-[10px] text-neutral-500 -mt-0.5">
                全球数字云展厅
              </div>
            </div>
          </div>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Solutions
            </a>
            <a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Technology
            </a>
            <a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Customers
            </a>

            {/* Industry Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                {config.label}
                <span className="text-neutral-500">({config.labelCn})</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              {/* Dropdown */}
              <div className="absolute top-full mt-2 right-0 w-64 rounded-xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                <div className="p-1.5">
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.slug}
                      onClick={() => navigate(`/showcase/${opt.slug}`)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                        opt.slug === industry
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-neutral-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-xs text-neutral-500">
                        {opt.labelCn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-neutral-500 hover:text-white transition-colors hidden sm:flex items-center gap-1"
            >
              GRT System <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={scrollToForm}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Proposal
            </button>
          </div>
        </div>

        {/* Mobile industry selector */}
        <div className="md:hidden border-t border-white/[0.04] px-4 py-2 flex gap-2 overflow-x-auto">
          {INDUSTRY_OPTIONS.map((opt) => (
            <button
              key={opt.slug}
              onClick={() => navigate(`/showcase/${opt.slug}`)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                opt.slug === industry
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 text-neutral-500 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ========== Page Content ========== */}
      <main className="pt-16">
        {/* Hero Section */}
        <HeroSection industry={industry} onScrollToForm={scrollToForm} />

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Technical Capabilities + 3D Viewer */}
        <TechCapabilities industry={industry} />

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Trust & Conversion (Customer Wall + Certs + CRM Form) */}
        <TrustAndConversion ref={formRef} industry={industry} />
      </main>

      {/* ========== Footer ========== */}
      <footer className="border-t border-white/[0.06] py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[8px] font-bold text-white">
              GRT
            </div>
            <span className="text-xs text-neutral-500">
              GRT Global Resource Technology
            </span>
          </div>
          <p className="text-xs text-neutral-600 text-center">
            &copy; {new Date().getFullYear()} GRT. All rights reserved. |
            ISO 9001 | IATF 16949 | CE | TISAX Certified
          </p>
          <div className="flex gap-4 text-xs text-neutral-600">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* Marquee animation keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
