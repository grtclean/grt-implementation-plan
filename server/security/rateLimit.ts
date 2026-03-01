/**
 * GRT智能系统 - 速率限制中间件
 * 防止暴力破解、DDoS攻击和API滥用
 */

import { TRPCError } from "@trpc/server";

// 存储请求记录的内存缓存
interface RateLimitRecord {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// 速率限制配置
export interface RateLimitConfig {
  windowMs: number;       // 时间窗口（毫秒）
  maxRequests: number;    // 最大请求数
  blockDuration?: number; // 超限后阻止时长（毫秒）
  keyGenerator?: (ctx: any) => string; // 自定义key生成器
}

// 预设配置
export const RATE_LIMIT_PRESETS = {
  // 全局API限制
  global: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 100,
    blockDuration: 60 * 1000, // 阻止1分钟
  },
  // 登录接口限制（更严格）
  auth: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 5,
    blockDuration: 30 * 60 * 1000, // 阻止30分钟
  },
  // 敏感数据接口限制
  sensitive: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 10,
    blockDuration: 5 * 60 * 1000, // 阻止5分钟
  },
  // 数据导出限制
  export: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 5,
    blockDuration: 60 * 60 * 1000, // 阻止1小时
  },
  // AI接口限制
  ai: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 20,
    blockDuration: 2 * 60 * 1000, // 阻止2分钟
  },
} as const;

/**
 * 生成速率限制key
 */
function generateKey(identifier: string, endpoint: string): string {
  return `${identifier}:${endpoint}`;
}

/**
 * 清理过期的记录
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    // 如果被阻止且阻止时间已过，或者窗口已过期，删除记录
    if (record.blockedUntil && now > record.blockedUntil) {
      rateLimitStore.delete(key);
    } else if (now - record.firstRequest > 24 * 60 * 60 * 1000) {
      // 超过24小时的记录清理
      rateLimitStore.delete(key);
    }
  }
}

// 每5分钟清理一次过期记录
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

/**
 * 检查速率限制
 * @param identifier 标识符（通常是IP或用户ID）
 * @param endpoint 端点名称
 * @param config 速率限制配置
 * @returns 是否允许请求
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const key = generateKey(identifier, endpoint);
  const now = Date.now();
  
  let record = rateLimitStore.get(key);
  
  // 检查是否被阻止
  if (record?.blocked && record.blockedUntil) {
    if (now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.blockedUntil,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
      };
    }
    // 阻止时间已过，重置记录
    record = undefined;
  }
  
  // 检查窗口是否过期
  if (record && now - record.firstRequest > config.windowMs) {
    record = undefined;
  }
  
  // 创建或更新记录
  if (!record) {
    record = {
      count: 1,
      firstRequest: now,
      blocked: false,
    };
    rateLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  record.count++;
  
  // 检查是否超限
  if (record.count > config.maxRequests) {
    record.blocked = true;
    record.blockedUntil = now + (config.blockDuration || config.windowMs);
    rateLimitStore.set(key, record);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.blockedUntil,
      retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }
  
  rateLimitStore.set(key, record);
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.firstRequest + config.windowMs,
  };
}

/**
 * 创建速率限制中间件（用于tRPC）
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async function rateLimitMiddleware({ ctx, next, path }: any) {
    // 获取标识符（优先使用用户ID，否则使用IP）
    const identifier = ctx.user?.id?.toString() || ctx.ip || 'anonymous';
    const endpoint = path || 'unknown';
    
    const result = checkRateLimit(identifier, endpoint, config);
    
    if (!result.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `请求过于频繁，请在 ${result.retryAfter} 秒后重试`,
      });
    }
    
    // 添加速率限制信息到响应头（如果支持）
    if (ctx.res && typeof ctx.res.setHeader === 'function') {
      ctx.res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      ctx.res.setHeader('X-RateLimit-Reset', result.resetAt.toString());
    }
    
    return next();
  };
}

/**
 * 手动阻止IP
 */
export function blockIP(ip: string, durationMs: number = 24 * 60 * 60 * 1000): void {
  const key = generateKey(ip, 'global');
  rateLimitStore.set(key, {
    count: 999999,
    firstRequest: Date.now(),
    blocked: true,
    blockedUntil: Date.now() + durationMs,
  });
}

/**
 * 解除IP阻止
 */
export function unblockIP(ip: string): void {
  // 删除所有与该IP相关的记录
  for (const key of Array.from(rateLimitStore.keys())) {
    if (key.startsWith(`${ip}:`)) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * 获取速率限制状态
 */
export function getRateLimitStatus(identifier: string, endpoint: string): RateLimitRecord | undefined {
  const key = generateKey(identifier, endpoint);
  return rateLimitStore.get(key);
}

/**
 * 获取所有被阻止的IP列表
 */
export function getBlockedIPs(): string[] {
  const blocked: string[] = [];
  const now = Date.now();
  
  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    if (record.blocked && record.blockedUntil && now < record.blockedUntil) {
      const ip = key.split(':')[0];
      if (!blocked.includes(ip)) {
        blocked.push(ip);
      }
    }
  }
  
  return blocked;
}
