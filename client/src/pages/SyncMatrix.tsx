/**
 * UI 4 — Sync Matrix (M0-M12 垂直时间轴看板)
 * 点击节点 → 右侧滑出抽屉展示会议纪要和富文本
 * Route: /sync-matrix (STANDALONE)
 */

import React, { useState } from 'react';
import sandboxData from '../data/mock_sandbox_data.json';
import { useSandboxStore } from '../stores/sandboxStore';
import FloatingNav from '@/components/FloatingNav';

interface DrawerContent {
  phaseId: string;
  phaseName: string;
  phaseNameZh: string;
  owner: string;
  date: string;
  status: string;
  minutes: string;
  deliverables: string[];
  risks: string[];
}

// Mock meeting minutes per phase
const PHASE_DETAILS: Record<string, Omit<DrawerContent, 'phaseId' | 'phaseName' | 'phaseNameZh' | 'owner' | 'date' | 'status'>> = {
  TK0: {
    minutes: '## 商机评估会议\n\n**日期**: 2025-09-15\n**参会**: 戴晓燕, 杨勇, 倪亚东\n\n### 决议\n1. 客户需求确认: VW Wolfsburg 超声波清洗产线\n2. 预估合同金额 ¥3.2M\n3. 竞争对手分析: Dürr AG, Ecoclean\n4. **GRT核心优势**: 非标定制能力 + 交付速度\n\n### Action Items\n- [ ] 戴晓燕: 准备技术方案初稿\n- [ ] 杨勇: 历史案例整理 (3天)',
    deliverables: ['客户需求规格书', '竞争分析报告', '初步报价方案'],
    risks: ['竞争对手价格优势'],
  },
  TK3: {
    minutes: '## 项目立项会议\n\n**日期**: 2025-11-01\n**参会**: 杨勇, 洪香龙, 孙坚, 张洵, 金晓锋\n\n### 决议\n1. 项目经理: 杨勇 (GRT045)\n2. 目标交付: 2026-08-30\n3. 预算: ¥2.1M (物料) + ¥0.8M (工时)\n4. T1-T15工时池: 2,400h\n\n### 关键里程碑\n- M4 设计评审: 2025-12-15\n- M7 FAT: 2026-06-10\n- M12 交付: 2026-08-30',
    deliverables: ['项目章程', 'WBS分解', '预算审批单', '团队分工矩阵'],
    risks: ['关键物料交期 (真空泵 8周)', '电气设计资源紧张'],
  },
  TK6: {
    minutes: '## 制造启动会\n\n**日期**: 2026-03-18\n**参会**: 马林山, 吴卫成, 焦斌, 金晓锋\n\n### 当前状态\n- 物料到齐率: 94% (真空泵待到货 ETA 03-25)\n- 工装准备完成\n- 清洗槽体焊接完成\n\n### 本周计划\n1. 框架装配 (吴卫成, 焦斌)\n2. 管路预制 (沈龙翔)\n3. 电控柜布线 (李大鹏)\n\n### 质量要点\n- 焊缝检测 100% (金晓锋)\n- 尺寸公差 ±0.5mm',
    deliverables: ['装配进度报告', '质量检测记录', '物料消耗清单'],
    risks: ['真空泵延期可能影响调试节点', '焊接变形控制'],
  },
};

export default function SyncMatrix() {
  const project = (sandboxData.projects as any[])[0];
  const { preset, isActive } = useSandboxStore();
  const primaryColor = isActive ? preset.theme.primaryColor : '#3b82f6';
  const [selectedPhase, setSelectedPhase] = useState<DrawerContent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (node: any) => {
    const details = PHASE_DETAILS[node.id] || {
      minutes: `## ${node.nameZh} (${node.name})\n\n*会议纪要待录入*\n\n负责人: ${node.owner}\n计划日期: ${node.date}`,
      deliverables: ['待定义'],
      risks: ['待评估'],
    };
    setSelectedPhase({
      phaseId: node.id,
      phaseName: node.name,
      phaseNameZh: node.nameZh,
      owner: node.owner,
      date: node.date,
      status: node.status,
      ...details,
    });
    setDrawerOpen(true);
  };

  const statusColor = (s: string) =>
    s === 'completed' ? '#10b981' : s === 'in_progress' ? primaryColor : '#374151';
  const statusBg = (s: string) =>
    s === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30' : s === 'in_progress' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-800/50 border-gray-700/30';

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex">
      {/* ─── Left: Vertical Timeline ─── */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black mb-1">
            <span style={{ color: primaryColor }}>SYNC</span> MATRIX
          </h1>
          <p className="text-gray-600 text-xs font-mono mb-8">{project.id} · {project.name}</p>

          {/* Vertical Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500 via-blue-500/50 to-gray-800" />

            {project.pipeline.map((node: any, idx: number) => {
              const isCurrent = node.id === project.currentPhase;
              return (
                <div key={node.id} className="relative flex items-start gap-5 mb-1 group">
                  {/* Node dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all cursor-pointer
                        ${isCurrent ? 'scale-125 shadow-lg ring-4 ring-blue-500/20' : 'hover:scale-110'}
                      `}
                      style={{
                        backgroundColor: statusColor(node.status),
                        borderColor: isCurrent ? '#60a5fa' : statusColor(node.status),
                        color: '#fff',
                      }}
                      onClick={() => openDrawer(node)}
                    >
                      {node.status === 'completed' ? '✓' : idx}
                    </div>
                    {isCurrent && (
                      <div className="absolute -right-16 top-1/2 -translate-y-1/2">
                        <span className="bg-blue-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          NOW
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 border rounded-xl p-4 cursor-pointer transition-all mb-3 ${statusBg(node.status)}
                      ${isCurrent ? 'ring-1 ring-blue-500/30' : ''}
                      hover:border-blue-500/40 hover:bg-blue-900/10
                    `}
                    onClick={() => openDrawer(node)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500">{node.id}</span>
                        <h3 className={`text-sm font-bold ${isCurrent ? 'text-white' : node.status === 'completed' ? 'text-gray-300' : 'text-gray-500'}`}>
                          {node.nameZh} · {node.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-600">{node.date}</p>
                        <p className="text-[10px]" style={{ color: statusColor(node.status) }}>{node.owner}</p>
                      </div>
                    </div>
                    {PHASE_DETAILS[node.id] && (
                      <p className="text-[10px] text-gray-600 mt-2">
                        📝 {PHASE_DETAILS[node.id].deliverables.length} deliverables · {PHASE_DETAILS[node.id].risks.length} risks
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Right: Slide-out Drawer ─── */}
      <div
        className={`fixed top-0 right-0 h-full bg-[#0d1525] border-l border-blue-900/30 shadow-2xl shadow-black/50 transition-transform duration-300 z-50 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '480px' }}
      >
        {selectedPhase && (
          <div className="h-full flex flex-col">
            {/* Drawer header */}
            <div className="p-5 border-b border-blue-900/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">{selectedPhase.phaseId}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                    selectedPhase.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                    selectedPhase.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-gray-700/50 text-gray-500'
                  }`}>
                    {selectedPhase.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {selectedPhase.phaseNameZh} · {selectedPhase.phaseName}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedPhase.owner} · {selectedPhase.date}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Meeting minutes (rendered as styled text) */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">会议纪要 / Meeting Minutes</h3>
                <div className="bg-black/30 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-[12px]">
                  {selectedPhase.minutes}
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">交付物 / Deliverables</h3>
                <div className="space-y-2">
                  {selectedPhase.deliverables.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${
                        selectedPhase.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {selectedPhase.status === 'completed' ? '✓' : (i + 1)}
                      </span>
                      <span className="text-gray-300">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">风险 / Risks</h3>
                <div className="space-y-2">
                  {selectedPhase.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                      <span className="text-red-400 text-xs">⚠️</span>
                      <span className="text-red-200/80">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay when drawer open */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />
      )}
      <FloatingNav />
    </div>
  );
}
