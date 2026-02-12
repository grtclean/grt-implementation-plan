/**
 * 安全告警Webhook集成服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  getAlertConfig,
  getAllAlertConfigs,
  toggleAlertConfig,
  getAlertHistory,
  getAlertStats,
  getAlertConfigTemplates,
  createAlertConfigFromTemplate,
  createSecurityAlertEvent,
  sendSecurityAlert,
  broadcastSecurityAlert,
  SecurityAlertConfig,
  SecurityAlertEvent,
} from './securityAlertWebhook';

describe('安全告警Webhook服务', () => {
  // 每个测试前清理配置（通过删除所有配置）
  beforeEach(() => {
    const configs = getAllAlertConfigs();
    configs.forEach(config => deleteAlertConfig(config.id));
  });

  describe('告警配置管理', () => {
    it('应该能够添加告警配置', () => {
      const config = addAlertConfig({
        name: '测试告警配置',
        enabled: true,
        webhookType: 'wecom',
        webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test',
        alertTypes: ['intrusion_attempt', 'sql_injection'],
        minSeverity: 'warning',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.name).toBe('测试告警配置');
      expect(config.webhookType).toBe('wecom');
      expect(config.alertTypes).toContain('intrusion_attempt');
      expect(config.createdAt).toBeInstanceOf(Date);
    });

    it('应该能够更新告警配置', () => {
      const config = addAlertConfig({
        name: '原始配置',
        enabled: true,
        webhookType: 'wecom',
        webhookUrl: 'https://example.com/webhook',
        alertTypes: ['intrusion_attempt'],
        minSeverity: 'warning',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      const updated = updateAlertConfig(config.id, {
        name: '更新后的配置',
        minSeverity: 'critical',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('更新后的配置');
      expect(updated?.minSeverity).toBe('critical');
      expect(updated?.webhookType).toBe('wecom'); // 未更新的字段保持不变
    });

    it('应该能够删除告警配置', () => {
      const config = addAlertConfig({
        name: '待删除配置',
        enabled: true,
        webhookType: 'dingtalk',
        webhookUrl: 'https://example.com/webhook',
        alertTypes: ['xss_attack'],
        minSeverity: 'info',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 10,
      });

      const deleted = deleteAlertConfig(config.id);
      expect(deleted).toBe(true);

      const found = getAlertConfig(config.id);
      expect(found).toBeUndefined();
    });

    it('应该能够切换告警配置的启用状态', () => {
      const config = addAlertConfig({
        name: '切换测试',
        enabled: true,
        webhookType: 'feishu',
        webhookUrl: 'https://example.com/webhook',
        alertTypes: ['unauthorized_access'],
        minSeverity: 'warning',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      expect(config.enabled).toBe(true);

      const toggled = toggleAlertConfig(config.id, false);
      expect(toggled?.enabled).toBe(false);

      const toggledBack = toggleAlertConfig(config.id, true);
      expect(toggledBack?.enabled).toBe(true);
    });

    it('应该能够获取所有告警配置', () => {
      addAlertConfig({
        name: '配置1',
        enabled: true,
        webhookType: 'wecom',
        webhookUrl: 'https://example.com/webhook1',
        alertTypes: ['intrusion_attempt'],
        minSeverity: 'warning',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      addAlertConfig({
        name: '配置2',
        enabled: false,
        webhookType: 'dingtalk',
        webhookUrl: 'https://example.com/webhook2',
        alertTypes: ['sql_injection'],
        minSeverity: 'critical',
        mentionAll: true,
        mentionUsers: [],
        cooldownMinutes: 3,
      });

      const configs = getAllAlertConfigs();
      expect(configs.length).toBe(2);
    });
  });

  describe('告警事件创建', () => {
    it('应该能够创建安全告警事件', () => {
      const event = createSecurityAlertEvent(
        'sql_injection',
        'critical',
        'SQL注入攻击检测',
        '检测到来自IP 192.168.1.100的SQL注入尝试',
        {
          sourceIp: '192.168.1.100',
          userId: 'user-123',
          targetResource: '/api/users',
          details: { payload: "'; DROP TABLE users; --" },
        }
      );

      expect(event).toBeDefined();
      expect(event.id).toMatch(/^alert-/);
      expect(event.type).toBe('sql_injection');
      expect(event.severity).toBe('critical');
      expect(event.title).toBe('SQL注入攻击检测');
      expect(event.sourceIp).toBe('192.168.1.100');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('应该支持所有告警类型', () => {
      const alertTypes = [
        'intrusion_attempt',
        'rate_limit_exceeded',
        'ip_blocked',
        'sql_injection',
        'xss_attack',
        'command_injection',
        'unauthorized_access',
        'suspicious_activity',
        'license_violation',
        'data_exfiltration',
      ];

      alertTypes.forEach(type => {
        const event = createSecurityAlertEvent(
          type as any,
          'warning',
          `测试${type}`,
          `测试${type}描述`
        );
        expect(event.type).toBe(type);
      });
    });

    it('应该支持所有告警级别', () => {
      const severities = ['info', 'warning', 'critical', 'emergency'];

      severities.forEach(severity => {
        const event = createSecurityAlertEvent(
          'suspicious_activity',
          severity as any,
          `测试${severity}级别`,
          `测试${severity}级别描述`
        );
        expect(event.severity).toBe(severity);
      });
    });
  });

  describe('告警发送逻辑', () => {
    it('应该拒绝发送到禁用的配置', async () => {
      const config = addAlertConfig({
        name: '禁用配置',
        enabled: false,
        webhookType: 'wecom',
        webhookUrl: 'https://example.com/webhook',
        alertTypes: ['intrusion_attempt'],
        minSeverity: 'warning',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      const event = createSecurityAlertEvent(
        'intrusion_attempt',
        'critical',
        '测试告警',
        '测试描述'
      );

      const result = await sendSecurityAlert(event, config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('未启用');
    });

    it('应该拒绝不匹配的告警类型', async () => {
      const config = addAlertConfig({
        name: '类型限制配置',
        enabled: true,
        webhookType: 'wecom',
        webhookUrl: 'https://example.com/webhook',
        alertTypes: ['sql_injection'], // 只接收SQL注入
        minSeverity: 'info',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 0,
      });

      const event = createSecurityAlertEvent(
        'xss_attack', // 发送XSS攻击告警
        'critical',
        '测试告警',
        '测试描述'
      );

      const result = await sendSecurityAlert(event, config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('类型不匹配');
    });

    it('应该拒绝低于最低级别的告警', async () => {
      const config = addAlertConfig({
        name: '级别限制配置',
        enabled: true,
        webhookType: 'wecom',
        webhookUrl: 'https://example.com/webhook',
        alertTypes: ['intrusion_attempt'],
        minSeverity: 'critical', // 只接收critical及以上
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 0,
      });

      const event = createSecurityAlertEvent(
        'intrusion_attempt',
        'warning', // 发送warning级别
        '测试告警',
        '测试描述'
      );

      const result = await sendSecurityAlert(event, config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('级别不满足');
    });
  });

  describe('告警统计', () => {
    it('应该返回正确的统计数据', () => {
      addAlertConfig({
        name: '启用配置1',
        enabled: true,
        webhookType: 'wecom',
        webhookUrl: 'https://example.com/webhook1',
        alertTypes: ['intrusion_attempt'],
        minSeverity: 'warning',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      addAlertConfig({
        name: '禁用配置',
        enabled: false,
        webhookType: 'dingtalk',
        webhookUrl: 'https://example.com/webhook2',
        alertTypes: ['sql_injection'],
        minSeverity: 'critical',
        mentionAll: false,
        mentionUsers: [],
        cooldownMinutes: 5,
      });

      const stats = getAlertStats();
      expect(stats.totalConfigs).toBe(2);
      expect(stats.enabledConfigs).toBe(1);
    });
  });

  describe('配置模板', () => {
    it('应该返回预置模板列表', () => {
      const templates = getAlertConfigTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.webhookType).toBeDefined();
        expect(template.alertTypes.length).toBeGreaterThan(0);
        expect(template.minSeverity).toBeDefined();
      });
    });

    it('应该能够从模板创建配置', () => {
      const templates = getAlertConfigTemplates();
      const config = createAlertConfigFromTemplate(
        0,
        'https://example.com/webhook',
        { name: '自定义名称' }
      );

      expect(config).toBeDefined();
      expect(config?.name).toBe('自定义名称');
      expect(config?.webhookUrl).toBe('https://example.com/webhook');
      expect(config?.webhookType).toBe(templates[0].webhookType);
    });

    it('应该拒绝无效的模板索引', () => {
      const config = createAlertConfigFromTemplate(
        999,
        'https://example.com/webhook'
      );
      expect(config).toBeNull();
    });
  });

  describe('告警历史', () => {
    it('应该返回空的历史记录（初始状态）', () => {
      const history = getAlertHistory();
      // 历史记录可能包含之前测试的记录，所以只检查返回类型
      expect(Array.isArray(history)).toBe(true);
    });

    it('应该支持限制返回数量', () => {
      const history = getAlertHistory({ limit: 5 });
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });
});
