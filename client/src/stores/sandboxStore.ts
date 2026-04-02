/**
 * GRT Sandbox Global Store (Zustand)
 *
 * AI沙盘指令中心 — 接收JSON指令，全局重渲染
 *
 * 指令格式:
 * {
 *   "action": "APPLY_SANDBOX",
 *   "client": "Apple",
 *   "ui_mode": "UI5",
 *   "preset_roi": "15%",
 *   "themeColor": "#0071e3",
 *   "clientLogoUrl": "https://..."
 * }
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────

export interface SandboxTheme {
  primaryColor: string;      // hex: #0066ff
  accentColor: string;       // hex: #00d4ff
  headerBg: string;          // hex or gradient
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  mode: 'dark' | 'light';
}

export interface SandboxPreset {
  client: string;
  clientLogoUrl: string | null;
  clientLogoBase64: string | null;   // from Ctrl+V paste
  grtLogoUrl: string | null;
  uiMode: string;                     // UI1-UI9 style variants
  presetROI: string;
  theme: SandboxTheme;
  projectOverrides: Record<string, any>;  // override sandbox data fields
  appliedAt: string;
}

export interface SandboxCommand {
  action: 'APPLY_SANDBOX' | 'RESET_SANDBOX' | 'UPDATE_THEME' | 'UPDATE_LOGO' | 'UPDATE_DATA';
  client?: string;
  ui_mode?: string;
  preset_roi?: string;
  themeColor?: string;
  accentColor?: string;
  clientLogoUrl?: string;
  clientLogoBase64?: string;
  headerBg?: string;
  mode?: 'dark' | 'light';
  data?: Record<string, any>;
}

export interface SandboxState {
  // Current preset
  preset: SandboxPreset;
  isActive: boolean;
  commandHistory: Array<{ command: SandboxCommand; timestamp: string }>;

  // Actions
  applyCommand: (command: SandboxCommand) => void;
  setClientLogo: (base64: string) => void;
  setGrtLogo: (base64: string) => void;
  resetSandbox: () => void;
  getEffectiveTheme: () => SandboxTheme;
}

// ─── Preset Themes ────────────────────────────────────

const THEME_PRESETS: Record<string, Partial<SandboxTheme>> = {
  default: {
    primaryColor: '#1e40af',
    accentColor: '#06b6d4',
    headerBg: '#0d1f3c',
    cardBg: '#0d1f3c60',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    mode: 'dark',
  },
  apple: {
    primaryColor: '#0071e3',
    accentColor: '#5ac8fa',
    headerBg: '#1d1d1f',
    cardBg: '#2d2d2f80',
    textPrimary: '#f5f5f7',
    textSecondary: '#86868b',
    mode: 'dark',
  },
  volkswagen: {
    primaryColor: '#001e50',
    accentColor: '#00b0f0',
    headerBg: '#001e50',
    cardBg: '#00284a80',
    textPrimary: '#ffffff',
    textSecondary: '#7fa8c9',
    mode: 'dark',
  },
  samsung: {
    primaryColor: '#1428a0',
    accentColor: '#4dabf7',
    headerBg: '#0c1631',
    cardBg: '#0c163180',
    textPrimary: '#ffffff',
    textSecondary: '#8c9bba',
    mode: 'dark',
  },
  bosch: {
    primaryColor: '#e20015',
    accentColor: '#ff4d4d',
    headerBg: '#1a1a2e',
    cardBg: '#1a1a2e80',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b8',
    mode: 'dark',
  },
  light: {
    primaryColor: '#1e40af',
    accentColor: '#3b82f6',
    headerBg: '#ffffff',
    cardBg: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    mode: 'light',
  },
};

const DEFAULT_THEME: SandboxTheme = THEME_PRESETS.default as SandboxTheme;

const DEFAULT_PRESET: SandboxPreset = {
  client: 'GRT',
  clientLogoUrl: null,
  clientLogoBase64: null,
  grtLogoUrl: null,
  uiMode: 'UI1',
  presetROI: '—',
  theme: { ...DEFAULT_THEME },
  projectOverrides: {},
  appliedAt: new Date().toISOString(),
};

// ─── Store ────────────────────────────────────────────

export const useSandboxStore = create<SandboxState>()(
  persist(
    (set, get) => ({
      preset: { ...DEFAULT_PRESET },
      isActive: false,
      commandHistory: [],

      applyCommand: (command: SandboxCommand) => {
        const state = get();
        const newPreset = { ...state.preset };
        const now = new Date().toISOString();

        switch (command.action) {
          case 'APPLY_SANDBOX': {
            // Apply full sandbox configuration
            if (command.client) newPreset.client = command.client;
            if (command.ui_mode) newPreset.uiMode = command.ui_mode;
            if (command.preset_roi) newPreset.presetROI = command.preset_roi;
            if (command.clientLogoUrl) newPreset.clientLogoUrl = command.clientLogoUrl;
            if (command.clientLogoBase64) newPreset.clientLogoBase64 = command.clientLogoBase64;

            // Resolve theme: check presets first, then custom colors
            const clientKey = (command.client || '').toLowerCase();
            const presetTheme = THEME_PRESETS[clientKey];
            if (presetTheme) {
              newPreset.theme = { ...DEFAULT_THEME, ...presetTheme };
            }
            // Override with explicit colors
            if (command.themeColor) newPreset.theme.primaryColor = command.themeColor;
            if (command.accentColor) newPreset.theme.accentColor = command.accentColor;
            if (command.headerBg) newPreset.theme.headerBg = command.headerBg;
            if (command.mode) newPreset.theme.mode = command.mode;

            // Merge data overrides
            if (command.data) {
              newPreset.projectOverrides = { ...newPreset.projectOverrides, ...command.data };
            }

            newPreset.appliedAt = now;
            set({
              preset: newPreset,
              isActive: true,
              commandHistory: [...state.commandHistory.slice(-49), { command, timestamp: now }],
            });
            break;
          }

          case 'UPDATE_THEME': {
            if (command.themeColor) newPreset.theme.primaryColor = command.themeColor;
            if (command.accentColor) newPreset.theme.accentColor = command.accentColor;
            if (command.headerBg) newPreset.theme.headerBg = command.headerBg;
            if (command.mode) newPreset.theme.mode = command.mode;
            set({ preset: newPreset, commandHistory: [...state.commandHistory.slice(-49), { command, timestamp: now }] });
            break;
          }

          case 'UPDATE_LOGO': {
            if (command.clientLogoUrl) newPreset.clientLogoUrl = command.clientLogoUrl;
            if (command.clientLogoBase64) newPreset.clientLogoBase64 = command.clientLogoBase64;
            set({ preset: newPreset });
            break;
          }

          case 'UPDATE_DATA': {
            if (command.data) {
              newPreset.projectOverrides = { ...newPreset.projectOverrides, ...command.data };
            }
            set({ preset: newPreset });
            break;
          }

          case 'RESET_SANDBOX': {
            set({
              preset: { ...DEFAULT_PRESET },
              isActive: false,
              commandHistory: [...state.commandHistory.slice(-49), { command, timestamp: now }],
            });
            break;
          }
        }
      },

      setClientLogo: (base64: string) => {
        set(state => ({
          preset: { ...state.preset, clientLogoBase64: base64, clientLogoUrl: null },
          isActive: true,
        }));
      },

      setGrtLogo: (base64: string) => {
        set(state => ({
          preset: { ...state.preset, grtLogoUrl: base64 },
        }));
      },

      resetSandbox: () => {
        set({
          preset: { ...DEFAULT_PRESET },
          isActive: false,
        });
      },

      getEffectiveTheme: () => {
        return get().preset.theme;
      },
    }),
    {
      name: 'grt-sandbox-store',
      partialize: (state) => ({
        preset: state.preset,
        isActive: state.isActive,
      }),
    }
  )
);

// ─── Utility: Apply CSS vars from theme ────────────────

export function applySandboxCSSVars(theme: SandboxTheme) {
  const root = document.documentElement;
  root.style.setProperty('--sandbox-primary', theme.primaryColor);
  root.style.setProperty('--sandbox-accent', theme.accentColor);
  root.style.setProperty('--sandbox-header-bg', theme.headerBg);
  root.style.setProperty('--sandbox-card-bg', theme.cardBg);
  root.style.setProperty('--sandbox-text-primary', theme.textPrimary);
  root.style.setProperty('--sandbox-text-secondary', theme.textSecondary);
  root.style.setProperty('--sandbox-mode', theme.mode);
}
