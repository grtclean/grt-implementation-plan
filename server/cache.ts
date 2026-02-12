/**
 * 缓存管理模块
 * 使用Redis实现权限、菜单等数据的缓存
 */

import { createClient } from 'redis';

// Redis客户端配置
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = {
  PERMISSIONS: 3600, // 1小时
  MENUS: 3600, // 1小时
  USER_DATA: 1800, // 30分钟
  CAPABILITIES: 7200, // 2小时
};

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * 初始化Redis客户端
 */
export async function initRedis() {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis错误:', err));
    await redisClient.connect();
    console.log('✅ Redis连接成功');
    return redisClient;
  } catch (error) {
    console.error('❌ Redis连接失败:', error);
    return null;
  }
}

/**
 * 获取缓存数据
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(String(data)) : null;
  } catch (error) {
    console.error(`获取缓存失败 (${key}):`, error);
    return null;
  }
}

/**
 * 设置缓存数据
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = 3600
): Promise<boolean> {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`设置缓存失败 (${key}):`, error);
    return false;
  }
}

/**
 * 删除缓存数据
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error(`删除缓存失败 (${key}):`, error);
    return false;
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache(): Promise<boolean> {
  if (!redisClient) return false;
  try {
    await redisClient.flushDb();
    return true;
  } catch (error) {
    console.error('清空缓存失败:', error);
    return false;
  }
}

/**
 * 获取用户权限缓存
 */
export async function getUserPermissionsCache(userId: string) {
  return getCache(`permissions:${userId}`);
}

/**
 * 设置用户权限缓存
 */
export async function setUserPermissionsCache(userId: string, permissions: string[]) {
  return setCache(`permissions:${userId}`, permissions, CACHE_TTL.PERMISSIONS);
}

/**
 * 获取菜单缓存
 */
export async function getMenuCache(userId: string) {
  return getCache(`menu:${userId}`);
}

/**
 * 设置菜单缓存
 */
export async function setMenuCache(userId: string, menu: any) {
  return setCache(`menu:${userId}`, menu, CACHE_TTL.MENUS);
}

/**
 * 获取用户数据范围缓存
 */
export async function getUserDataScopeCache(userId: string) {
  return getCache(`dataScope:${userId}`);
}

/**
 * 设置用户数据范围缓存
 */
export async function setUserDataScopeCache(userId: string, dataScope: any) {
  return setCache(`dataScope:${userId}`, dataScope, CACHE_TTL.USER_DATA);
}

/**
 * 获取能力数据缓存
 */
export async function getCapabilitiesCache(userId: string) {
  return getCache(`capabilities:${userId}`);
}

/**
 * 设置能力数据缓存
 */
export async function setCapabilitiesCache(userId: string, capabilities: any) {
  return setCache(`capabilities:${userId}`, capabilities, CACHE_TTL.CAPABILITIES);
}

/**
 * 缓存预热 - 在系统启动时加载常用数据
 */
export async function warmupCache() {
  console.log('🔥 开始缓存预热...');
  
  try {
    // 预热全局配置
    const globalConfig = {
      version: '4.0',
      timestamp: new Date().toISOString(),
    };
    await setCache('config:global', globalConfig, CACHE_TTL.MENUS);
    
    console.log('✅ 缓存预热完成');
  } catch (error) {
    console.error('❌ 缓存预热失败:', error);
  }
}

/**
 * 关闭Redis连接
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Redis连接已关闭');
  }
}
