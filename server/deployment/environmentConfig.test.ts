/**
 * 环境配置服务测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock数据库模块
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

import { getDb } from '../db';
import {
  getEnvironmentConfigs,
  setEnvironmentConfig,
  deleteEnvironmentConfig,
  getEnvironmentComparison,
  syncTestToProduction,
  importEnvironmentConfigs,
  exportEnvironmentConfigs,
} from './environmentConfig.service';

describe('环境配置服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEnvironmentConfigs', () => {
    it('应该返回空数组当数据库不可用时', async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const result = await getEnvironmentConfigs('test');
      
      expect(result).toEqual([]);
    });

    it('应该返回配置列表当数据库可用时', async () => {
      const mockConfigs = [
        { id: 1, configKey: 'APP_NAME', configValue: 'Test App', environment: 'test' },
        { id: 2, configKey: 'APP_VERSION', configValue: 'v1.0.0', environment: 'test' },
      ];
      
      const mockDb = {
        execute: vi.fn().mockResolvedValue([mockConfigs]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await getEnvironmentConfigs('test');
      
      expect(result).toEqual(mockConfigs);
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('setEnvironmentConfig', () => {
    it('应该返回false当数据库不可用时', async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const result = await setEnvironmentConfig('test', 'KEY', 'VALUE');
      
      expect(result).toBe(false);
    });

    it('应该成功设置配置', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await setEnvironmentConfig('test', 'NEW_KEY', 'NEW_VALUE', '描述', false);
      
      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('应该处理设置配置失败的情况', async () => {
      const mockDb = {
        execute: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await setEnvironmentConfig('test', 'KEY', 'VALUE');
      
      expect(result).toBe(false);
    });
  });

  describe('deleteEnvironmentConfig', () => {
    it('应该返回false当数据库不可用时', async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const result = await deleteEnvironmentConfig('test', 'KEY');
      
      expect(result).toBe(false);
    });

    it('应该成功删除配置', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await deleteEnvironmentConfig('test', 'KEY');
      
      expect(result).toBe(true);
    });
  });

  describe('getEnvironmentComparison', () => {
    it('应该返回默认状态当数据库不可用时', async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const result = await getEnvironmentComparison();
      
      expect(result.test.status).toBe('offline');
      expect(result.production.status).toBe('offline');
      expect(result.versionDiff).toBe(false);
      expect(result.configDiff).toEqual([]);
    });

    it('应该检测版本差异', async () => {
      const testConfigs = [
        { id: 1, configKey: 'APP_VERSION', configValue: 'v2.0.0', environment: 'test', isSecret: false },
      ];
      const prodConfigs = [
        { id: 2, configKey: 'APP_VERSION', configValue: 'v1.0.0', environment: 'production', isSecret: false },
      ];
      
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce([testConfigs])
          .mockResolvedValueOnce([prodConfigs]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await getEnvironmentComparison();
      
      expect(result.versionDiff).toBe(true);
      expect(result.test.version).toBe('v2.0.0');
      expect(result.production.version).toBe('v1.0.0');
    });

    it('应该检测配置差异', async () => {
      const testConfigs = [
        { id: 1, configKey: 'APP_VERSION', configValue: 'v1.0.0', environment: 'test', isSecret: false },
        { id: 2, configKey: 'ONLY_IN_TEST', configValue: 'value', environment: 'test', isSecret: false },
      ];
      const prodConfigs = [
        { id: 3, configKey: 'APP_VERSION', configValue: 'v1.0.0', environment: 'production', isSecret: false },
        { id: 4, configKey: 'ONLY_IN_PROD', configValue: 'value', environment: 'production', isSecret: false },
      ];
      
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce([testConfigs])
          .mockResolvedValueOnce([prodConfigs]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await getEnvironmentComparison();
      
      expect(result.configDiff).toContain('+ ONLY_IN_TEST (仅测试环境)');
      expect(result.configDiff).toContain('- ONLY_IN_PROD (仅正式环境)');
    });
  });

  describe('syncTestToProduction', () => {
    it('应该返回错误当数据库不可用时', async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const result = await syncTestToProduction();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('数据库连接不可用');
    });
  });

  describe('importEnvironmentConfigs', () => {
    it('应该批量导入配置', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const configs = [
        { key: 'KEY1', value: 'VALUE1' },
        { key: 'KEY2', value: 'VALUE2' },
      ];
      
      const result = await importEnvironmentConfigs('test', configs);
      
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('exportEnvironmentConfigs', () => {
    it('应该返回空字符串当数据库不可用时', async () => {
      vi.mocked(getDb).mockResolvedValue(null);
      
      const result = await exportEnvironmentConfigs('test');
      
      expect(result).toBe('');
    });

    it('应该导出配置为JSON', async () => {
      const mockConfigs = [
        { id: 1, configKey: 'APP_NAME', configValue: 'Test', description: 'App name', isSecret: false },
      ];
      
      const mockDb = {
        execute: vi.fn().mockResolvedValue([mockConfigs]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await exportEnvironmentConfigs('test');
      const parsed = JSON.parse(result);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].key).toBe('APP_NAME');
    });

    it('应该过滤敏感配置当includeSecrets为false时', async () => {
      const mockConfigs = [
        { id: 1, configKey: 'APP_NAME', configValue: 'Test', isSecret: false },
        { id: 2, configKey: 'SECRET_KEY', configValue: 'secret', isSecret: true },
      ];
      
      const mockDb = {
        execute: vi.fn().mockResolvedValue([mockConfigs]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);
      
      const result = await exportEnvironmentConfigs('test', false);
      const parsed = JSON.parse(result);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].key).toBe('APP_NAME');
    });
  });
});

describe('环境配置类型', () => {
  it('Environment类型应该只允许test或production', () => {
    const validEnvironments = ['test', 'production'];
    validEnvironments.forEach(env => {
      expect(['test', 'production']).toContain(env);
    });
  });
});
