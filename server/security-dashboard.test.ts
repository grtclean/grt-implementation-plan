/**
 * 安全仪表盘和培训数据功能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  blockIP,
  unblockIP,
  getBlockedIPs,
  validateLicense,
  getDeidentificationStats,
  validatePasswordStrength,
  detectSuspiciousRequest,
  encrypt,
  decrypt,
  generateSecureToken,
  RATE_LIMIT_PRESETS,
} from './security/index';
import { seedTrainingData, clearTrainingData, getTrainingStats } from './training-seed.service';

describe('安全仪表盘功能测试', () => {
  describe('速率限制', () => {
    it('应该正确检查速率限制', () => {
      const result = checkRateLimit('test-ip-1', 'global', RATE_LIMIT_PRESETS.global);
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
    });

    it('应该允许正常请求', () => {
      const result = checkRateLimit('normal-ip-' + Date.now(), 'global', RATE_LIMIT_PRESETS.global);
      expect(result.allowed).toBe(true);
    });

    it('速率限制预设应该存在', () => {
      expect(RATE_LIMIT_PRESETS).toHaveProperty('global');
      expect(RATE_LIMIT_PRESETS).toHaveProperty('auth');
      expect(RATE_LIMIT_PRESETS).toHaveProperty('sensitive');
    });
  });

  describe('IP黑名单管理', () => {
    it('blockIP函数应该存在', () => {
      expect(typeof blockIP).toBe('function');
    });

    it('unblockIP函数应该存在', () => {
      expect(typeof unblockIP).toBe('function');
    });

    it('getBlockedIPs函数应该存在', () => {
      expect(typeof getBlockedIPs).toBe('function');
    });
  });

  describe('许可证验证', () => {
    it('应该返回许可证验证结果', async () => {
      const result = await validateLicense();
      expect(result).toHaveProperty('valid');
      // In test environment without GRT_LICENSE_KEY, licenseType may be absent
      // when the license is invalid; only check it exists if valid
      if (result.valid) {
        expect(result).toHaveProperty('licenseType');
      } else {
        expect(result).toHaveProperty('errors');
      }
    });

    it('许可证结果应该包含有效性标志', async () => {
      const result = await validateLicense();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('AI脱敏代理统计', () => {
    it('应该返回脱敏统计数据', () => {
      const stats = getDeidentificationStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });

  describe('密码强度验证', () => {
    it('应该拒绝弱密码', () => {
      const result = validatePasswordStrength('123456');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该接受强密码', () => {
      const result = validatePasswordStrength('MyStr0ng!P@ssw0rd#2024');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('应该计算密码强度分数', () => {
      const weak = validatePasswordStrength('password');
      const medium = validatePasswordStrength('Password1');
      const strong = validatePasswordStrength('MyStr0ng!P@ssw0rd#2024');
      
      expect(weak.score).toBeLessThan(medium.score);
      expect(medium.score).toBeLessThan(strong.score);
    });
  });

  describe('可疑请求检测', () => {
    it('应该检测SQL注入', () => {
      const result = detectSuspiciousRequest({
        path: '/api/users',
        method: 'GET',
        query: "id=1' OR '1'='1",
      });
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('SQL注入尝试');
    });

    it('应该检测XSS攻击', () => {
      const result = detectSuspiciousRequest({
        path: '/api/comments',
        method: 'POST',
        body: '<script>alert("xss")</script>',
      });
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('XSS攻击尝试');
    });

    it('应该检测路径遍历', () => {
      const result = detectSuspiciousRequest({
        path: '/api/files/../../../etc/passwd',
        method: 'GET',
      });
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('路径遍历尝试');
    });

    it('应该允许正常请求', () => {
      const result = detectSuspiciousRequest({
        path: '/api/users',
        method: 'GET',
        query: 'page=1&limit=10',
      });
      expect(result.suspicious).toBe(false);
      expect(result.threats.length).toBe(0);
    });
  });

  describe('数据加密', () => {
    it('应该正确加密和解密数据', () => {
      const originalData = '敏感数据测试';
      const encrypted = encrypt(originalData);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('应该生成安全令牌', () => {
      const token = generateSecureToken(32);
      expect(token.length).toBe(64); // hex编码后长度翻倍
    });

    it('加密后的数据应该与原数据不同', () => {
      const originalData = '测试数据';
      const encrypted = encrypt(originalData);
      expect(encrypted).not.toBe(originalData);
    });
  });
});

describe('培训数据功能测试', () => {
  describe('培训数据生成', () => {
    it('seedTrainingData函数应该存在', () => {
      expect(typeof seedTrainingData).toBe('function');
    });

    it('clearTrainingData函数应该存在', () => {
      expect(typeof clearTrainingData).toBe('function');
    });

    it('getTrainingStats函数应该存在', () => {
      expect(typeof getTrainingStats).toBe('function');
    });
  });

  describe('培训统计', () => {
    it('应该返回培训统计数据', async () => {
      const stats = await getTrainingStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      // 检查返回对象有属性
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });

    it('统计数据应该包含培训总数', async () => {
      const stats = await getTrainingStats();
      expect(stats).toHaveProperty('totalTrainings');
    });
  });
});
