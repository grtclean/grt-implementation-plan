/**
 * SmartCoBrandHeader — 智能联名Header
 *
 * Features:
 * 1. 接收 clientLogoUrl + themeColor 动态渲染
 * 2. Ctrl+V 剪贴板粘贴图片 → Base64 秒级换Logo
 * 3. 连接 Zustand sandboxStore 全局响应AI沙盘指令
 * 4. 支持 GRT Logo + 客户 Logo 双联名
 * 5. 右键Logo区域显示"重置Logo"选项
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSandboxStore, applySandboxCSSVars } from '../stores/sandboxStore';

interface SmartCoBrandHeaderProps {
  /** 项目名称 */
  projectTitle?: string;
  /** 子标题 */
  subtitle?: string;
  /** 右侧自定义内容 */
  rightContent?: React.ReactNode;
  /** 项目Tab列表 */
  tabs?: Array<{ id: string; label: string }>;
  /** 当前激活Tab */
  activeTab?: string;
  /** Tab切换回调 */
  onTabChange?: (tabId: string) => void;
  /** 客户Logo URL (外部传入，优先级低于粘贴) */
  clientLogoUrl?: string;
  /** 主题色 (外部传入，优先级低于sandbox指令) */
  themeColor?: string;
}

export function SmartCoBrandHeader({
  projectTitle = 'GRT WIN-WIN',
  subtitle = 'PROJECT NEXUS',
  rightContent,
  tabs = [],
  activeTab,
  onTabChange,
  clientLogoUrl: propClientLogo,
  themeColor: propThemeColor,
}: SmartCoBrandHeaderProps) {
  const {
    preset, isActive, setClientLogo, setGrtLogo, resetSandbox, getEffectiveTheme,
  } = useSandboxStore();

  const [pasteTarget, setPasteTarget] = useState<'client' | 'grt'>('client');
  const [showPasteHint, setShowPasteHint] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number } | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Effective values: sandbox overrides > props > defaults
  const effectiveLogo = preset.clientLogoBase64 || preset.clientLogoUrl || propClientLogo || null;
  const effectiveGrtLogo = preset.grtLogoUrl || null;
  const theme = getEffectiveTheme();
  const primaryColor = theme.primaryColor || propThemeColor || '#1e40af';

  // Apply CSS vars whenever theme changes
  useEffect(() => {
    if (isActive) applySandboxCSSVars(theme);
  }, [theme, isActive]);

  // ─── Clipboard Paste Handler ─────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e as ClipboardEvent).clipboardData?.items || (e as React.ClipboardEvent).clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          if (base64) {
            if (pasteTarget === 'grt') {
              setGrtLogo(base64);
            } else {
              setClientLogo(base64);
            }
            setShowPasteHint(false);
          }
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, [pasteTarget, setClientLogo, setGrtLogo]);

  // Global paste listener
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      // Only intercept if header is focused/hovered
      if (headerRef.current?.matches(':hover')) {
        handlePaste(e);
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [handlePaste]);

  // Context menu for logo management
  const handleContextMenu = useCallback((e: React.MouseEvent, target: 'client' | 'grt') => {
    e.preventDefault();
    setPasteTarget(target);
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setShowContextMenu(null), []);

  useEffect(() => {
    if (showContextMenu) {
      const handler = () => closeContextMenu();
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [showContextMenu, closeContextMenu]);

  // ─── Render ──────────────────────────────────────────
  return (
    <header
      ref={headerRef}
      className="relative border-b transition-colors duration-500"
      style={{
        backgroundColor: isActive ? theme.headerBg : '#0d1f3c',
        borderColor: `${primaryColor}33`,
      }}
      onPaste={handlePaste}
    >
      <div className="px-6 py-3 flex items-center justify-between">
        {/* ─── Left: Dual Logo + Title ─── */}
        <div className="flex items-center gap-4">
          {/* GRT Logo */}
          <div
            className="relative group cursor-pointer"
            onContextMenu={(e) => handleContextMenu(e, 'grt')}
            onClick={() => { setPasteTarget('grt'); setShowPasteHint(true); setTimeout(() => setShowPasteHint(false), 3000); }}
          >
            {effectiveGrtLogo ? (
              <img src={effectiveGrtLogo} alt="GRT" className="w-9 h-9 rounded-lg object-contain bg-white/10 p-0.5" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg transition-colors"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${theme.accentColor})` }}
              >
                <span className="text-white font-black text-sm">G</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-lg border-2 border-dashed border-transparent group-hover:border-blue-400/50 transition-colors" />
          </div>

          <span className="text-gray-600 text-lg select-none">×</span>

          {/* Client Logo */}
          <div
            className="relative group cursor-pointer"
            onContextMenu={(e) => handleContextMenu(e, 'client')}
            onClick={() => { setPasteTarget('client'); setShowPasteHint(true); setTimeout(() => setShowPasteHint(false), 3000); }}
          >
            {effectiveLogo ? (
              <img src={effectiveLogo} alt="Client" className="w-9 h-9 rounded-lg object-contain bg-white/10 p-0.5" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                <span className="text-gray-500 text-[9px] font-mono">LOGO</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-lg border-2 border-dashed border-transparent group-hover:border-purple-400/50 transition-colors" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-lg font-black tracking-tight">
              <span style={{ color: theme.accentColor }}>{preset.client !== 'GRT' ? preset.client : 'GRT'}</span>{' '}
              <span style={{ color: theme.textPrimary }}>{projectTitle.replace('GRT ', '')}</span>
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-mono tracking-widest" style={{ color: theme.textSecondary }}>
                {subtitle}
              </p>
              {isActive && (
                <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/30 font-mono">
                  SANDBOX
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Center: Project Tabs ─── */}
        {tabs.length > 0 && (
          <div
            className="flex items-center gap-1 rounded-lg p-1 border"
            style={{
              backgroundColor: `${theme.headerBg === '#0d1f3c' ? '#0a1628' : theme.headerBg}`,
              borderColor: `${primaryColor}22`,
            }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={tab.id === activeTab ? {
                  backgroundColor: primaryColor,
                  color: '#fff',
                  boxShadow: `0 4px 14px ${primaryColor}40`,
                } : {
                  color: theme.textSecondary,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ─── Right: Custom or Default ─── */}
        <div className="flex items-center gap-3">
          {rightContent}
          {!rightContent && (
            <div className="text-right">
              <p className="text-sm" style={{ color: theme.textSecondary }}>
                Sandbox: <span className="font-semibold" style={{ color: theme.textPrimary }}>
                  {isActive ? preset.client : 'OFF'}
                </span>
              </p>
              {isActive && preset.presetROI !== '—' && (
                <p className="text-[10px]" style={{ color: theme.accentColor }}>
                  Target ROI: {preset.presetROI}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Paste Hint ─── */}
      {showPasteHint && (
        <div className="absolute top-full left-6 mt-1 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-blue-500/30 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-blue-300 text-[11px]">
              📋 按 <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-white font-mono mx-0.5">Ctrl+V</kbd> 粘贴图片替换
              <span className="font-bold text-white ml-1">
                {pasteTarget === 'grt' ? 'GRT Logo' : '客户 Logo'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Context Menu ─── */}
      {showContextMenu && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[180px]"
          style={{ left: showContextMenu.x, top: showContextMenu.y }}
        >
          <button
            onClick={() => { setPasteTarget(pasteTarget); setShowPasteHint(true); closeContextMenu(); }}
            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
          >
            📋 粘贴新Logo (Ctrl+V)
          </button>
          <button
            onClick={() => {
              if (pasteTarget === 'grt') setGrtLogo('');
              else setClientLogo('');
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
          >
            🗑️ 重置Logo
          </button>
          <div className="border-t border-gray-800 my-1" />
          <button
            onClick={() => { resetSandbox(); closeContextMenu(); }}
            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors flex items-center gap-2"
          >
            ↩️ 重置全部沙盘
          </button>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </header>
  );
}
