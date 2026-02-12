/**
 * 增强的缓存管理器
 * 支持Redis和内存缓存回退
 * 当Redis不可用时自动切换到内存缓存
 */

import { createClient, RedisClientType } from 'redis';

// 缓存TTL配置（秒）
export const CACHE_TTL = {
  PERMISSIONS: 3600,      // 1小时
  MENUS: 3600,            // 1小时
  USER_DATA: 1800,        // 30分钟
  CAPABILITIES: 7200,     // 2小时
  SESSION: 86400,         // 24小时
  VISITOR_REQUEST: 300,   // 5分钟
};

// 缓存键前缀
export const CACHE_KEYS = {
  PERMISSIONS: 'perm:',
  MENUS: 'menu:',
  USER_DATA: 'user:',
  CAPABILITIES: 'cap:',
  DATA_SCOPE: 'scope:',
  VISITOR: 'visitor:',
  CONFIG: 'config:',
};

// 内存缓存存储
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每5分钟清理过期缓存
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// 缓存管理器
class CacheManager {
  private redisClient: RedisClientType | null = null;
  private memoryCache: MemoryCache;
  private useRedis: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.memoryCache = new MemoryCache();
  }

  /**
   * 初始化缓存管理器
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      try {
        this.redisClient = createClient({ url: redisUrl }) as RedisClientType;
        this.redisClient.on('error', (err) => {
          console.error('Redis错误:', err);
          this.useRedis = false;
        });
        
        await this.redisClient.connect();
        this.useRedis = true;
        console.log('✅ Redis缓存已启用');
      } catch (error) {
        console.warn('⚠️ Redis连接失败，使用内存缓存:', error);
        this.useRedis = false;
      }
    } else {
      console.log('ℹ️ 未配置REDIS_URL，使用内存缓存');
      this.useRedis = false;
    }

    this.initialized = true;
  }

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(String(data)) : null;
      } catch (error) {
        console.error(`Redis获取失败 (${key}):`, error);
        // 回退到内存缓存
        return this.memoryCache.get<T>(key);
      }
    }
    return this.memoryCache.get<T>(key);
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 3600): Promise<boolean> {
    // 同时写入内存缓存（作为备份）
    this.memoryCache.set(key, data, ttlSeconds);

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error(`Redis设置失败 (${key}):`, error);
        return true; // 内存缓存已设置
      }
    }
    return true;
  }

  /**
   * 删除缓存数据
   */
  async delete(key: string): Promise<boolean> {
    this.memoryCache.delete(key);

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (error) {
        console.error(`Redis删除失败 (${key}):`, error);
        return true;
      }
    }
    return true;
  }

  /**
   * 删除匹配模式的缓存
   */
  async deletePattern(pattern: string): Promise<boolean> {
    this.memoryCache.deletePattern(pattern);

    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        return true;
      } catch (error) {
        console.error(`Redis模式删除失败 (${pattern}):`, error);
        return true;
      }
    }
    return true;
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<boolean> {
    this.memoryCache.clear();

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushDb();
        return true;
      } catch (error) {
        console.error('Redis清空失败:', error);
        return true;
      }
    }
    return true;
  }

  /**
   * 获取缓存统计
   */
  getStats(): { type: string; memoryStats: { size: number; keys: string[] } } {
    return {
      type: this.useRedis ? 'redis' : 'memory',
      memoryStats: this.memoryCache.getStats(),
    };
  }

  /**
   * 关闭缓存管理器
   */
  async close(): Promise<void> {
    this.memoryCache.destroy();
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  // ============ 权限缓存方法 ============

  async getUserPermissions(userId: string): Promise<string[] | null> {
    return this.get<string[]>(`${CACHE_KEYS.PERMISSIONS}${userId}`);
  }

  async setUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
    return this.set(`${CACHE_KEYS.PERMISSIONS}${userId}`, permissions, CACHE_TTL.PERMISSIONS);
  }

  async invalidateUserPermissions(userId: string): Promise<boolean> {
    return this.delete(`${CACHE_KEYS.PERMISSIONS}${userId}`);
  }

  async invalidateAllPermissions(): Promise<boolean> {
    return this.deletePattern(`${CACHE_KEYS.PERMISSIONS}*`);
  }

  // ============ 菜单缓存方法 ============

  async getUserMenu(userId: string): Promise<any | null> {
    return this.get(`${CACHE_KEYS.MENUS}${userId}`);
  }

  async setUserMenu(userId: string, menu: any): Promise<boolean> {
    return this.set(`${CACHE_KEYS.MENUS}${userId}`, menu, CACHE_TTL.MENUS);
  }

  async invalidateUserMenu(userId: string): Promise<boolean> {
    return this.delete(`${CACHE_KEYS.MENUS}${userId}`);
  }

  async invalidateAllMenus(): Promise<boolean> {
    return this.deletePattern(`${CACHE_KEYS.MENUS}*`);
  }

  // ============ 数据范围缓存方法 ============

  async getUserDataScope(userId: string): Promise<any | null> {
    return this.get(`${CACHE_KEYS.DATA_SCOPE}${userId}`);
  }

  async setUserDataScope(userId: string, dataScope: any): Promise<boolean> {
    return this.set(`${CACHE_KEYS.DATA_SCOPE}${userId}`, dataScope, CACHE_TTL.USER_DATA);
  }

  async invalidateUserDataScope(userId: string): Promise<boolean> {
    return this.delete(`${CACHE_KEYS.DATA_SCOPE}${userId}`);
  }

  // ============ 能力缓存方法 ============

  async getUserCapabilities(userId: string): Promise<any | null> {
    return this.get(`${CACHE_KEYS.CAPABILITIES}${userId}`);
  }

  async setUserCapabilities(userId: string, capabilities: any): Promise<boolean> {
    return this.set(`${CACHE_KEYS.CAPABILITIES}${userId}`, capabilities, CACHE_TTL.CAPABILITIES);
  }

  async invalidateUserCapabilities(userId: string): Promise<boolean> {
    return this.delete(`${CACHE_KEYS.CAPABILITIES}${userId}`);
  }

  // ============ 来访缓存方法 ============

  async getVisitorRequest(requestId: string): Promise<any | null> {
    return this.get(`${CACHE_KEYS.VISITOR}${requestId}`);
  }

  async setVisitorRequest(requestId: string, request: any): Promise<boolean> {
    return this.set(`${CACHE_KEYS.VISITOR}${requestId}`, request, CACHE_TTL.VISITOR_REQUEST);
  }

  async invalidateVisitorRequest(requestId: string): Promise<boolean> {
    return this.delete(`${CACHE_KEYS.VISITOR}${requestId}`);
  }

  // ============ 用户数据缓存方法 ============

  async invalidateUserAllCache(userId: string): Promise<boolean> {
    await this.invalidateUserPermissions(userId);
    await this.invalidateUserMenu(userId);
    await this.invalidateUserDataScope(userId);
    await this.invalidateUserCapabilities(userId);
    return true;
  }
}

// 单例导出
export const cacheManager = new CacheManager();

// 初始化函数
export async function initCacheManager(): Promise<void> {
  await cacheManager.init();
}

// 便捷导出
export const {
  get: getCache,
  set: setCache,
  delete: deleteCache,
  clear: clearCache,
  getUserPermissions,
  setUserPermissions,
  invalidateUserPermissions,
  getUserMenu,
  setUserMenu,
  invalidateUserMenu,
  getUserDataScope,
  setUserDataScope,
  getUserCapabilities,
  setUserCapabilities,
  getVisitorRequest,
  setVisitorRequest,
  invalidateUserAllCache,
} = cacheManager;
