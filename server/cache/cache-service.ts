/**
 * 缓存服务 (Cache Service)
 * 
 * 功能：提供内存缓存和分布式缓存支持
 * 
 * 缓存策略：
 * 1. LRU (Least Recently Used) - 最近最少使用
 * 2. TTL (Time To Live) - 过期时间
 * 3. 分层缓存 - L1内存 + L2 Redis
 */

// 缓存条目
interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
}

// 缓存配置
export interface CacheConfig {
  maxSize: number;           // 最大缓存条目数
  defaultTTL: number;        // 默认过期时间（毫秒）
  cleanupInterval: number;   // 清理间隔（毫秒）
  enableStats: boolean;      // 是否启用统计
}

// 缓存统计
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
}

// 默认配置
const defaultConfig: CacheConfig = {
  maxSize: 10000,
  defaultTTL: 3600000, // 1小时
  cleanupInterval: 60000, // 1分钟
  enableStats: true
};

/**
 * 内存缓存类
 */
export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0,
    hitRate: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.startCleanupTimer();
  }

  /**
   * 获取缓存值
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      if (this.config.enableStats) this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // 更新访问信息
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    if (this.config.enableStats) this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T, options?: { ttl?: number; tags?: string[] }): void {
    const now = Date.now();
    const ttl = options?.ttl || this.config.defaultTTL;

    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      accessCount: 0,
      tags: options?.tags || []
    };

    this.cache.set(key, entry);

    if (this.config.enableStats) {
      this.stats.sets++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 删除缓存值
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted && this.config.enableStats) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }

    return deleted;
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    if (this.config.enableStats) {
      this.stats.size = 0;
    }
  }

  /**
   * 按标签删除
   */
  deleteByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of Array.from(this.cache)) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (this.config.enableStats) {
      this.stats.deletes += count;
      this.stats.size = this.cache.size;
    }
    return count;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: this.cache.size,
      hitRate: 0
    };
  }

  /**
   * LRU淘汰
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of Array.from(this.cache)) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.config.enableStats) {
        this.stats.evictions++;
        this.stats.size = this.cache.size;
      }
    }
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache)) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    if (this.config.enableStats) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// 预定义缓存实例
export const projectCache = new MemoryCache<any>({ maxSize: 1000, defaultTTL: 300000 }); // 5分钟
export const userCache = new MemoryCache<any>({ maxSize: 500, defaultTTL: 600000 }); // 10分钟
export const ruleCache = new MemoryCache<any>({ maxSize: 200, defaultTTL: 3600000 }); // 1小时
export const aiResponseCache = new MemoryCache<any>({ maxSize: 100, defaultTTL: 1800000 }); // 30分钟

/**
 * 缓存装饰器工厂
 */
export function cached<T>(
  cache: MemoryCache<T>,
  keyGenerator: (...args: any[]) => string,
  options?: { ttl?: number; tags?: string[] }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(...args);
      
      // 尝试从缓存获取
      const cachedValue = cache.get(key);
      if (cachedValue !== undefined) {
        return cachedValue;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      cache.set(key, result, options);

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private caches: Map<string, MemoryCache<any>> = new Map();

  /**
   * 注册缓存
   */
  register(name: string, cache: MemoryCache<any>): void {
    this.caches.set(name, cache);
  }

  /**
   * 获取缓存
   */
  get(name: string): MemoryCache<any> | undefined {
    return this.caches.get(name);
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    for (const cache of Array.from(this.caches.values())) {
      cache.clear();
    }
  }

  /**
   * 获取所有缓存统计
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of Array.from(this.caches)) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

// 导出全局缓存管理器
export const cacheManager = new CacheManager();
cacheManager.register('project', projectCache);
cacheManager.register('user', userCache);
cacheManager.register('rule', ruleCache);
cacheManager.register('aiResponse', aiResponseCache);
