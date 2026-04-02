/**
 * Sandbox Token Gate — 沙盘密码分享
 *
 * Sales generates: /project-nexus?sandbox_token=A3X9K2
 * Visitor sees: minimal password input → unlock → full sandbox
 */

import React, { useState, useEffect, useCallback } from 'react';

interface SandboxTokenGateProps {
  children: React.ReactNode;
}

// Generate a random 6-char alphanumeric token
export function generateSandboxToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Store active tokens (in production: server-side Redis with TTL)
const activeTokens = new Map<string, { createdBy: string; expiresAt: number; client: string }>();

/**
 * Create a shareable sandbox URL with token
 */
export function createSandboxShareUrl(params: {
  basePath: string;
  createdBy: string;
  client: string;
  expiresInMinutes?: number;
}): { url: string; token: string; expiresAt: string } {
  const token = generateSandboxToken();
  const expiresAt = Date.now() + (params.expiresInMinutes || 60) * 60 * 1000;

  activeTokens.set(token, {
    createdBy: params.createdBy,
    expiresAt,
    client: params.client,
  });

  const url = `${window.location.origin}${params.basePath}?sandbox_token=${token}`;
  return { url, token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Validate a sandbox token
 */
export function validateSandboxToken(token: string): { valid: boolean; client?: string; reason?: string } {
  const entry = activeTokens.get(token.toUpperCase());
  if (!entry) return { valid: false, reason: 'Token not found' };
  if (Date.now() > entry.expiresAt) {
    activeTokens.delete(token);
    return { valid: false, reason: 'Token expired' };
  }
  return { valid: true, client: entry.client };
}

/**
 * Token Gate Component — wraps sandbox content
 */
export function SandboxTokenGate({ children }: SandboxTokenGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // Check URL for token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('sandbox_token');

    if (!urlToken) {
      // No token required — public access or already authenticated
      setIsUnlocked(true);
      setIsChecking(false);
      return;
    }

    // Check stored session
    const stored = sessionStorage.getItem('sandbox_unlocked');
    if (stored === urlToken) {
      setIsUnlocked(true);
      setIsChecking(false);
      return;
    }

    // Show token gate
    setIsChecking(false);
  }, []);

  const handleUnlock = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('sandbox_token');

    if (!urlToken) return;

    setError('');
    const input = tokenInput.toUpperCase().trim();

    if (input === urlToken.toUpperCase()) {
      sessionStorage.setItem('sandbox_unlocked', urlToken);
      setIsUnlocked(true);
    } else {
      setError('Access code incorrect');
      setTokenInput('');
    }
  }, [tokenInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isUnlocked) return <>{children}</>;

  // Token gate UI
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        {/* GRT branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
            <span className="text-white text-2xl font-black">G</span>
          </div>
          <h1 className="text-xl font-bold text-white">GRT Sandbox</h1>
          <p className="text-xs text-gray-600 mt-1">Enter access code to continue</p>
        </div>

        {/* Token input */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
          <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest block mb-2">
            Access Code
          </label>
          <input
            type="text"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={handleKeyDown}
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
            placeholder="------"
            maxLength={6}
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-xs text-center mt-2">{error}</p>
          )}
          <button
            onClick={handleUnlock}
            disabled={tokenInput.length !== 6}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
          >
            UNLOCK →
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-800 mt-4 font-mono">
          Code shared by your GRT representative
        </p>
      </div>
    </div>
  );
}
