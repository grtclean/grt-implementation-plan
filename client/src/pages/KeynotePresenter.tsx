/**
 * UI 8 — Keynote Presenter (演讲台模式)
 * 键盘左右方向键切换Slide, Escape退出
 * Route: /keynote (STANDALONE)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSandboxStore } from '../stores/sandboxStore';
import sandboxData from '../data/mock_sandbox_data.json';
import FloatingNav from '@/components/FloatingNav';

interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  bigNumber?: string;
  bigLabel?: string;
  image?: string;
  layout: 'title' | 'bullets' | 'split' | 'bigstat' | 'quote';
}

const KEYNOTE_SLIDES: Slide[] = [
  {
    id: 's1', layout: 'title',
    title: 'GRT System 5.0',
    subtitle: 'Industrial Cleaning Redefined\n工业清洗，重新定义',
  },
  {
    id: 's2', layout: 'bigstat',
    title: 'Global Impact',
    bigNumber: '26', bigLabel: 'Active Projects Worldwide',
  },
  {
    id: 's3', layout: 'bullets',
    title: 'Why GRT?',
    subtitle: 'Our Competitive Advantage',
    bullets: [
      '非标定制能力 — Custom engineering for any geometry',
      '全流程数字化 — M0-M12 project lifecycle digitalization',
      'IATF 16949 合规 — Automotive quality standards built-in',
      '交付速度 — 30% faster than industry average',
      'AI辅助设计 — Agent-assisted BOM and SOP generation',
    ],
  },
  {
    id: 's4', layout: 'split',
    title: 'Digital Twin + AI Agent',
    subtitle: 'Real-time project visibility for our customers',
    bullets: [
      'Customer portal with milestone tracking',
      'AI-powered risk prediction',
      'Automated quality assurance',
      'Knowledge graph-driven SOP matching',
    ],
  },
  {
    id: 's5', layout: 'bigstat',
    title: 'Quality Excellence',
    bigNumber: '97.2%', bigLabel: 'Average Quality Score Across All Projects',
  },
  {
    id: 's6', layout: 'bullets',
    title: 'Technology Stack',
    subtitle: 'Industrial-Grade Digital Platform',
    bullets: [
      'Ultrasonic · Spray · Vacuum · Robotic Cleaning',
      'M0-M12 Project Lifecycle Engine',
      'ERP Integration (TianSi + Kingdee)',
      'AI Agent Fleet (L1-L4 Automation)',
      'Industrial Knowledge Graph + RAG',
      'Real-time CEO Dashboard',
    ],
  },
  {
    id: 's7', layout: 'quote',
    title: '"Win-Win Partnership"',
    subtitle: '— GRT 杰瑞德自动化\n\nWe don\'t just build machines.\nWe build partnerships that last.',
  },
];

export default function KeynotePresenter() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const { preset, isActive } = useSandboxStore();
  const primaryColor = isActive ? preset.theme.primaryColor : '#3b82f6';

  const goNext = useCallback(() => {
    if (currentIdx < KEYNOTE_SLIDES.length - 1) {
      setDirection('right');
      setTimeout(() => { setCurrentIdx(prev => prev + 1); setDirection(null); }, 200);
    }
  }, [currentIdx]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setDirection('left');
      setTimeout(() => { setCurrentIdx(prev => prev - 1); setDirection(null); }, 200);
    }
  }, [currentIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') window.history.back();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  const slide = KEYNOTE_SLIDES[currentIdx];

  const renderSlide = () => {
    switch (slide.layout) {
      case 'title':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-7xl font-black text-white mb-6">{slide.title}</h1>
            <p className="text-xl text-gray-400 whitespace-pre-line">{slide.subtitle}</p>
          </div>
        );
      case 'bigstat':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">{slide.title}</p>
            <p className="text-[12rem] font-black leading-none" style={{ color: primaryColor }}>{slide.bigNumber}</p>
            <p className="text-2xl text-gray-300 mt-4">{slide.bigLabel}</p>
          </div>
        );
      case 'bullets':
        return (
          <div className="flex flex-col justify-center h-full px-24">
            <h2 className="text-4xl font-black text-white mb-2">{slide.title}</h2>
            {slide.subtitle && <p className="text-lg text-gray-500 mb-8">{slide.subtitle}</p>}
            <div className="space-y-4">
              {slide.bullets?.map((b, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5" style={{ backgroundColor: primaryColor }}>
                    {i + 1}
                  </div>
                  <p className="text-xl text-gray-200">{b}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'split':
        return (
          <div className="flex h-full">
            <div className="flex-1 flex flex-col justify-center px-16">
              <h2 className="text-4xl font-black text-white mb-2">{slide.title}</h2>
              {slide.subtitle && <p className="text-lg text-gray-500 mb-8">{slide.subtitle}</p>}
              <div className="space-y-3">
                {slide.bullets?.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span style={{ color: primaryColor }}>→</span>
                    <p className="text-lg text-gray-300">{b}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20 flex items-center justify-center" style={{ transform: 'perspective(800px) rotateY(-10deg) rotateX(5deg)' }}>
                <span className="text-8xl">🤖</span>
              </div>
            </div>
          </div>
        );
      case 'quote':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-24">
            <h2 className="text-5xl font-black text-white mb-8 italic">{slide.title}</h2>
            <p className="text-xl text-gray-400 whitespace-pre-line leading-relaxed">{slide.subtitle}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" onClick={goNext}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full opacity-[0.02]" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }} />
      </div>

      {/* Slide content */}
      <div className={`relative z-10 h-full transition-all duration-200 ${
        direction === 'right' ? 'opacity-0 -translate-x-8' :
        direction === 'left' ? 'opacity-0 translate-x-8' :
        'opacity-100 translate-x-0'
      }`}>
        {renderSlide()}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-between px-8">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {KEYNOTE_SLIDES.map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full transition-all ${
              idx === currentIdx ? 'w-6' : 'w-1.5'
            }`} style={{ backgroundColor: idx === currentIdx ? primaryColor : '#333' }} />
          ))}
        </div>
        {/* Slide counter */}
        <p className="text-xs text-gray-700 font-mono">
          {currentIdx + 1} / {KEYNOTE_SLIDES.length}
          <span className="ml-4 text-gray-800">← → to navigate · ESC to exit</span>
        </p>
      </div>
      <FloatingNav />
    </div>
  );
}
