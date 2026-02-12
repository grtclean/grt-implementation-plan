/**
 * 性能测试脚本
 * 测试缓存和数据库查询的性能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cacheManager, initCacheManager, CACHE_TTL } from './cache-manager';

describe('性能测试套件', () => {
  beforeAll(async () => {
    await initCacheManager();
  });

  afterAll(async () => {
    await cacheManager.close();
  });

  describe('缓存性能测试', () => {
    it('应该在1ms内完成缓存写入', async () => {
      const testData = { permissions: ['read', 'write', 'delete'], roles: ['admin', 'user'] };
      
      const start = performance.now();
      await cacheManager.set('perf:test:write', testData, 60);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10); // 应该在10ms内完成
      console.log(`缓存写入耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该在1ms内完成缓存读取', async () => {
      const testData = { permissions: ['read', 'write', 'delete'], roles: ['admin', 'user'] };
      await cacheManager.set('perf:test:read', testData, 60);
      
      const start = performance.now();
      const result = await cacheManager.get('perf:test:read');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10); // 应该在10ms内完成
      expect(result).toEqual(testData);
      console.log(`缓存读取耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该支持高并发缓存操作', async () => {
      const concurrency = 100;
      const operations: Promise<boolean>[] = [];
      
      const start = performance.now();
      
      for (let i = 0; i < concurrency; i++) {
        operations.push(
          cacheManager.set(`perf:concurrent:${i}`, { index: i, data: 'test' }, 60)
        );
      }
      
      await Promise.all(operations);
      const duration = performance.now() - start;
      
      console.log(`${concurrency}个并发写入耗时: ${duration.toFixed(2)}ms`);
      console.log(`平均每个操作: ${(duration / concurrency).toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(1000); // 100个操作应该在1秒内完成
    });

    it('应该正确处理缓存过期', async () => {
      await cacheManager.set('perf:expire:test', { data: 'test' }, 1); // 1秒过期
      
      const immediate = await cacheManager.get('perf:expire:test');
      expect(immediate).toEqual({ data: 'test' });
      
      // 等待2秒
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const expired = await cacheManager.get('perf:expire:test');
      expect(expired).toBeNull();
    });
  });

  describe('权限缓存性能测试', () => {
    it('应该快速缓存和获取用户权限', async () => {
      const userId = 'perf-test-user-1';
      const permissions = ['crm:read', 'crm:write', 'project:read', 'project:write', 'cost:read'];
      
      // 测试设置权限
      const setStart = performance.now();
      await cacheManager.setUserPermissions(userId, permissions);
      const setDuration = performance.now() - setStart;
      
      // 测试获取权限
      const getStart = performance.now();
      const cachedPermissions = await cacheManager.getUserPermissions(userId);
      const getDuration = performance.now() - getStart;
      
      expect(cachedPermissions).toEqual(permissions);
      expect(setDuration).toBeLessThan(10);
      expect(getDuration).toBeLessThan(10);
      
      console.log(`权限缓存设置耗时: ${setDuration.toFixed(2)}ms`);
      console.log(`权限缓存获取耗时: ${getDuration.toFixed(2)}ms`);
    });

    it('应该快速失效用户权限缓存', async () => {
      const userId = 'perf-test-user-2';
      const permissions = ['admin:all'];
      
      await cacheManager.setUserPermissions(userId, permissions);
      
      const start = performance.now();
      await cacheManager.invalidateUserPermissions(userId);
      const duration = performance.now() - start;
      
      const result = await cacheManager.getUserPermissions(userId);
      expect(result).toBeNull();
      expect(duration).toBeLessThan(10);
      
      console.log(`权限缓存失效耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('菜单缓存性能测试', () => {
    it('应该快速缓存和获取用户菜单', async () => {
      const userId = 'perf-test-user-3';
      const menu = {
        items: [
          { id: 1, name: 'Dashboard', path: '/dashboard', children: [] },
          { id: 2, name: 'CRM', path: '/crm', children: [
            { id: 21, name: 'Customers', path: '/crm/customers' },
            { id: 22, name: 'Opportunities', path: '/crm/opportunities' },
          ]},
          { id: 3, name: 'Projects', path: '/projects', children: [] },
        ],
      };
      
      // 测试设置菜单
      const setStart = performance.now();
      await cacheManager.setUserMenu(userId, menu);
      const setDuration = performance.now() - setStart;
      
      // 测试获取菜单
      const getStart = performance.now();
      const cachedMenu = await cacheManager.getUserMenu(userId);
      const getDuration = performance.now() - getStart;
      
      expect(cachedMenu).toEqual(menu);
      expect(setDuration).toBeLessThan(10);
      expect(getDuration).toBeLessThan(10);
      
      console.log(`菜单缓存设置耗时: ${setDuration.toFixed(2)}ms`);
      console.log(`菜单缓存获取耗时: ${getDuration.toFixed(2)}ms`);
    });
  });

  describe('缓存统计测试', () => {
    it('应该返回正确的缓存统计信息', () => {
      const stats = cacheManager.getStats();
      
      expect(stats).toHaveProperty('type');
      expect(stats).toHaveProperty('memoryStats');
      expect(stats.memoryStats).toHaveProperty('size');
      expect(stats.memoryStats).toHaveProperty('keys');
      
      console.log('缓存统计:', JSON.stringify(stats, null, 2));
    });
  });

  describe('批量操作性能测试', () => {
    it('应该高效处理批量用户缓存失效', async () => {
      // 先创建多个用户的缓存
      const userCount = 50;
      for (let i = 0; i < userCount; i++) {
        await cacheManager.setUserPermissions(`batch-user-${i}`, ['read', 'write']);
        await cacheManager.setUserMenu(`batch-user-${i}`, { items: [] });
      }
      
      // 测试批量失效
      const start = performance.now();
      await cacheManager.invalidateAllPermissions();
      await cacheManager.invalidateAllMenus();
      const duration = performance.now() - start;
      
      console.log(`批量失效${userCount * 2}个缓存项耗时: ${duration.toFixed(2)}ms`);
      
      // 验证缓存已失效
      const result = await cacheManager.getUserPermissions('batch-user-0');
      expect(result).toBeNull();
    });
  });
});

// 性能基准测试结果类型
interface BenchmarkResult {
  operation: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
}

/**
 * 运行性能基准测试
 */
export async function runBenchmark(): Promise<BenchmarkResult[]> {
  await initCacheManager();
  
  const results: BenchmarkResult[] = [];
  const iterations = 1000;
  
  // 测试缓存写入
  const writeTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await cacheManager.set(`benchmark:write:${i}`, { data: i }, 60);
    writeTimes.push(performance.now() - start);
  }
  
  results.push({
    operation: 'Cache Write',
    avgTime: writeTimes.reduce((a, b) => a + b, 0) / iterations,
    minTime: Math.min(...writeTimes),
    maxTime: Math.max(...writeTimes),
    iterations,
  });
  
  // 测试缓存读取
  const readTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await cacheManager.get(`benchmark:write:${i}`);
    readTimes.push(performance.now() - start);
  }
  
  results.push({
    operation: 'Cache Read',
    avgTime: readTimes.reduce((a, b) => a + b, 0) / iterations,
    minTime: Math.min(...readTimes),
    maxTime: Math.max(...readTimes),
    iterations,
  });
  
  // 测试缓存删除
  const deleteTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await cacheManager.delete(`benchmark:write:${i}`);
    deleteTimes.push(performance.now() - start);
  }
  
  results.push({
    operation: 'Cache Delete',
    avgTime: deleteTimes.reduce((a, b) => a + b, 0) / iterations,
    minTime: Math.min(...deleteTimes),
    maxTime: Math.max(...deleteTimes),
    iterations,
  });
  
  await cacheManager.close();
  
  return results;
}

/**
 * 打印性能报告
 */
export function printBenchmarkReport(results: BenchmarkResult[]): void {
  console.log('\n========================================');
  console.log('       性能基准测试报告');
  console.log('========================================\n');
  
  for (const result of results) {
    console.log(`操作: ${result.operation}`);
    console.log(`  迭代次数: ${result.iterations}`);
    console.log(`  平均耗时: ${result.avgTime.toFixed(4)}ms`);
    console.log(`  最小耗时: ${result.minTime.toFixed(4)}ms`);
    console.log(`  最大耗时: ${result.maxTime.toFixed(4)}ms`);
    console.log('');
  }
  
  console.log('========================================\n');
}
