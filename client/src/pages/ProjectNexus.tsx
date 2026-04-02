/**
 * GRT Project Nexus — 项目核心看板
 * 蓝白工程风格，严格遵循截图复刻
 *
 * 数据源: mock_sandbox_data.json (沙盘模式一键替换)
 * 路由: /project-nexus
 */

import React, { useState, useMemo, useEffect } from 'react';
import sandboxData from '../data/mock_sandbox_data.json';
import { SmartCoBrandHeader } from '../components/SmartCoBrandHeader';
import { useSandboxStore, applySandboxCSSVars } from '../stores/sandboxStore';
import FloatingNav from '@/components/FloatingNav';

// ─── Types ────────────────────────────────────────────
interface KPIs {
  onTimeRate: number;
  qualityScore: number;
  openActions: number;
  budgetUtilization: number;
  riskLevel: string;
}

interface PipelineNode {
  id: string;
  name: string;
  nameZh: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  date: string;
  owner: string;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  user: string;
  timestamp: string;
  icon: string;
}

interface QuickAccessItem {
  id: string;
  label: string;
  labelZh: string;
  icon: string;
  path: string;
  badge: string;
}

interface Project {
  id: string;
  name: string;
  customer: string;
  currentPhase: string;
  kpis: KPIs;
  pipeline: PipelineNode[];
  recentActivity: Activity[];
  quickAccess: QuickAccessItem[];
  projectManager: string;
  buName: string;
  startDate: string;
  targetDate: string;
}

// ─── Icon Map ─────────────────────────────────────────
const ACTIVITY_ICONS: Record<string, string> = {
  milestone: '🏁', procurement: '📦', design: '📐', quality: '✅',
  oa: '📋', bom: '🔩', risk: '⚠️', meeting: '🤝',
  design_started: '📐', kickoff: '🚀', phase_advanced: '🏁',
  po_created: '📦', design_approved: '📐', quality_check: '✅',
  oa_approved: '📋', bom_updated: '🔩', risk_flagged: '⚠️',
};

const QA_ICONS: Record<string, string> = {
  clipboard: '📋', folder: '📁', shield: '🛡️', truck: '🚛',
  dollar: '💰', users: '👥', file: '📄', alert: '⚠️',
};

// ─── Pipeline Component ───────────────────────────────
function ProjectPipeline({ nodes, currentPhase }: { nodes: PipelineNode[]; currentPhase: string }) {
  const currentIdx = nodes.findIndex(n => n.id === currentPhase);

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-0 min-w-[900px] px-2">
          {nodes.map((node, idx) => {
            const isCompleted = node.status === 'completed';
            const isCurrent = node.id === currentPhase;
            const isUpcoming = node.status === 'upcoming';

            return (
              <div key={node.id} className="flex items-start flex-1 min-w-[64px]">
                {/* Node */}
                <div className="flex flex-col items-center relative group">
                  {/* Connector line (before node) */}
                  {idx > 0 && (
                    <div
                      className={`absolute top-[14px] right-1/2 h-[3px] w-full -translate-x-0 ${
                        isCompleted || isCurrent ? 'bg-blue-500' : 'bg-gray-700'
                      }`}
                      style={{ width: 'calc(100% + 0px)', right: '50%' }}
                    />
                  )}

                  {/* Node circle */}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300 ${
                      isCurrent
                        ? 'bg-blue-500 border-blue-300 text-white shadow-lg shadow-blue-500/40 scale-125 ring-4 ring-blue-500/20'
                        : isCompleted
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '✓' : idx}
                  </div>

                  {/* Label */}
                  <div className={`mt-2 text-center ${isCurrent ? 'scale-105' : ''}`}>
                    <p className={`text-[10px] font-bold ${
                      isCurrent ? 'text-blue-300' : isCompleted ? 'text-blue-400' : 'text-gray-600'
                    }`}>
                      {node.id}
                    </p>
                    <p className={`text-[9px] mt-0.5 ${
                      isCurrent ? 'text-white font-medium' : isCompleted ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      {node.nameZh}
                    </p>
                    <p className={`text-[8px] mt-0.5 ${
                      isCurrent ? 'text-blue-300' : 'text-gray-700'
                    }`}>
                      {node.date?.substring(5)}
                    </p>
                  </div>

                  {/* Current phase indicator */}
                  {isCurrent && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="bg-blue-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                        CURRENT
                      </span>
                    </div>
                  )}

                  {/* Hover tooltip */}
                  <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                      <p className="text-white text-[10px] font-bold">{node.name}</p>
                      <p className="text-gray-400 text-[9px]">Owner: {node.owner}</p>
                      <p className="text-gray-500 text-[9px]">{node.date}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
          style={{ width: `${((currentIdx + 0.5) / nodes.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── KPI Card Component ───────────────────────────────
function KPICard({ label, value, unit, color, subtitle }: {
  label: string; value: string | number; unit?: string; color: string; subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-300',
    green: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-300',
    amber: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-300',
    purple: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-300',
  };
  const valueColorMap: Record<string, string> = {
    blue: 'text-blue-100', green: 'text-emerald-100', amber: 'text-amber-100', purple: 'text-purple-100',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4 flex-1 min-w-[160px]`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${colorMap[color].split(' ').pop()}`}>
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-3xl font-black ${valueColorMap[color]}`}>{value}</span>
        {unit && <span className={`text-sm font-medium ${colorMap[color].split(' ').pop()}`}>{unit}</span>}
      </div>
      {subtitle && <p className="text-[10px] text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export default function ProjectNexus() {
  const projects: Project[] = sandboxData.projects as Project[];
  const currentUser = sandboxData.currentUser;
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id || '');

  const project = useMemo(
    () => projects.find(p => p.id === activeProjectId) || projects[0],
    [activeProjectId, projects]
  );

  if (!project) return <div className="min-h-screen bg-[#0a1628] text-white p-8">No project data</div>;

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* ═══ TOP HEADER — SmartCoBrandHeader ═══ */}
      <SmartCoBrandHeader
        projectTitle="WIN-WIN"
        subtitle="PROJECT NEXUS"
        tabs={projects.map(p => ({ id: p.id, label: p.id }))}
        activeTab={activeProjectId}
        onTabChange={setActiveProjectId}
        rightContent={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-300">Welcome, <span className="text-white font-semibold">{currentUser.name}</span></p>
              <p className="text-[10px] text-gray-600">{project.buName} · {project.projectManager}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{currentUser.name.charAt(0)}</span>
            </div>
          </div>
        }
      />

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Project Title Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{project.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {project.customer} · {project.startDate} → {project.targetDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
              project.kpis.riskLevel === 'low' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              project.kpis.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {project.kpis.riskLevel} risk
            </span>
          </div>
        </div>

        {/* ═══ KPI CARDS ═══ */}
        <div className="flex gap-4">
          <KPICard
            label="On-Time Rate"
            value={project.kpis.onTimeRate}
            unit="%"
            color="blue"
            subtitle="Schedule performance"
          />
          <KPICard
            label="Quality Score"
            value={project.kpis.qualityScore}
            unit="%"
            color="green"
            subtitle="IQC + Process quality"
          />
          <KPICard
            label="Open Actions"
            value={project.kpis.openActions}
            color="amber"
            subtitle="Tasks requiring attention"
          />
          <KPICard
            label="Current Phase"
            value={project.currentPhase}
            color="purple"
            subtitle={project.pipeline.find(n => n.id === project.currentPhase)?.nameZh}
          />
        </div>

        {/* ═══ PROJECT PIPELINE ═══ */}
        <div className="bg-[#0d1f3c]/60 border border-blue-900/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Project Pipeline
            </h3>
            <span className="text-[10px] text-gray-600 font-mono">
              {project.pipeline.filter(n => n.status === 'completed').length} / {project.pipeline.length} phases completed
            </span>
          </div>
          <ProjectPipeline nodes={project.pipeline} currentPhase={project.currentPhase} />
        </div>

        {/* ═══ BOTTOM: ACTIVITY + QUICK ACCESS ═══ */}
        <div className="grid grid-cols-5 gap-6">
          {/* Recent Activity (3 cols) */}
          <div className="col-span-3 bg-[#0d1f3c]/60 border border-blue-900/30 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {project.recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#0a1628]/60 border border-blue-900/20 hover:border-blue-700/30 transition-colors"
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS[activity.icon] || '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-snug">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-blue-400 font-medium">{activity.user}</span>
                      <span className="text-[10px] text-gray-700">·</span>
                      <span className="text-[10px] text-gray-600">{timeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access (2 cols) */}
          <div className="col-span-2 bg-[#0d1f3c]/60 border border-blue-900/30 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {project.quickAccess.map(item => (
                <button
                  key={item.id}
                  onClick={() => window.location.href = item.path}
                  className="group bg-[#0a1628]/60 border border-blue-900/20 rounded-lg p-3 text-left hover:border-blue-600/40 hover:bg-blue-900/10 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{QA_ICONS[item.icon] || '📌'}</span>
                    <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                    {item.labelZh}
                  </p>
                  <p className="text-[10px] text-gray-600">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <FloatingNav />
    </div>
  );
}
