/**
 * GRT智能系统 - 安全模块测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  calculateFingerprint,
  generateHMAC,
  verifyHMAC,
  DataMasking,
  validatePasswordStrength,
  detectSuspiciousRequest,
} from './index';
import {
  deidentifyRequest,
  containsSensitiveInfo,
  createSecureLLMRequest,
} from './aiDeidentificationProxy';
import {
  generateLicenseKey,
  parseLicenseKey,
  createTrialLicense,
  generateHardwareFingerprint,
} from './licenseManager';
import {
  analyzeRequest,
  analyzeUserBehavior,
  detectDataExfiltration,
  getThreatStats,
} from './intrusionDetection';

describe('加密模块测试', () => {
  describe('对称加密', () => {
    it('应该正确加密和解密文本', () => {
      const plaintext = '这是一段敏感数据';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });
    
    it('应该为相同输入生成不同的密文', () => {
      const plaintext = '测试数据';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
    
    it('应该处理空字符串', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    it('应该处理长文本', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });
  
  describe('密码哈希', () => {
    it('应该正确哈希和验证密码', () => {
      const password = 'MySecurePassword123!';
      const hashed = hashPassword(password);
      
      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword('WrongPassword', hashed)).toBe(false);
    });
    
    it('应该为相同密码生成不同的哈希', () => {
      const password = 'TestPassword';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('安全令牌生成', () => {
    it('应该生成指定长度的令牌', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      
      expect(token16.length).toBe(32); // hex编码后长度翻倍
      expect(token32.length).toBe(64);
    });
    
    it('应该生成唯一的令牌', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });
  });
  
  describe('TOTP验证', () => {
    it('应该生成有效的TOTP密钥', () => {
      const secret = generateTOTPSecret();
      expect(secret.length).toBeGreaterThan(0);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });
    
    it('应该生成备份码', () => {
      const codes = generateBackupCodes(10);
      expect(codes.length).toBe(10);
      codes.forEach(code => {
        expect(code).toMatch(/^\d{4}-\d{4}$/);
      });
    });
  });
  
  describe('HMAC签名', () => {
    it('应该正确生成和验证HMAC', () => {
      const data = 'important data';
      const secret = 'my-secret-key';
      
      const signature = generateHMAC(data, secret);
      expect(verifyHMAC(data, signature, secret)).toBe(true);
      expect(verifyHMAC(data, signature, 'wrong-secret')).toBe(false);
      expect(verifyHMAC('modified data', signature, secret)).toBe(false);
    });
  });
  
  describe('数据指纹', () => {
    it('应该为相同数据生成相同指纹', () => {
      const data = 'test data';
      const fp1 = calculateFingerprint(data);
      const fp2 = calculateFingerprint(data);
      
      expect(fp1).toBe(fp2);
    });
    
    it('应该为不同数据生成不同指纹', () => {
      const fp1 = calculateFingerprint('data1');
      const fp2 = calculateFingerprint('data2');
      
      expect(fp1).not.toBe(fp2);
    });
  });
});

describe('数据脱敏测试', () => {
  describe('DataMasking工具', () => {
    it('应该正确脱敏手机号', () => {
      expect(DataMasking.phone('13812345678')).toBe('138****5678');
    });
    
    it('应该正确脱敏邮箱', () => {
      expect(DataMasking.email('test@example.com')).toBe('te***@example.com');
    });
    
    it('应该正确脱敏身份证号', () => {
      expect(DataMasking.idCard('110101199001011234')).toBe('110101********1234');
    });
    
    it('应该正确脱敏姓名', () => {
      expect(DataMasking.name('张三')).toBe('张*');
      expect(DataMasking.name('张三丰')).toBe('张*丰');
    });
    
    it('应该正确脱敏银行卡号', () => {
      const masked = DataMasking.bankCard('6222021234567890123');
      expect(masked).toContain('****');
      expect(masked.endsWith('0123')).toBe(true);
    });
  });
});

describe('AI脱敏代理测试', () => {
  describe('敏感信息检测', () => {
    it('应该检测客户名称', () => {
      const content = '客户: 华为技术有限公司';
      const result = containsSensitiveInfo(content);
      
      expect(result.hasSensitive).toBe(true);
      expect(result.categories).toContain('customer');
    });
    
    it('应该检测价格信息', () => {
      const content = '报价: ¥50,000元';
      const result = containsSensitiveInfo(content);
      
      expect(result.hasSensitive).toBe(true);
      expect(result.categories).toContain('price');
    });
    
    it('应该检测工艺参数', () => {
      const content = '清洗温度: 65℃，时间: 30分钟';
      const result = containsSensitiveInfo(content);
      
      expect(result.hasSensitive).toBe(true);
      expect(result.categories).toContain('formula');
    });
  });
  
  describe('请求脱敏', () => {
    it('应该脱敏敏感内容', () => {
      const content = '客户: 华为技术有限公司，报价: ¥100,000元';
      const { deidentified, sensitiveCount } = deidentifyRequest(content);
      
      expect(deidentified).not.toContain('华为');
      expect(deidentified).not.toContain('100,000');
      expect(sensitiveCount).toBeGreaterThan(0);
    });
    
    it('应该为LLM请求创建安全包装', () => {
      const request = {
        messages: [
          { role: 'user', content: '客户: 华为技术有限公司，报价: ¥100,000元' },
        ],
      };
      
      const { request: secureRequest, sensitiveCount } = createSecureLLMRequest(request);
      
      expect(sensitiveCount).toBeGreaterThan(0);
      expect(secureRequest.messages.length).toBeGreaterThan(request.messages.length);
    });
  });
});

describe('许可证管理测试', () => {
  describe('许可证生成和解析', () => {
    it('应该生成有效的试用许可证', () => {
      const license = createTrialLicense('测试公司', 30);
      
      expect(license).toContain('GRT-TRIAL-');
      
      const parsed = parseLicenseKey(license);
      expect(parsed).not.toBeNull();
      expect(parsed?.licenseType).toBe('trial');
      expect(parsed?.issuedTo).toBe('测试公司');
    });
    
    it('应该正确解析许可证', () => {
      const license = createTrialLicense('GRT公司', 60);
      const parsed = parseLicenseKey(license);
      
      expect(parsed?.maxUsers).toBe(5);
      expect(parsed?.deploymentType).toBe('cloud');
      expect(parsed?.expiresAt).toBeDefined();
    });
    
    it('应该拒绝无效的许可证', () => {
      const invalidLicense = 'INVALID-LICENSE-KEY';
      const parsed = parseLicenseKey(invalidLicense);
      
      expect(parsed).toBeNull();
    });
  });
  
  describe('硬件指纹', () => {
    it('应该生成一致的硬件指纹', () => {
      const fp1 = generateHardwareFingerprint();
      const fp2 = generateHardwareFingerprint();
      
      expect(fp1).toBe(fp2);
      expect(fp1.length).toBe(64); // SHA-256 hex
    });
  });
});

describe('密码强度验证测试', () => {
  it('应该拒绝弱密码', () => {
    const result = validatePasswordStrength('123456');
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(50);
  });
  
  it('应该接受强密码', () => {
    const result = validatePasswordStrength('MyStr0ng!P@ssw0rd');
    
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
  
  it('应该检查密码长度', () => {
    const result = validatePasswordStrength('Short1!');
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('长度'))).toBe(true);
  });
});

describe('可疑请求检测测试', () => {
  describe('SQL注入检测', () => {
    it('应该检测基本SQL注入', () => {
      const result = detectSuspiciousRequest({
        path: '/api/users',
        method: 'GET',
        query: "id=1' OR '1'='1",
      });
      
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('SQL注入尝试');
    });
    
    it('应该检测UNION注入', () => {
      const result = detectSuspiciousRequest({
        path: '/api/data',
        method: 'GET',
        query: 'id=1 UNION SELECT * FROM users',
      });
      
      expect(result.suspicious).toBe(true);
    });
  });
  
  describe('XSS攻击检测', () => {
    it('应该检测script标签', () => {
      const result = detectSuspiciousRequest({
        path: '/api/comment',
        method: 'POST',
        body: '<script>alert("xss")</script>',
      });
      
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('XSS攻击尝试');
    });
    
    it('应该检测事件处理器', () => {
      const result = detectSuspiciousRequest({
        path: '/api/profile',
        method: 'POST',
        body: '<img src=x onerror=alert(1)>',
      });
      
      expect(result.suspicious).toBe(true);
    });
  });
  
  describe('路径遍历检测', () => {
    it('应该检测路径遍历', () => {
      const result = detectSuspiciousRequest({
        path: '/api/files/../../../etc/passwd',
        method: 'GET',
      });
      
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('路径遍历尝试');
    });
  });
  
  describe('命令注入检测', () => {
    it('应该检测命令注入', () => {
      const result = detectSuspiciousRequest({
        path: '/api/exec',
        method: 'POST',
        body: '; rm -rf /',
      });
      
      expect(result.suspicious).toBe(true);
      expect(result.threats).toContain('命令注入尝试');
    });
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

describe('入侵检测测试', () => {
  describe('请求分析', () => {
    it('应该检测SQL注入攻击', async () => {
      const result = await analyzeRequest({
        ipAddress: '192.168.1.100',
        path: '/api/users',
        method: 'GET',
        query: "id=1' OR '1'='1",
      });
      
      expect(result.safe).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats[0].type).toBe('sql_injection');
    });
    
    it('应该允许正常请求通过', async () => {
      const result = await analyzeRequest({
        ipAddress: '192.168.1.1',
        path: '/api/dashboard',
        method: 'GET',
      });
      
      expect(result.safe).toBe(true);
      expect(result.threats.length).toBe(0);
    });
  });
  
  describe('用户行为分析', () => {
    it('应该检测异常行为', async () => {
      // 模拟快速连续请求
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await analyzeUserBehavior(
          999,
          'view',
          '/admin/config'
        );
        results.push(result);
      }
      
      // 敏感资源访问应该被追踪
      expect(results.some(r => r.score > 0)).toBe(true);
    });
  });
  
  describe('数据泄露检测', () => {
    it('应该检测大量数据导出', async () => {
      const result = await detectDataExfiltration(
        1,
        '192.168.1.1',
        'customer',
        5000,
        'csv'
      );
      
      expect(result.suspicious).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
    
    it('应该允许正常导出', async () => {
      const result = await detectDataExfiltration(
        1,
        '192.168.1.1',
        'report',
        50,
        'pdf'
      );
      
      expect(result.suspicious).toBe(false);
    });
  });
  
  describe('威胁统计', () => {
    it('应该返回统计信息', () => {
      const stats = getThreatStats();
      
      expect(stats).toHaveProperty('activeTrackers');
      expect(stats).toHaveProperty('userTrackers');
      expect(stats).toHaveProperty('threatsByType');
    });
  });
});
