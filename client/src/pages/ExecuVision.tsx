/**
 * UI 5 — ExecuVision (高管宏观视野)
 * 强制暗黑模式，隐藏侧边栏，三个巨大宏观图表
 * Route: /exec-vision (STANDALONE)
 */

import React, { useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSandboxStore } from '../stores/sandboxStore';
import sandboxData from '../data/mock_sandbox_data.json';
import FloatingNav from '@/components/FloatingNav';

// ROI Growth data (quarterly)
const ROI_DATA = [
  { quarter: 'Q1 2025', roi: 8.2, target: 10, revenue: 18.5 },
  { quarter: 'Q2 2025', roi: 11.5, target: 10, revenue: 22.3 },
  { quarter: 'Q3 2025', roi: 14.1, target: 12, revenue: 25.8 },
  { quarter: 'Q4 2025', roi: 12.8, target: 12, revenue: 24.1 },
  { quarter: 'Q1 2026', roi: 15.3, target: 14, revenue: 28.7 },
  { quarter: 'Q2 2026', roi: 18.2, target: 14, revenue: 32.4 },
  { quarter: 'Q3 2026', roi: 19.5, target: 16, revenue: 35.1 },
  { quarter: 'Q4 2026', roi: 22.0, target: 16, revenue: 38.0 },
];

// Carbon/Sustainability data
const CARBON_DATA = [
  { month: 'Jan', emission: 42, reduction: 8, waterSaved: 120, energySaved: 35 },
  { month: 'Feb', emission: 38, reduction: 12, waterSaved: 145, energySaved: 42 },
  { month: 'Mar', emission: 35, reduction: 15, waterSaved: 168, energySaved: 48 },
  { month: 'Apr', emission: 31, reduction: 19, waterSaved: 190, energySaved: 55 },
  { month: 'May', emission: 28, reduction: 22, waterSaved: 215, energySaved: 62 },
  { month: 'Jun', emission: 25, reduction: 25, waterSaved: 240, energySaved: 68 },
  { month: 'Jul', emission: 22, reduction: 28, waterSaved: 260, energySaved: 75 },
  { month: 'Aug', emission: 20, reduction: 30, waterSaved: 280, energySaved: 80 },
];

// Global operations data
const OPS_DATA = [
  { region: 'China', projects: 12, revenue: 48, onTime: 92, quality: 97 },
  { region: 'Europe', projects: 5, revenue: 32, onTime: 88, quality: 96 },
  { region: 'Americas', projects: 3, revenue: 18, onTime: 95, quality: 98 },
  { region: 'SEA', projects: 4, revenue: 15, onTime: 90, quality: 94 },
  { region: 'India', projects: 2, revenue: 8, onTime: 85, quality: 93 },
];

export default function ExecuVision() {
  const { preset, isActive } = useSandboxStore();
  const primaryColor = isActive ? preset.theme.primaryColor : '#3b82f6';
  const accentColor = isActive ? preset.theme.accentColor : '#06b6d4';

  // Force dark mode + hide cursor after 5s idle
  useEffect(() => {
    document.body.style.backgroundColor = '#000';
    document.body.style.cursor = 'default';
    let timer: ReturnType<typeof setTimeout>;
    const resetCursor = () => {
      document.body.style.cursor = 'default';
      clearTimeout(timer);
      timer = setTimeout(() => { document.body.style.cursor = 'none'; }, 5000);
    };
    document.addEventListener('mousemove', resetCursor);
    return () => {
      document.removeEventListener('mousemove', resetCursor);
      document.body.style.cursor = 'default';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const kpiCards = [
    { label: 'TOTAL REVENUE', value: '¥121M', delta: '+18.2%', positive: true },
    { label: 'ACTIVE PROJECTS', value: '26', delta: '+4 QoQ', positive: true },
    { label: 'GLOBAL ON-TIME', value: '92%', delta: '+3pp', positive: true },
    { label: 'CARBON REDUCTION', value: '-30%', delta: 'vs 2024', positive: true },
    { label: 'AVG QUALITY', value: '97.2%', delta: 'IATF AA', positive: true },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden select-none">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              <span style={{ color: accentColor }}>EXECU</span>
              <span className="text-white">VISION</span>
            </h1>
            <p className="text-gray-600 text-xs font-mono mt-1 tracking-widest">
              {isActive ? `${preset.client} STRATEGIC OVERVIEW` : 'GRT GLOBAL STRATEGIC OVERVIEW'} · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
          </div>
          {isActive && (
            <span className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-[10px] font-mono">
              SANDBOX: {preset.client} · ROI {preset.presetROI}
            </span>
          )}
        </div>

        {/* KPI Strip */}
        <div className="flex gap-4 mb-8">
          {kpiCards.map(kpi => (
            <div key={kpi.label} className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm">
              <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-black text-white mt-1">{kpi.value}</p>
              <p className={`text-xs mt-1 ${kpi.positive ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.delta}</p>
            </div>
          ))}
        </div>

        {/* Three Giant Charts */}
        <div className="grid grid-cols-3 gap-6">
          {/* Chart 1: ROI Growth */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">ROI Growth Trajectory</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ROI_DATA}>
                  <defs>
                    <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="quarter" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="roi" stroke={primaryColor} fill="url(#roiGrad)" strokeWidth={2} name="ROI %" />
                  <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Target" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Carbon Reduction */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Sustainability Impact</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CARBON_DATA}>
                  <defs>
                    <linearGradient id="emissionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="reductionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="emission" stroke="#ef4444" fill="url(#emissionGrad)" strokeWidth={2} name="CO₂ Emission (t)" />
                  <Area type="monotone" dataKey="reduction" stroke="#10b981" fill="url(#reductionGrad)" strokeWidth={2} name="Reduction (t)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Global Operations */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Global Operations</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={OPS_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} />
                  <YAxis dataKey="region" type="category" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill={primaryColor} radius={[0, 4, 4, 0]} name="Revenue (¥M)" />
                  <Bar dataKey="projects" fill={accentColor} radius={[0, 4, 4, 0]} name="Projects" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <FloatingNav />
    </div>
  );
}
