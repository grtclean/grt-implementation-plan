/**
 * GRT Installation Guard — 3-Mode Password Protection System
 *
 * Enforces feature gates, password policies, and security levels
 * based on the active installation mode (community/customer/enterprise).
 *
 * Also manages the "Active Security Mode" which can be escalated
 * from standard → elevated → lockdown in response to threats.
 */

import crypto from "crypto";
import {
  type InstallationMode,
  type ActiveSecurityLevel,
  type ActiveSecurityStatus,
  type AdminNote,
  MODE_CONFIGS,
  SECURITY_LEVEL_POLICIES,
  getInstallationMode,
} from "../../shared/installation-modes";
import { validateLicense, getCurrentLicense } from "./licenseManager";
import { logSecurityEvent, logConfigChange } from "./auditLog";
import { RATE_LIMIT_PRESETS } from "./rateLimit";

// ── In-Memory State ──

let activeSecurityStatus: ActiveSecurityStatus = {
  level: "standard",
  activatedAt: null,
  activatedBy: null,
  reason: null,
  autoEscalateThreshold: 10, // auto-escalate after 10 critical events/hour
  policies: SECURITY_LEVEL_POLICIES.standard,
};

/** Server access password hash (set on first admin setup) */
let serverAccessPasswordHash: string | null =
  process.env.GRT_SERVER_PASSWORD
    ? crypto.createHash("sha256").update(process.env.GRT_SERVER_PASSWORD).digest("hex")
    : null;

/** Threat counter for auto-escalation */
let criticalEventCount = 0;
let lastCounterReset = Date.now();

// Admin notes (in-memory, persisted via API calls)
const adminNotes: AdminNote[] = [];
let noteIdCounter = 1;

// ── Password Protection ──

/**
 * Set or update the server access password.
 * Used during initial setup or by admin.
 */
export function setServerPassword(password: string): void {
  serverAccessPasswordHash = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

/**
 * Verify the server access password.
 */
export function verifyServerPassword(password: string): boolean {
  if (!serverAccessPasswordHash) return true; // No password set = open access
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(serverAccessPasswordHash, "hex")
  );
}

/**
 * Check if server password is configured.
 */
export function isPasswordConfigured(): boolean {
  return serverAccessPasswordHash !== null;
}

// ── Installation Mode Guard ──

/**
 * Get full installation status including mode, license, and security.
 */
export async function getInstallationStatus() {
  const mode = getInstallationMode();
  const config = MODE_CONFIGS[mode];
  const license = await validateLicense();

  // Auto-generate admin notes based on current state
  refreshAdminNotes(mode, license, activeSecurityStatus);

  return {
    mode,
    config,
    license: {
      valid: license.valid,
      type: license.licenseType,
      expiresAt: license.expiresAt,
      daysRemaining: license.daysRemaining,
      warnings: license.warnings,
      errors: license.errors,
    },
    security: activeSecurityStatus,
    passwordConfigured: isPasswordConfigured(),
    serverUptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    adminNotes: adminNotes.filter((n) => !n.dismissed),
  };
}

/**
 * Check if a feature is allowed in the current installation mode.
 */
export function checkFeatureAccess(featureKey: string): {
  allowed: boolean;
  reason?: string;
  upgradeMode?: InstallationMode;
} {
  const mode = getInstallationMode();
  const config = MODE_CONFIGS[mode];

  // Map feature keys to mode feature flags
  const featureMap: Record<string, keyof typeof config.features> = {
    "ai.assistant": "aiFeatures",
    "ai.analytics": "aiFeatures",
    "ai.automation": "aiLLMIntegration",
    "ai.copilot": "aiFeatures",
    "kb.manage": "knowledgeBase",
    "export.data": "dataExport",
    "integration.third_party": "thirdPartyIntegration",
    "security.advanced": "advancedSecurity",
    "branding.custom": "customBranding",
    "bu.multi": "multiBusinessUnit",
    "supply_chain.trace": "supplyChainTrace",
    "digital_twin": "digitalTwin",
    "api.external": "apiAccess",
  };

  const featureFlag = featureMap[featureKey];
  if (!featureFlag) return { allowed: true }; // Unknown features default to allowed

  if (config.features[featureFlag]) return { allowed: true };

  // Suggest upgrade path
  const upgradeMode: InstallationMode =
    mode === "community" ? "customer" : "enterprise";

  return {
    allowed: false,
    reason: `此功能仅在${MODE_CONFIGS[upgradeMode].name}及以上版本可用`,
    upgradeMode,
  };
}

// ── Active Security Mode ──

/**
 * Get current active security status.
 */
export function getActiveSecurityStatus(): ActiveSecurityStatus {
  return { ...activeSecurityStatus };
}

/**
 * Set active security level.
 */
export async function setSecurityLevel(
  level: ActiveSecurityLevel,
  activatedBy: string,
  reason: string
): Promise<ActiveSecurityStatus> {
  const oldLevel = activeSecurityStatus.level;
  activeSecurityStatus = {
    level,
    activatedAt: new Date().toISOString(),
    activatedBy,
    reason,
    autoEscalateThreshold: activeSecurityStatus.autoEscalateThreshold,
    policies: SECURITY_LEVEL_POLICIES[level],
  };

  // Log the change
  await logSecurityEvent({
    eventType: "system.config.change",
    severity: level === "lockdown" ? "critical" : level === "elevated" ? "high" : "medium",
    userName: activatedBy,
    ipAddress: "system",
    action: `安全级别变更: ${oldLevel} → ${level}`,
    result: "success",
    details: { oldLevel, newLevel: level, reason },
  });

  // Add admin note
  addAdminNote({
    category: "security",
    severity: level === "lockdown" ? "critical" : level === "elevated" ? "warning" : "info",
    title: `安全级别已${level === "standard" ? "恢复" : "升级"}至${level}`,
    description: `${reason} (操作人: ${activatedBy})`,
    actionUrl: "/security",
    actionLabel: "查看安全仪表盘",
  });

  return activeSecurityStatus;
}

/**
 * Auto-escalate security level based on threat volume.
 * Called by security middleware when critical events are detected.
 */
export async function reportCriticalEvent(): Promise<void> {
  const now = Date.now();

  // Reset counter every hour
  if (now - lastCounterReset > 60 * 60 * 1000) {
    criticalEventCount = 0;
    lastCounterReset = now;
  }

  criticalEventCount++;

  if (
    criticalEventCount >= activeSecurityStatus.autoEscalateThreshold &&
    activeSecurityStatus.level === "standard"
  ) {
    await setSecurityLevel(
      "elevated",
      "system-auto",
      `自动升级: ${criticalEventCount}个严重事件/小时超过阈值(${activeSecurityStatus.autoEscalateThreshold})`
    );
  } else if (
    criticalEventCount >= activeSecurityStatus.autoEscalateThreshold * 3 &&
    activeSecurityStatus.level === "elevated"
  ) {
    await setSecurityLevel(
      "lockdown",
      "system-auto",
      `自动锁定: ${criticalEventCount}个严重事件/小时，威胁持续升级`
    );
  }
}

/**
 * Get effective rate limit multiplier based on security level.
 */
export function getSecurityRateLimitMultiplier(): number {
  switch (activeSecurityStatus.level) {
    case "lockdown":
      return 0.2; // 5x stricter
    case "elevated":
      return 0.5; // 2x stricter
    default:
      return 1.0; // Normal
  }
}

// ── Admin Important Notes ──

/**
 * Add a new admin note.
 */
export function addAdminNote(note: Omit<AdminNote, "id" | "timestamp" | "dismissed">): AdminNote {
  const newNote: AdminNote = {
    ...note,
    id: `note-${noteIdCounter++}`,
    timestamp: new Date().toISOString(),
    dismissed: false,
  };
  adminNotes.unshift(newNote); // Newest first
  // Keep max 50 notes
  if (adminNotes.length > 50) adminNotes.length = 50;
  return newNote;
}

/**
 * Dismiss an admin note.
 */
export function dismissAdminNote(noteId: string): boolean {
  const note = adminNotes.find((n) => n.id === noteId);
  if (!note) return false;
  note.dismissed = true;
  return true;
}

/**
 * Get all admin notes (optionally including dismissed).
 */
export function getAdminNotes(includeDismissed = false): AdminNote[] {
  return includeDismissed
    ? [...adminNotes]
    : adminNotes.filter((n) => !n.dismissed);
}

/**
 * Auto-refresh admin notes based on system state.
 */
function refreshAdminNotes(
  mode: InstallationMode,
  license: { valid: boolean; daysRemaining?: number; warnings: string[]; errors: string[] },
  security: ActiveSecurityStatus
): void {
  // Check: password not set
  if (!isPasswordConfigured()) {
    ensureNote("password-not-set", {
      category: "security",
      severity: "critical",
      title: "服务器访问密码未设置",
      description: "当前服务器未设置访问密码保护。强烈建议设置管理员密码以防止未授权访问。",
      actionUrl: "/security",
      actionLabel: "设置密码",
    });
  }

  // Check: license expiring soon
  if (license.valid && license.daysRemaining !== undefined && license.daysRemaining <= 30) {
    ensureNote("license-expiring", {
      category: "license",
      severity: license.daysRemaining <= 7 ? "critical" : "warning",
      title: `许可证将在 ${license.daysRemaining} 天后到期`,
      description: "请联系GRT销售团队续费，避免服务中断。",
      actionUrl: "/security",
      actionLabel: "查看许可证",
    });
  }

  // Check: license invalid
  if (!license.valid && MODE_CONFIGS[mode].requiresLicense) {
    ensureNote("license-invalid", {
      category: "license",
      severity: "critical",
      title: "许可证无效或已过期",
      description: license.errors.join("; ") || "请检查许可证配置。",
      actionUrl: "/security",
      actionLabel: "更新许可证",
    });
  }

  // Check: elevated security
  if (security.level !== "standard") {
    ensureNote("security-elevated", {
      category: "security",
      severity: security.level === "lockdown" ? "critical" : "warning",
      title: `系统处于${security.level === "lockdown" ? "锁定" : "加强"}安全模式`,
      description: security.reason || "安全级别已升级，部分功能受限。",
      actionUrl: "/security",
      actionLabel: "管理安全策略",
    });
  }

  // Check: community mode limitations
  if (mode === "community") {
    ensureNote("community-limits", {
      category: "system",
      severity: "info",
      title: "当前为社区开源版",
      description: "社区版最多支持10用户，AI功能和高级安全功能不可用。升级到客户授权版或企业版获取完整功能。",
      actionUrl: "/security",
      actionLabel: "查看版本对比",
    });
  }
}

/** Ensure a note with given ID exists (no duplicates). */
function ensureNote(
  noteId: string,
  note: Omit<AdminNote, "id" | "timestamp" | "dismissed">
): void {
  const existing = adminNotes.find((n) => n.id === noteId && !n.dismissed);
  if (!existing) {
    const newNote: AdminNote = {
      ...note,
      id: noteId,
      timestamp: new Date().toISOString(),
      dismissed: false,
    };
    // Remove old dismissed version if any
    const idx = adminNotes.findIndex((n) => n.id === noteId);
    if (idx >= 0) adminNotes.splice(idx, 1);
    adminNotes.unshift(newNote);
  }
}
