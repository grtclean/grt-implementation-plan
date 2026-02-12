/**
 * GRT智能系统 - 许可证管理服务
 * 防止系统被非法复制和使用
 */

import crypto from "crypto";
import os from "os";
import { logLicenseCheck } from "./auditLog";

// 许可证类型
export type LicenseType = 'trial' | 'standard' | 'enterprise' | 'unlimited';

// 部署类型
export type DeploymentType = 'cloud' | 'on-premise' | 'hybrid';

// 许可证配置
export interface LicenseConfig {
  licenseKey: string;
  licenseType: LicenseType;
  issuedTo: string;
  issuedAt: Date;
  expiresAt?: Date;
  maxUsers: number;
  allowedFeatures: string[];
  deploymentType: DeploymentType;
  hardwareFingerprint?: string;
}

// 许可证验证结果
export interface LicenseValidationResult {
  valid: boolean;
  licenseType?: LicenseType;
  expiresAt?: Date;
  daysRemaining?: number;
  maxUsers?: number;
  allowedFeatures?: string[];
  errors: string[];
  warnings: string[];
}

// 功能模块定义
export const FEATURE_MODULES = {
  // 核心模块
  'core.dashboard': '仪表盘',
  'core.users': '用户管理',
  'core.settings': '系统设置',
  
  // CRM模块
  'crm.leads': '线索管理',
  'crm.opportunities': '商机管理',
  'crm.customers': '客户管理',
  'crm.analytics': 'CRM分析',
  
  // 项目管理模块
  'pm.projects': '项目管理',
  'pm.gates': '阶段门禁',
  'pm.tasks': '任务管理',
  'pm.resources': '资源管理',
  
  // 服务模块
  'service.tickets': '服务工单',
  'service.knowledge': '知识库',
  'service.reports': '服务报告',
  
  // 能力系统
  'capability.assessment': '能力评估',
  'capability.evidence': '能力证据',
  'capability.certificates': '证书管理',
  
  // AI功能
  'ai.assistant': 'AI助手',
  'ai.analytics': 'AI分析',
  'ai.automation': 'AI自动化',
  
  // 高级功能
  'advanced.api': 'API访问',
  'advanced.export': '数据导出',
  'advanced.integration': '第三方集成',
  'advanced.audit': '审计日志',
} as const;

// 许可证类型对应的功能
const LICENSE_FEATURES: Record<LicenseType, string[]> = {
  trial: [
    'core.dashboard',
    'core.users',
    'crm.leads',
    'pm.projects',
    'service.tickets',
  ],
  standard: [
    'core.dashboard',
    'core.users',
    'core.settings',
    'crm.leads',
    'crm.opportunities',
    'crm.customers',
    'pm.projects',
    'pm.tasks',
    'service.tickets',
    'service.knowledge',
    'capability.assessment',
  ],
  enterprise: [
    ...Object.keys(FEATURE_MODULES).filter(f => !f.startsWith('ai.')),
    'ai.assistant',
  ],
  unlimited: Object.keys(FEATURE_MODULES),
};

// 许可证类型对应的最大用户数
const LICENSE_MAX_USERS: Record<LicenseType, number> = {
  trial: 5,
  standard: 20,
  enterprise: 100,
  unlimited: 999999,
};

// 当前许可证缓存
let currentLicense: LicenseConfig | null = null;
let lastValidation: LicenseValidationResult | null = null;
let lastValidationTime: number = 0;

/**
 * 生成硬件指纹
 */
export function generateHardwareFingerprint(): string {
  const components: string[] = [];
  
  // CPU信息
  const cpus = os.cpus();
  if (cpus.length > 0) {
    components.push(`cpu:${cpus[0].model}`);
  }
  
  // 网络接口
  const networkInterfaces = os.networkInterfaces();
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
          components.push(`mac:${iface.mac}`);
          break;
        }
      }
    }
  }
  
  // 主机名
  components.push(`hostname:${os.hostname()}`);
  
  // 平台信息
  components.push(`platform:${os.platform()}-${os.arch()}`);
  
  // 内存大小（GB级别）
  const totalMemGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  components.push(`memory:${totalMemGB}GB`);
  
  // 生成哈希
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.sort().join('|'))
    .digest('hex');
  
  return fingerprint;
}

/**
 * 生成许可证密钥
 */
export function generateLicenseKey(config: Omit<LicenseConfig, 'licenseKey'>): string {
  const payload = {
    type: config.licenseType,
    issuedTo: config.issuedTo,
    issuedAt: config.issuedAt.toISOString(),
    expiresAt: config.expiresAt?.toISOString(),
    maxUsers: config.maxUsers,
    features: config.allowedFeatures,
    deployment: config.deploymentType,
    fingerprint: config.hardwareFingerprint,
  };
  
  // 序列化并签名
  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', getLicenseSecret())
    .update(payloadStr)
    .digest('hex')
    .slice(0, 16);
  
  // Base64编码
  const encoded = Buffer.from(payloadStr).toString('base64');
  
  // 格式化许可证密钥
  const key = `GRT-${config.licenseType.toUpperCase()}-${signature}-${encoded}`;
  
  return key;
}

/**
 * 解析许可证密钥
 */
export function parseLicenseKey(licenseKey: string): LicenseConfig | null {
  try {
    // 解析格式
    const parts = licenseKey.split('-');
    if (parts.length < 4 || parts[0] !== 'GRT') {
      return null;
    }
    
    const licenseType = parts[1].toLowerCase() as LicenseType;
    const signature = parts[2];
    const encoded = parts.slice(3).join('-');
    
    // 解码payload
    const payloadStr = Buffer.from(encoded, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', getLicenseSecret())
      .update(payloadStr)
      .digest('hex')
      .slice(0, 16);
    
    if (signature !== expectedSignature) {
      console.warn('[License] Invalid signature');
      return null;
    }
    
    return {
      licenseKey,
      licenseType: payload.type,
      issuedTo: payload.issuedTo,
      issuedAt: new Date(payload.issuedAt),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
      maxUsers: payload.maxUsers,
      allowedFeatures: payload.features,
      deploymentType: payload.deployment,
      hardwareFingerprint: payload.fingerprint,
    };
  } catch (error) {
    console.error('[License] Failed to parse license key:', error);
    return null;
  }
}

/**
 * 验证许可证
 */
export async function validateLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 使用缓存（5分钟内）
  if (lastValidation && Date.now() - lastValidationTime < 5 * 60 * 1000) {
    return lastValidation;
  }
  
  // 获取许可证
  const key = licenseKey || process.env.GRT_LICENSE_KEY;
  if (!key) {
    // 开发环境允许无许可证运行
    if (process.env.NODE_ENV === 'development') {
      warnings.push('开发环境：使用试用许可证');
      const result: LicenseValidationResult = {
        valid: true,
        licenseType: 'trial',
        maxUsers: LICENSE_MAX_USERS.trial,
        allowedFeatures: LICENSE_FEATURES.trial,
        errors,
        warnings,
      };
      lastValidation = result;
      lastValidationTime = Date.now();
      return result;
    }
    
    errors.push('未找到许可证密钥');
    await logLicenseCheck(false, 'MISSING', { error: 'No license key' });
    return { valid: false, errors, warnings };
  }
  
  // 解析许可证
  const license = parseLicenseKey(key);
  if (!license) {
    errors.push('许可证密钥格式无效');
    await logLicenseCheck(false, key, { error: 'Invalid format' });
    return { valid: false, errors, warnings };
  }
  
  // 检查过期时间
  if (license.expiresAt && license.expiresAt < new Date()) {
    errors.push(`许可证已于 ${license.expiresAt.toLocaleDateString()} 过期`);
    await logLicenseCheck(false, key, { error: 'Expired', expiresAt: license.expiresAt });
    return { valid: false, errors, warnings };
  }
  
  // 检查硬件指纹（仅限本地部署）
  if (license.deploymentType === 'on-premise' && license.hardwareFingerprint) {
    const currentFingerprint = generateHardwareFingerprint();
    if (currentFingerprint !== license.hardwareFingerprint) {
      errors.push('硬件指纹不匹配，可能是非法复制');
      await logLicenseCheck(false, key, { 
        error: 'Hardware mismatch',
        expected: license.hardwareFingerprint.slice(0, 8) + '...',
        actual: currentFingerprint.slice(0, 8) + '...',
      });
      return { valid: false, errors, warnings };
    }
  }
  
  // 计算剩余天数
  let daysRemaining: number | undefined;
  if (license.expiresAt) {
    daysRemaining = Math.ceil((license.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysRemaining <= 30) {
      warnings.push(`许可证将在 ${daysRemaining} 天后过期`);
    }
  }
  
  // 缓存许可证
  currentLicense = license;
  
  const result: LicenseValidationResult = {
    valid: true,
    licenseType: license.licenseType,
    expiresAt: license.expiresAt,
    daysRemaining,
    maxUsers: license.maxUsers,
    allowedFeatures: license.allowedFeatures,
    errors,
    warnings,
  };
  
  lastValidation = result;
  lastValidationTime = Date.now();
  
  await logLicenseCheck(true, key, { 
    licenseType: license.licenseType,
    daysRemaining,
  });
  
  return result;
}

/**
 * 检查功能是否可用
 */
export async function isFeatureAllowed(featureKey: string): Promise<boolean> {
  const validation = await validateLicense();
  if (!validation.valid) {
    return false;
  }
  
  return validation.allowedFeatures?.includes(featureKey) || false;
}

/**
 * 获取当前许可证信息
 */
export function getCurrentLicense(): LicenseConfig | null {
  return currentLicense;
}

/**
 * 获取许可证密钥（用于签名）
 */
function getLicenseSecret(): string {
  return process.env.LICENSE_SECRET || 'grt-license-secret-change-in-production';
}

/**
 * 创建试用许可证
 */
export function createTrialLicense(
  companyName: string,
  daysValid: number = 30
): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysValid);
  
  return generateLicenseKey({
    licenseType: 'trial',
    issuedTo: companyName,
    issuedAt: new Date(),
    expiresAt,
    maxUsers: LICENSE_MAX_USERS.trial,
    allowedFeatures: LICENSE_FEATURES.trial,
    deploymentType: 'cloud',
  });
}

/**
 * 许可证中间件（用于tRPC）
 */
export function createLicenseMiddleware(requiredFeature?: string) {
  return async function licenseMiddleware({ ctx, next, path }: any) {
    const validation = await validateLicense();
    
    if (!validation.valid) {
      throw new Error(`许可证无效: ${validation.errors.join(', ')}`);
    }
    
    if (requiredFeature && !validation.allowedFeatures?.includes(requiredFeature)) {
      throw new Error(`当前许可证不支持此功能: ${FEATURE_MODULES[requiredFeature as keyof typeof FEATURE_MODULES] || requiredFeature}`);
    }
    
    return next();
  };
}
