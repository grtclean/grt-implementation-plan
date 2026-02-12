/**
 * 内存缓存模块
 * 当Redis不可用时作为备用方案
 * 支持TTL过期和LRU淘汰策略
 */

interface CacheEntry<T> {
  value: T;
  expireAt: number;
  lastAccess: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.startCleanup();
  }

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return null;
    }

    // 更新最后访问时间
    entry.lastAccess = Date.now();
    return entry.value as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, value: T, ttlSeconds: number = 3600): boolean {
    // 如果缓存已满，执行LRU淘汰
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttlSeconds * 1000,
      lastAccess: Date.now(),
    });

    return true;
  }

  /**
   * 删除缓存数据
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 按前缀删除缓存
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expireAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每5分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 停止定期清理
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取缓存统计信息
   */
  stats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // 需要额外追踪命中率
    };
  }
}

// 全局内存缓存实例
const memoryCache = new MemoryCache();

// 缓存TTL配置
const CACHE_TTL = {
  PERMISSIONS: 3600, // 1小时
  MENUS: 3600, // 1小时
  USER_DATA: 1800, // 30分钟
  CAPABILITIES: 7200, // 2小时
  SESSION: 86400, // 24小时
};

/**
 * 获取缓存数据
 */
export function getCache<T>(key: string): T | null {
  return memoryCache.get<T>(key);
}

/**
 * 设置缓存数据
 */
export function setCache<T>(key: string, data: T, ttl: number = 3600): boolean {
  return memoryCache.set(key, data, ttl);
}

/**
 * 删除缓存数据
 */
export function deleteCache(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * 清空所有缓存
 */
export function clearAllCache(): void {
  memoryCache.clear();
}

/**
 * 按前缀删除缓存
 */
export function deleteCacheByPrefix(prefix: string): number {
  return memoryCache.deleteByPrefix(prefix);
}

/**
 * 获取用户权限缓存
 */
export function getUserPermissionsCache(userId: string): string[] | null {
  return getCache<string[]>(`permissions:${userId}`);
}

/**
 * 设置用户权限缓存
 */
export function setUserPermissionsCache(userId: string, permissions: string[]): boolean {
  return setCache(`permissions:${userId}`, permissions, CACHE_TTL.PERMISSIONS);
}

/**
 * 清除用户权限缓存
 */
export function clearUserPermissionsCache(userId: string): boolean {
  return deleteCache(`permissions:${userId}`);
}

/**
 * 获取菜单缓存
 */
export function getMenuCache(userId: string): any | null {
  return getCache(`menu:${userId}`);
}

/**
 * 设置菜单缓存
 */
export function setMenuCache(userId: string, menu: any): boolean {
  return setCache(`menu:${userId}`, menu, CACHE_TTL.MENUS);
}

/**
 * 清除菜单缓存
 */
export function clearMenuCache(userId: string): boolean {
  return deleteCache(`menu:${userId}`);
}

/**
 * 获取用户数据范围缓存
 */
export function getUserDataScopeCache(userId: string): any | null {
  return getCache(`dataScope:${userId}`);
}

/**
 * 设置用户数据范围缓存
 */
export function setUserDataScopeCache(userId: string, dataScope: any): boolean {
  return setCache(`dataScope:${userId}`, dataScope, CACHE_TTL.USER_DATA);
}

/**
 * 获取能力数据缓存
 */
export function getCapabilitiesCache(userId: string): any | null {
  return getCache(`capabilities:${userId}`);
}

/**
 * 设置能力数据缓存
 */
export function setCapabilitiesCache(userId: string, capabilities: any): boolean {
  return setCache(`capabilities:${userId}`, capabilities, CACHE_TTL.CAPABILITIES);
}

/**
 * 清除用户所有缓存
 */
export function clearUserCache(userId: string): number {
  let count = 0;
  if (deleteCache(`permissions:${userId}`)) count++;
  if (deleteCache(`menu:${userId}`)) count++;
  if (deleteCache(`dataScope:${userId}`)) count++;
  if (deleteCache(`capabilities:${userId}`)) count++;
  return count;
}

/**
 * 获取缓存统计
 */
export function getCacheStats() {
  return memoryCache.stats();
}

/**
 * 停止缓存清理
 */
export function stopCache(): void {
  memoryCache.stop();
}

export { memoryCache, CACHE_TTL };
