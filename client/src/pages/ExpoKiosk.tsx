/**
 * UI 7 — Expo Kiosk V2 (展会大屏)
 * Auto-rotating tradeshow display with CMS integration, QR slides, community onboarding
 * Route: /expo-kiosk (STANDALONE)
 */

import React, { useState, useEffect, useMemo } from 'react';
import FloatingNav from '@/components/FloatingNav';
import { useSandboxStore } from '../stores/sandboxStore';
import sandboxData from '../data/mock_sandbox_data.json';
import { trpc } from '@/lib/trpc';

const ROTATION_INTERVAL = 8000;
const INDUSTRY_INTERVAL = 15000;
const INDUSTRIES = ['Automotive', 'New Energy', 'Semiconductor', 'Die Casting'];
const QR_LINK = '/showcase/new-energy';

interface SlideItem {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  meta?: Record<string, any>;
}

// SVG QR placeholder — deterministic dot pattern
function QRPlaceholder({ size = 160, label }: { size?: number; label?: string }) {
  const cells = 21;
  const cellSize = size / cells;
  // Simple fixed pattern simulating QR alignment + data
  const filled = new Set<string>();
  // Corners (finder patterns)
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
      filled.add(`${r},${c}`);
      filled.add(`${r},${cells - 1 - c}`);
      filled.add(`${cells - 1 - r},${c}`);
    }
  }
  // Pseudo-data dots
  for (let r = 8; r < cells - 1; r++) for (let c = 8; c < cells - 1; c++) {
    if ((r * 7 + c * 13) % 3 === 0) filled.add(`${r},${c}`);
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-2">
        {Array.from(filled).map(key => {
          const [r, c] = key.split(',').map(Number);
          return <rect key={key} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#000" />;
        })}
      </svg>
      {label && <p className="text-xs text-gray-500">{label}</p>}
    </div>
  );
}

const BASE_SLIDES: SlideItem[] = [
  { id: 'hero', title: 'GRT Industrial Cleaning', subtitle: '杰瑞德自动化 · Global Reach Technology', content: 'hero' },
  { id: 'stats', title: 'By The Numbers', subtitle: 'Our Global Impact', content: 'stats' },
  { id: 'pipeline', title: 'Project Pipeline', subtitle: 'Active Programs Worldwide', content: 'pipeline' },
  { id: 'tech', title: 'Core Technologies', subtitle: 'Ultrasonic · Spray · Vacuum · Robotics', content: 'tech' },
  { id: 'sustainability', title: 'Sustainability Commitment', subtitle: 'Carbon Neutral by 2030', content: 'sustainability' },
  { id: 'qrcode', title: 'Digital Showcase', subtitle: 'Explore Our Solutions', content: 'qrcode' },
  { id: 'community', title: 'Join Our Technical Community', subtitle: 'Connect With GRT Engineers', content: 'community' },
];

export default function ExpoKiosk() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [industryIdx, setIndustryIdx] = useState(0);
  const { preset, isActive } = useSandboxStore();
  const primaryColor = isActive ? preset.theme.primaryColor : '#3b82f6';
  const project = (sandboxData.projects as any[])[0];
  const [visitorCount] = useState(() => Math.floor(Math.random() * 401) + 100);

  // CMS content blocks
  const { data: cmsData } = trpc.targetedShowcase.contentBlock.list.useQuery(
    { blockType: 'exhibit_detail', isPublished: true },
    { refetchInterval: 60000, retry: 1 }
  );

  // Build final slide list: base slides + CMS exhibit slides
  const slides = useMemo(() => {
    const cmsSlides: SlideItem[] = (cmsData?.items ?? []).map((block: any, i: number) => ({
      id: `cms-${block.id ?? i}`,
      title: block.title ?? `Exhibit ${i + 1}`,
      subtitle: block.subtitle ?? 'Featured Exhibit',
      content: 'cms',
      meta: block.content ?? {},
    }));
    return [...BASE_SLIDES, ...cmsSlides];
  }, [cmsData]);

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 600);
    }, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Industry badge rotation
  useEffect(() => {
    const timer = setInterval(() => setIndustryIdx(prev => (prev + 1) % INDUSTRIES.length), INDUSTRY_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // Hide cursor and scrollbars
  useEffect(() => {
    document.body.style.cursor = 'none';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.cursor = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const slide = slides[currentSlide];

  const renderSlideContent = () => {
    switch (slide.content) {
      case 'hero':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30" style={{ transform: 'perspective(800px) rotateY(-5deg) rotateX(5deg)' }}>
              <span className="text-white text-6xl font-black">G</span>
            </div>
            <h1 className="text-6xl font-black text-white mb-4">GRT SYSTEM</h1>
            <p className="text-xl text-gray-400">非标自动化 · 工业清洗解决方案</p>
            <p className="text-sm text-gray-600 mt-2">Industrial Cleaning & Automation Solutions</p>
          </div>
        );
      case 'stats':
        return (
          <div className="grid grid-cols-4 gap-8 px-20">
            {[
              { value: '26', label: 'Active Projects', icon: '🏗️' },
              { value: '96', label: 'Team Members', icon: '👥' },
              { value: '¥121M', label: 'Annual Revenue', icon: '📊' },
              { value: '97%', label: 'Quality Score', icon: '✅' },
            ].map(stat => (
              <div key={stat.label} className="text-center" style={{ transform: 'perspective(600px) rotateX(2deg)' }}>
                <div className="text-5xl mb-4">{stat.icon}</div>
                <p className="text-5xl font-black text-white mb-2">{stat.value}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        );
      case 'pipeline':
        return (
          <div className="px-16">
            <div className="flex items-center justify-between gap-2">
              {project.pipeline.slice(0, 10).map((node: any, idx: number) => (
                <div key={node.id} className="flex-1 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                    node.status === 'completed' ? 'bg-blue-500 text-white' :
                    node.status === 'in_progress' ? 'bg-cyan-500 text-white ring-4 ring-cyan-500/30 scale-110' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {node.status === 'completed' ? '✓' : idx}
                  </div>
                  <p className="text-xs text-gray-400 font-bold">{node.id}</p>
                  <p className="text-[10px] text-gray-600">{node.nameZh}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'tech':
        return (
          <div className="grid grid-cols-2 gap-8 px-20">
            {[
              { name: 'Ultrasonic Cleaning', nameZh: '超声波清洗', desc: 'Multi-frequency cavitation for precision parts', icon: '🔊' },
              { name: 'High-Pressure Deburring', nameZh: '高压去毛刺', desc: 'Up to 1000 bar targeted cleaning', icon: '💧' },
              { name: 'Vacuum Drying', nameZh: '真空干燥', desc: 'Residue-free surface preparation', icon: '🌀' },
              { name: 'Robot Integration', nameZh: '机器人集成', desc: 'KUKA/FANUC/ABB universal adapter', icon: '🤖' },
            ].map(tech => (
              <div key={tech.name} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8" style={{ transform: 'perspective(800px) rotateY(-2deg)' }}>
                <span className="text-4xl">{tech.icon}</span>
                <h3 className="text-xl font-bold text-white mt-4">{tech.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{tech.nameZh}</p>
                <p className="text-xs text-gray-600 mt-3">{tech.desc}</p>
              </div>
            ))}
          </div>
        );
      case 'sustainability':
        return (
          <div className="text-center px-20">
            <div className="text-8xl mb-6">🌍</div>
            <h2 className="text-4xl font-black text-white mb-4">Carbon Neutral by 2030</h2>
            <div className="flex justify-center gap-16 mt-8">
              {[
                { value: '-30%', label: 'CO₂ Reduction' },
                { value: '280kL', label: 'Water Saved' },
                { value: '80MWh', label: 'Energy Saved' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-4xl font-black text-emerald-400">{item.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'qrcode':
        return (
          <div className="flex flex-col items-center justify-center gap-8">
            <QRPlaceholder size={220} />
            <p className="text-lg text-gray-300">Scan to explore our digital showcase</p>
            <p className="text-sm text-gray-600 font-mono">{QR_LINK}</p>
          </div>
        );
      case 'community':
        return (
          <div className="px-16">
            <p className="text-center text-gray-400 mb-10">Scan your preferred platform to join</p>
            <div className="grid grid-cols-3 gap-10 max-w-3xl mx-auto">
              {[
                { name: 'WeChat', nameZh: '微信群', color: 'from-green-500 to-green-600', borderColor: 'border-green-500/20' },
                { name: 'WeCom', nameZh: '企业微信', color: 'from-blue-500 to-blue-600', borderColor: 'border-blue-500/20' },
                { name: 'Telegram', nameZh: 'Telegram', color: 'from-violet-500 to-blue-500', borderColor: 'border-violet-500/20' },
              ].map(ch => (
                <div key={ch.name} className={`flex flex-col items-center bg-white/[0.03] border ${ch.borderColor} rounded-2xl p-8`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center mb-4`}>
                    <span className="text-white text-xl font-black">{ch.name[0]}</span>
                  </div>
                  <p className="text-white font-bold mb-1">{ch.name}</p>
                  <p className="text-xs text-gray-500 mb-4">{ch.nameZh}</p>
                  <QRPlaceholder size={100} />
                </div>
              ))}
            </div>
          </div>
        );
      case 'cms':
        return (
          <div className="flex flex-col items-center justify-center px-20 text-center">
            {slide.meta?.description && (
              <p className="text-lg text-gray-300 max-w-2xl mb-6">{slide.meta.description}</p>
            )}
            {slide.meta?.highlights && Array.isArray(slide.meta.highlights) && (
              <div className="grid grid-cols-3 gap-6 mt-4">
                {slide.meta.highlights.map((h: string, i: number) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6">
                    <p className="text-white text-sm">{h}</p>
                  </div>
                ))}
              </div>
            )}
            {slide.meta?.imageUrl && (
              <img src={slide.meta.imageUrl} alt="" className="max-h-48 rounded-xl mt-6 opacity-80" />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ cursor: 'none' }}>
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }} />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02]" style={{ filter: 'blur(80px)' }} />
      </div>

      {/* Industry badge — top right */}
      <div className="absolute top-6 right-6 z-30">
        <div className="px-4 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full backdrop-blur-sm">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{INDUSTRIES[industryIdx]}</span>
        </div>
      </div>

      {/* Visitor counter — bottom left */}
      <div className="absolute bottom-6 left-6 z-30">
        <div className="px-3 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full">
          <span className="text-[10px] font-mono text-gray-500">Visitors today: {visitorCount}</span>
        </div>
      </div>

      {/* Slide content */}
      <div className={`relative z-10 h-full flex flex-col items-center justify-center transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="text-center mb-12">
          <h2 className="text-sm font-mono text-gray-600 uppercase tracking-[0.4em] mb-2">{slide.subtitle}</h2>
          <h1 className="text-3xl font-black text-white">{slide.title}</h1>
        </div>
        <div className="w-full max-w-[1200px]">
          {renderSlideContent()}
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, idx) => (
          <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-blue-500' : 'w-2 bg-gray-700'}`} />
        ))}
      </div>

      {/* Timer bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 z-20">
        <div className="h-full bg-blue-500/50" style={{ animation: `timer ${ROTATION_INTERVAL}ms linear infinite` }} />
      </div>

      {/* Floating nav — bottom right */}
      <FloatingNav />

      <style>{`
        @keyframes timer { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );
}
