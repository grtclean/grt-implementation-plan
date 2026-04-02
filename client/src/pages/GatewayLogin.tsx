/**
 * GRT Omni-Gateway — 统一登录入口
 * 暗黑科技风企业级登录页面
 *
 * Features:
 * - Dark sci-fi aesthetic with cyan/purple accent
 * - Animated circuit-board background
 * - Role preview after login
 * - Quick-access portals: VIP Client, Conference Guest
 * - GRT branding with industrial DNA
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGateway, resolveTargetRoute, mapToGatewayRole } from '../contexts/AuthGatewayContext';

// Quick-access portal cards
const PORTALS = [
  { id: 'vip', label: '客户门户', labelEn: 'VIP Client Portal', icon: '🏢', path: '/customer-portal', color: 'from-purple-600 to-indigo-800' },
  { id: 'guest', label: '会议访客', labelEn: 'Conference Guest', icon: '🎤', path: '/guest/showcase', color: 'from-teal-600 to-cyan-800' },
  { id: 'kiosk', label: '车间终端', labelEn: 'Shop Floor Kiosk', icon: '🏭', path: '/kiosk', color: 'from-orange-600 to-red-800' },
];

// Role display info
const ROLE_INFO: Record<string, { label: string; workspace: string; icon: string }> = {
  admin: { label: '系统管理员', workspace: '运维中心', icon: '⚙️' },
  c_level: { label: '高管', workspace: '经营驾驶舱', icon: '📊' },
  sales: { label: '销售', workspace: 'CRM工作台', icon: '💼' },
  vip_client: { label: 'VIP客户', workspace: '客户门户', icon: '🏢' },
  engineer: { label: '工程师', workspace: '个人工作台', icon: '🔧' },
  finance: { label: '财务', workspace: '财务工作台', icon: '💰' },
  hr: { label: '人事', workspace: 'HR中心', icon: '👥' },
  production: { label: '车间', workspace: '车间终端', icon: '🏭' },
  guest: { label: '访客', workspace: '展厅', icon: '👋' },
};

export default function GatewayLogin() {
  const { login, isAuthenticated, user, error, isLoading, getTargetRoute } = useGateway();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [particles] = useState(() => Array.from({ length: 30 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 1, speed: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  })));

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      setShowSuccess(true);
      const target = getTargetRoute();
      setTimeout(() => navigate(target, { replace: true }), 1500);
    }
  }, [isAuthenticated, user, navigate, getTargetRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsSubmitting(true);
    const success = await login(username, password);
    setIsSubmitting(false);
    if (success) {
      setShowSuccess(true);
    }
  };

  // Success state: show role-based redirect
  if (showSuccess && user) {
    const roleInfo = ROLE_INFO[user.role] || ROLE_INFO.guest;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-black to-purple-950/30" />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="text-6xl mb-6">{roleInfo.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">欢迎回来, {user.displayName}</h2>
          <p className="text-cyan-400 font-mono text-sm mb-1">{user.department} · {user.position}</p>
          <p className="text-gray-500 text-xs mb-6">{user.employeeCode}</p>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-6 py-3 inline-block">
            <p className="text-cyan-300 text-sm">
              正在进入 <span className="font-bold text-white">{roleInfo.workspace}</span>
            </p>
            <div className="mt-2 h-1 bg-cyan-900 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full animate-loading-bar" style={{ animation: 'loading 1.5s ease-out forwards' }} />
            </div>
          </div>
        </div>
        <style>{`
          @keyframes loading { from { width: 0; } to { width: 100%; } }
          @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.5s ease-out; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-black to-purple-950/20" />
        {/* Circuit pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M10 10h80v80h-80z" fill="none" stroke="cyan" strokeWidth="0.5" />
              <circle cx="10" cy="10" r="2" fill="cyan" />
              <circle cx="90" cy="90" r="2" fill="cyan" />
              <circle cx="50" cy="50" r="3" fill="cyan" />
              <path d="M10 10L50 50L90 10M10 90L50 50L90 90" fill="none" stroke="cyan" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)" />
        </svg>
        {/* Floating particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-cyan-400/20"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              animation: `float ${p.speed}s infinite ease-in-out ${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* GRT Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-black text-lg">G</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">GRT SYSTEM</h1>
              <p className="text-xs text-cyan-500 font-mono tracking-[0.3em]">OMNI-GATEWAY v5.0</p>
            </div>
          </div>
          <p className="text-gray-600 text-xs">Industrial Cleaning & Automation Digital Platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-950/80 backdrop-blur-xl border border-gray-800 rounded-xl p-6 shadow-2xl shadow-cyan-500/5">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">用户名 / Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none font-mono"
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">密码 / Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all outline-none font-mono"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !username || !password}
              className="w-full mt-5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 disabled:shadow-none"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                'ENTER SYSTEM →'
              )}
            </button>
          </div>
        </form>

        {/* Quick Access Portals */}
        <div className="mt-8">
          <p className="text-gray-700 text-xs text-center mb-3 font-mono">QUICK ACCESS</p>
          <div className="grid grid-cols-3 gap-3">
            {PORTALS.map(portal => (
              <button
                key={portal.id}
                onClick={() => window.location.href = portal.path}
                className="group bg-gray-950/60 border border-gray-800/50 rounded-lg p-3 text-center hover:border-gray-700 transition-all duration-300"
              >
                <div className="text-2xl mb-1">{portal.icon}</div>
                <p className="text-gray-400 text-[10px] font-medium group-hover:text-white transition-colors">{portal.label}</p>
                <p className="text-gray-700 text-[8px] font-mono">{portal.labelEn}</p>
              </button>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-gray-700 font-mono">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            SYSTEM ONLINE
          </span>
          <span>|</span>
          <span>v5.0.0</span>
          <span>|</span>
          <span>96 USERS</span>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
