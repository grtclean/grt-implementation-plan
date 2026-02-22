/**
 * GRT智能系统 - 安全模块
 * 统一导出所有安全相关功能
 */

// 速率限制
export {
  checkRateLimit,
  createRateLimitMiddleware,
  blockIP,
  unblockIP,
  getBlockedIPs,
  getRateLimitStatus,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
} from './rateLimit';

// 审计日志
export {
  logSecurityEvent,
  logLogin,
  logSensitiveAccess,
  logDataExport,
  logThreatDetected,
  logConfigChange,
  logLicenseCheck,
  type SecurityEventType,
  type Severity,
  type AuditLogEntry,
} from './auditLog';

import type { Severity } from './auditLog';

// 数据加密
export {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  calculateFingerprint,
  generateHMAC,
  verifyHMAC,
  DataMasking,
} from './encryption';

// AI脱敏代理
export {
  deidentifyRequest,
  reidentifyResponse,
  containsSensitiveInfo,
  getDeidentificationStats,
  createSecureLLMRequest,
  filterAIResponse,
} from './aiDeidentificationProxy';

// 许可证管理
export {
  generateHardwareFingerprint,
  generateLicenseKey,
  parseLicenseKey,
  validateLicense,
  isFeatureAllowed,
  getCurrentLicense,
  createTrialLicense,
  createLicenseMiddleware,
  FEATURE_MODULES,
  type LicenseType,
  type DeploymentType,
  type LicenseConfig,
  type LicenseValidationResult,
} from './licenseManager';

// 安装模式 & 主动安全
export {
  getInstallationStatus,
  checkFeatureAccess,
  getActiveSecurityStatus,
  setSecurityLevel,
  reportCriticalEvent,
  getSecurityRateLimitMultiplier,
  setServerPassword,
  verifyServerPassword,
  isPasswordConfigured,
  addAdminNote,
  dismissAdminNote,
  getAdminNotes,
} from './installation-guard';

// 安全配置
export const SECURITY_CONFIG = {
  // 密码策略
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000,  // 90天
    historyCount: 5,  // 不能重复最近5个密码
  },
  
  // 会话配置
  session: {
    maxAge: 8 * 60 * 60 * 1000,  // 8小时
    idleTimeout: 30 * 60 * 1000,  // 30分钟
    maxConcurrent: 3,  // 最多3个并发会话
    regenerateInterval: 15 * 60 * 1000,  // 15分钟重新生成
  },
  
  // MFA配置
  mfa: {
    totpWindow: 1,  // TOTP验证窗口
    backupCodesCount: 10,
    maxFailedAttempts: 5,
    lockoutDuration: 30 * 60 * 1000,  // 30分钟
  },
  
  // 安全头
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
} as const;

// 验证密码强度
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;
  
  const config = SECURITY_CONFIG.password;
  
  // 长度检查
  if (password.length >= config.minLength) {
    score += 25;
  } else {
    errors.push(`密码长度至少需要 ${config.minLength} 个字符`);
  }
  
  // 大写字母
  if (config.requireUppercase && /[A-Z]/.test(password)) {
    score += 20;
  } else if (config.requireUppercase) {
    errors.push('密码需要包含大写字母');
  }
  
  // 小写字母
  if (config.requireLowercase && /[a-z]/.test(password)) {
    score += 20;
  } else if (config.requireLowercase) {
    errors.push('密码需要包含小写字母');
  }
  
  // 数字
  if (config.requireNumbers && /\d/.test(password)) {
    score += 20;
  } else if (config.requireNumbers) {
    errors.push('密码需要包含数字');
  }
  
  // 特殊字符
  if (config.requireSpecialChars && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  } else if (config.requireSpecialChars) {
    errors.push('密码需要包含特殊字符');
  }
  
  // 额外加分
  if (password.length >= 16) score += 10;
  if (/[!@#$%^&*].*[!@#$%^&*]/.test(password)) score += 5;
  
  return {
    valid: errors.length === 0,
    score: Math.min(100, score),
    errors,
  };
}

// 检测可疑请求
export function detectSuspiciousRequest(request: {
  path: string;
  method: string;
  body?: string;
  query?: string;
  headers?: Record<string, string>;
}): {
  suspicious: boolean;
  threats: string[];
  severity: Severity;
} {
  const threats: string[] = [];
  
  // SQL注入检测
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|table|database)\b)/i,
    /('|")\s*(or|and)\s*('|"|\d)/i,
    /;\s*(drop|delete|update|insert)/i,
    /--\s*$/,
  ];
  
  const content = `${request.path} ${request.query || ''} ${request.body || ''}`;
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(content)) {
      threats.push('SQL注入尝试');
      break;
    }
  }
  
  // XSS检测
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  
  for (const pattern of xssPatterns) {
    if (pattern.test(content)) {
      threats.push('XSS攻击尝试');
      break;
    }
  }
  
  // 路径遍历检测
  if (/\.\.\/|\.\.\\/.test(content)) {
    threats.push('路径遍历尝试');
  }
  
  // 命令注入检测
  const cmdPatterns = [
    /[;&|`$].*\b(cat|ls|rm|wget|curl|bash|sh|nc|netcat)\b/i,
    /\$\([^)]+\)/,
    /`[^`]+`/,
  ];
  
  for (const pattern of cmdPatterns) {
    if (pattern.test(content)) {
      threats.push('命令注入尝试');
      break;
    }
  }
  
  // 确定严重程度
  let severity: Severity = 'low';
  if (threats.length > 0) {
    severity = threats.length > 1 ? 'critical' : 'high';
  }
  
  return {
    suspicious: threats.length > 0,
    threats,
    severity,
  };
}
