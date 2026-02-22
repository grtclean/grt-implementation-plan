/**
 * GRT 3-Mode Server Installation System
 *
 * Three deployment modes with different feature access, security levels,
 * and password protection requirements.
 *
 * Community (社区开源版):  Free, open-source, basic features
 * Customer  (客户授权版):  Licensed, standard features, license key required
 * Enterprise(企业内部版):  Full features, on-premise, hardware-bound license
 */

// ── Mode Definitions ──

export type InstallationMode = "community" | "customer" | "enterprise";

export interface ModeConfig {
  id: InstallationMode;
  name: string;
  nameEn: string;
  description: string;
  features: ModeFeatureSet;
  security: ModeSecurityConfig;
  maxUsers: number;
  requiresLicense: boolean;
  requiresPassword: boolean;
}

export interface ModeFeatureSet {
  /** Core M0-M12 modules */
  coreModules: boolean;
  /** AI Copilot + process assistant */
  aiFeatures: boolean;
  /** Full AI LLM integration (DeepSeek/OpenAI) */
  aiLLMIntegration: boolean;
  /** Knowledge base & self-learning */
  knowledgeBase: boolean;
  /** Data export (CSV/Excel) */
  dataExport: boolean;
  /** Third-party integrations (简道云, ERP, etc.) */
  thirdPartyIntegration: boolean;
  /** Advanced security (MFA, IP whitelist, audit log) */
  advancedSecurity: boolean;
  /** Custom branding / white-label */
  customBranding: boolean;
  /** Multi-BU isolation */
  multiBusinessUnit: boolean;
  /** Supply chain traceability */
  supplyChainTrace: boolean;
  /** Digital Twin & PLM */
  digitalTwin: boolean;
  /** API access for external systems */
  apiAccess: boolean;
}

export interface ModeSecurityConfig {
  /** Minimum password length */
  minPasswordLength: number;
  /** Require MFA for admins */
  requireAdminMFA: boolean;
  /** Enable brute-force protection */
  bruteForceProtection: boolean;
  /** IP whitelist enforcement */
  ipWhitelist: boolean;
  /** Session idle timeout (minutes) */
  sessionIdleTimeoutMin: number;
  /** Max concurrent sessions per user */
  maxConcurrentSessions: number;
  /** Enable audit logging */
  auditLogging: boolean;
  /** Hardware fingerprint binding */
  hardwareBinding: boolean;
}

// ── Mode Configurations ──

export const MODE_CONFIGS: Record<InstallationMode, ModeConfig> = {
  community: {
    id: "community",
    name: "社区开源版",
    nameEn: "Community Edition",
    description: "免费开源，适合小型团队和个人开发者。基础功能完整，社区支持。",
    maxUsers: 10,
    requiresLicense: false,
    requiresPassword: true,
    features: {
      coreModules: true,
      aiFeatures: false,
      aiLLMIntegration: false,
      knowledgeBase: false,
      dataExport: true,
      thirdPartyIntegration: false,
      advancedSecurity: false,
      customBranding: false,
      multiBusinessUnit: false,
      supplyChainTrace: false,
      digitalTwin: false,
      apiAccess: false,
    },
    security: {
      minPasswordLength: 8,
      requireAdminMFA: false,
      bruteForceProtection: true,
      ipWhitelist: false,
      sessionIdleTimeoutMin: 60,
      maxConcurrentSessions: 5,
      auditLogging: false,
      hardwareBinding: false,
    },
  },

  customer: {
    id: "customer",
    name: "客户授权版",
    nameEn: "Customer Licensed",
    description: "授权部署，适合中型企业。包含AI功能、知识库、数据导出和标准安全。",
    maxUsers: 50,
    requiresLicense: true,
    requiresPassword: true,
    features: {
      coreModules: true,
      aiFeatures: true,
      aiLLMIntegration: true,
      knowledgeBase: true,
      dataExport: true,
      thirdPartyIntegration: true,
      advancedSecurity: true,
      customBranding: false,
      multiBusinessUnit: true,
      supplyChainTrace: true,
      digitalTwin: false,
      apiAccess: true,
    },
    security: {
      minPasswordLength: 10,
      requireAdminMFA: true,
      bruteForceProtection: true,
      ipWhitelist: false,
      sessionIdleTimeoutMin: 30,
      maxConcurrentSessions: 3,
      auditLogging: true,
      hardwareBinding: false,
    },
  },

  enterprise: {
    id: "enterprise",
    name: "企业内部版",
    nameEn: "Enterprise On-Premise",
    description: "企业级全功能部署，适合大型集团。含数字孪生、定制品牌、硬件绑定和最高安全等级。",
    maxUsers: 999999,
    requiresLicense: true,
    requiresPassword: true,
    features: {
      coreModules: true,
      aiFeatures: true,
      aiLLMIntegration: true,
      knowledgeBase: true,
      dataExport: true,
      thirdPartyIntegration: true,
      advancedSecurity: true,
      customBranding: true,
      multiBusinessUnit: true,
      supplyChainTrace: true,
      digitalTwin: true,
      apiAccess: true,
    },
    security: {
      minPasswordLength: 12,
      requireAdminMFA: true,
      bruteForceProtection: true,
      ipWhitelist: true,
      sessionIdleTimeoutMin: 15,
      maxConcurrentSessions: 2,
      auditLogging: true,
      hardwareBinding: true,
    },
  },
};

// ── Utility Functions ──

/** Get current installation mode from env, default to community */
export function getInstallationMode(): InstallationMode {
  const mode = (typeof process !== "undefined" ? process.env?.GRT_INSTALLATION_MODE : undefined) || "community";
  if (mode === "customer" || mode === "enterprise") return mode;
  return "community";
}

/** Get config for current mode */
export function getCurrentModeConfig(): ModeConfig {
  return MODE_CONFIGS[getInstallationMode()];
}

/** Check if a feature is enabled in the current mode */
export function isFeatureEnabled(feature: keyof ModeFeatureSet): boolean {
  return getCurrentModeConfig().features[feature];
}

/** Feature gate labels for UI display */
export const FEATURE_LABELS: Record<keyof ModeFeatureSet, { name: string; nameEn: string }> = {
  coreModules:           { name: "核心模块 (M0-M12)", nameEn: "Core Modules" },
  aiFeatures:            { name: "AI 智能助手", nameEn: "AI Assistant" },
  aiLLMIntegration:      { name: "AI 大模型集成", nameEn: "LLM Integration" },
  knowledgeBase:         { name: "知识库管理", nameEn: "Knowledge Base" },
  dataExport:            { name: "数据导出", nameEn: "Data Export" },
  thirdPartyIntegration: { name: "第三方系统集成", nameEn: "3rd-Party Integration" },
  advancedSecurity:      { name: "高级安全", nameEn: "Advanced Security" },
  customBranding:        { name: "自定义品牌", nameEn: "Custom Branding" },
  multiBusinessUnit:     { name: "多事业部隔离", nameEn: "Multi-BU Isolation" },
  supplyChainTrace:      { name: "供应链追溯", nameEn: "Supply Chain Trace" },
  digitalTwin:           { name: "数字孪生 & PLM", nameEn: "Digital Twin & PLM" },
  apiAccess:             { name: "API 外部访问", nameEn: "External API Access" },
};

// ── Active Security Mode ──

export type ActiveSecurityLevel = "standard" | "elevated" | "lockdown";

export interface ActiveSecurityStatus {
  level: ActiveSecurityLevel;
  activatedAt: string | null;
  activatedBy: string | null;
  reason: string | null;
  autoEscalateThreshold: number;
  policies: ActiveSecurityPolicies;
}

export interface ActiveSecurityPolicies {
  /** Block all non-admin logins */
  blockNonAdminLogin: boolean;
  /** Require MFA for all users */
  requireMFAAll: boolean;
  /** Reduce rate limits (stricter) */
  strictRateLimits: boolean;
  /** Disable data export */
  disableExport: boolean;
  /** Disable API access */
  disableAPI: boolean;
  /** Force session re-auth every N minutes */
  forceReauthMinutes: number | null;
}

export const SECURITY_LEVEL_POLICIES: Record<ActiveSecurityLevel, ActiveSecurityPolicies> = {
  standard: {
    blockNonAdminLogin: false,
    requireMFAAll: false,
    strictRateLimits: false,
    disableExport: false,
    disableAPI: false,
    forceReauthMinutes: null,
  },
  elevated: {
    blockNonAdminLogin: false,
    requireMFAAll: true,
    strictRateLimits: true,
    disableExport: true,
    disableAPI: false,
    forceReauthMinutes: 30,
  },
  lockdown: {
    blockNonAdminLogin: true,
    requireMFAAll: true,
    strictRateLimits: true,
    disableExport: true,
    disableAPI: true,
    forceReauthMinutes: 10,
  },
};

// ── Admin Important Notes ──

export interface AdminNote {
  id: string;
  category: "security" | "license" | "system" | "update" | "action_required";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: string;
  dismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
}
