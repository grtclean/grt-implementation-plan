/**
 * 内存缓存单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCache,
  setCache,
  deleteCache,
  clearAllCache,
  deleteCacheByPrefix,
  getUserPermissionsCache,
  setUserPermissionsCache,
  clearUserPermissionsCache,
  getMenuCache,
  setMenuCache,
  clearMenuCache,
  clearUserCache,
  getCacheStats,
} from './memory-cache';

describe('内存缓存系统', () => {
  beforeEach(() => {
    clearAllCache();
  });

  describe('基本缓存操作', () => {
    it('应该能设置和获取缓存', () => {
      const key = 'test:key';
      const value = { name: 'test', count: 42 };
      
      setCache(key, value);
      const result = getCache(key);
      
      expect(result).toEqual(value);
    });

    it('应该能删除缓存', () => {
      const key = 'test:delete';
      setCache(key, 'value');
      
      expect(getCache(key)).toBe('value');
      
      deleteCache(key);
      
      expect(getCache(key)).toBeNull();
    });

    it('应该能清空所有缓存', () => {
      setCache('key1', 'value1');
      setCache('key2', 'value2');
      
      clearAllCache();
      
      expect(getCache('key1')).toBeNull();
      expect(getCache('key2')).toBeNull();
    });

    it('应该能按前缀删除缓存', () => {
      setCache('user:1:name', 'Alice');
      setCache('user:1:age', 25);
      setCache('user:2:name', 'Bob');
      setCache('other:key', 'value');
      
      const deleted = deleteCacheByPrefix('user:1:');
      
      expect(deleted).toBe(2);
      expect(getCache('user:1:name')).toBeNull();
      expect(getCache('user:1:age')).toBeNull();
      expect(getCache('user:2:name')).toBe('Bob');
      expect(getCache('other:key')).toBe('value');
    });
  });

  describe('权限缓存', () => {
    it('应该能设置和获取用户权限缓存', () => {
      const userId = 'user123';
      const permissions = ['crm:view', 'crm:create', 'project:view'];
      
      setUserPermissionsCache(userId, permissions);
      const result = getUserPermissionsCache(userId);
      
      expect(result).toEqual(permissions);
    });

    it('应该能清除用户权限缓存', () => {
      const userId = 'user456';
      setUserPermissionsCache(userId, ['admin']);
      
      clearUserPermissionsCache(userId);
      
      expect(getUserPermissionsCache(userId)).toBeNull();
    });
  });

  describe('菜单缓存', () => {
    it('应该能设置和获取菜单缓存', () => {
      const userId = 'user789';
      const menu = [
        { id: 1, name: '首页', path: '/' },
        { id: 2, name: 'CRM', path: '/crm' },
      ];
      
      setMenuCache(userId, menu);
      const result = getMenuCache(userId);
      
      expect(result).toEqual(menu);
    });

    it('应该能清除菜单缓存', () => {
      const userId = 'userABC';
      setMenuCache(userId, []);
      
      clearMenuCache(userId);
      
      expect(getMenuCache(userId)).toBeNull();
    });
  });

  describe('用户缓存清理', () => {
    it('应该能清除用户所有缓存', () => {
      const userId = 'userXYZ';
      
      setUserPermissionsCache(userId, ['admin']);
      setMenuCache(userId, [{ id: 1 }]);
      setCache(`dataScope:${userId}`, { scope: 'all' });
      setCache(`capabilities:${userId}`, { level: 'L3' });
      
      const cleared = clearUserCache(userId);
      
      expect(cleared).toBe(4);
      expect(getUserPermissionsCache(userId)).toBeNull();
      expect(getMenuCache(userId)).toBeNull();
      expect(getCache(`dataScope:${userId}`)).toBeNull();
      expect(getCache(`capabilities:${userId}`)).toBeNull();
    });
  });

  describe('缓存统计', () => {
    it('应该返回缓存统计信息', () => {
      setCache('stat:1', 'value1');
      setCache('stat:2', 'value2');
      
      const stats = getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats.size).toBe(2);
    });
  });

  describe('数据类型支持', () => {
    it('应该支持字符串', () => {
      setCache('type:string', 'hello');
      expect(getCache('type:string')).toBe('hello');
    });

    it('应该支持数字', () => {
      setCache('type:number', 42);
      expect(getCache('type:number')).toBe(42);
    });

    it('应该支持布尔值', () => {
      setCache('type:boolean', true);
      expect(getCache('type:boolean')).toBe(true);
    });

    it('应该支持数组', () => {
      const arr = [1, 2, 3];
      setCache('type:array', arr);
      expect(getCache('type:array')).toEqual(arr);
    });

    it('应该支持对象', () => {
      const obj = { a: 1, b: { c: 2 } };
      setCache('type:object', obj);
      expect(getCache('type:object')).toEqual(obj);
    });

    it('应该支持null', () => {
      setCache('type:null', null);
      // null值会被存储，但获取时返回null（与不存在相同）
      expect(getCache('type:null')).toBeNull();
    });
  });
});
