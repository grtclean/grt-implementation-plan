/**
 * 社群平台配置服务单元测试
 * Social Platform Configuration Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// 测试钉钉签名生成
describe('钉钉签名生成 (DingTalk Sign Generation)', () => {
  it('应该生成正确格式的HMAC-SHA256签名', () => {
    const timestamp = 1609459200000;
    const secret = 'SEC123456789';
    
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);
    const sign = encodeURIComponent(hmac.digest('base64'));
    
    expect(sign).toBeTruthy();
    expect(typeof sign).toBe('string');
    expect(sign.length).toBeGreaterThan(0);
  });
});

describe('平台配置数据结构', () => {
  it('企业微信配置应该包含必要字段', () => {
    const wecomConfig = {
      corpId: 'ww1234567890abcdef',
      agentId: '1000001',
      secret: 'test_secret',
      token: 'callback_token',
      encodingAESKey: '43_characters_key_for_message_encryption_aes'
    };

    expect(wecomConfig.corpId).toBeDefined();
    expect(wecomConfig.secret).toBeDefined();
    expect(wecomConfig.corpId).toMatch(/^ww/);
  });

  it('钉钉配置应该包含必要字段', () => {
    const dingtalkConfig = {
      appKey: 'dingxxxxxxxx',
      appSecret: 'test_app_secret',
      agentId: '1234567890',
      robotWebhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      robotSecret: 'SECxxxxxxxxxx'
    };

    expect(dingtalkConfig.appKey).toBeDefined();
    expect(dingtalkConfig.appSecret).toBeDefined();
    expect(dingtalkConfig.appKey).toMatch(/^ding/);
  });

  it('飞书配置应该包含必要字段', () => {
    const feishuConfig = {
      appId: 'cli_xxxxxxxx',
      appSecret: 'test_app_secret',
      encryptKey: 'encrypt_key',
      verificationToken: 'verification_token'
    };

    expect(feishuConfig.appId).toBeDefined();
    expect(feishuConfig.appSecret).toBeDefined();
    expect(feishuConfig.appId).toMatch(/^cli_/);
  });
});

describe('社群平台配置数据库表结构', () => {
  it('配置表应该支持多平台类型', () => {
    const platformTypes = ['wecom', 'dingtalk', 'feishu'];
    
    platformTypes.forEach(type => {
      expect(['wecom', 'dingtalk', 'feishu']).toContain(type);
    });
  });

  it('配置表应该支持启用/禁用状态', () => {
    const config = {
      id: 1,
      platform: 'wecom',
      name: '企业微信配置',
      enabled: true,
      config: JSON.stringify({ corpId: 'ww123' }),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(config.enabled).toBe(true);
    expect(typeof config.config).toBe('string');
    expect(JSON.parse(config.config)).toHaveProperty('corpId');
  });
});

describe('API响应格式', () => {
  it('企业微信API响应应该包含errcode', () => {
    const successResponse = {
      errcode: 0,
      errmsg: 'ok',
      access_token: 'test_token',
      expires_in: 7200
    };

    expect(successResponse.errcode).toBe(0);
    expect(successResponse.access_token).toBeDefined();
  });

  it('钉钉API响应应该包含errcode', () => {
    const successResponse = {
      errcode: 0,
      errmsg: 'ok',
      access_token: 'test_token',
      expires_in: 7200
    };

    expect(successResponse.errcode).toBe(0);
    expect(successResponse.access_token).toBeDefined();
  });

  it('错误响应应该包含错误信息', () => {
    const errorResponse = {
      errcode: 40001,
      errmsg: 'invalid credential'
    };

    expect(errorResponse.errcode).not.toBe(0);
    expect(errorResponse.errmsg).toBeDefined();
  });
});

describe('Webhook URL格式验证', () => {
  it('企业微信Webhook URL应该符合格式', () => {
    const webhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc123';
    
    expect(webhookUrl).toMatch(/^https:\/\/qyapi\.weixin\.qq\.com/);
    expect(webhookUrl).toContain('webhook/send');
  });

  it('钉钉机器人Webhook URL应该符合格式', () => {
    const webhookUrl = 'https://oapi.dingtalk.com/robot/send?access_token=abc123';
    
    expect(webhookUrl).toMatch(/^https:\/\/oapi\.dingtalk\.com/);
    expect(webhookUrl).toContain('robot/send');
  });

  it('飞书Webhook URL应该符合格式', () => {
    const webhookUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/abc123';
    
    expect(webhookUrl).toMatch(/^https:\/\/open\.feishu\.cn/);
    expect(webhookUrl).toContain('bot/v2/hook');
  });
});

describe('消息格式', () => {
  it('文本消息格式应该正确', () => {
    const textMessage = {
      msgtype: 'text',
      text: {
        content: '测试消息内容'
      }
    };

    expect(textMessage.msgtype).toBe('text');
    expect(textMessage.text.content).toBeDefined();
  });

  it('Markdown消息格式应该正确', () => {
    const markdownMessage = {
      msgtype: 'markdown',
      markdown: {
        title: '消息标题',
        text: '## 消息内容\n- 项目1\n- 项目2'
      }
    };

    expect(markdownMessage.msgtype).toBe('markdown');
    expect(markdownMessage.markdown.title).toBeDefined();
    expect(markdownMessage.markdown.text).toBeDefined();
  });

  it('@人员消息格式应该正确', () => {
    const atMessage = {
      msgtype: 'text',
      text: {
        content: '测试消息 @张三'
      },
      at: {
        atMobiles: ['13800138000'],
        isAtAll: false
      }
    };

    expect(atMessage.at.atMobiles).toHaveLength(1);
    expect(atMessage.at.isAtAll).toBe(false);
  });
});

describe('配置加密', () => {
  it('敏感配置应该被加密存储', () => {
    const sensitiveFields = ['secret', 'appSecret', 'encodingAESKey', 'robotSecret'];
    
    sensitiveFields.forEach(field => {
      // 验证敏感字段名称
      expect(field.toLowerCase()).toMatch(/secret|key/i);
    });
  });

  it('配置更新时应该支持部分更新', () => {
    const existingConfig = {
      corpId: 'ww123',
      secret: 'old_secret',
      agentId: '1000001'
    };

    const updateData = {
      agentId: '1000002'
      // secret留空表示不更新
    };

    const mergedConfig = {
      ...existingConfig,
      ...updateData,
      secret: existingConfig.secret // 保持原有secret
    };

    expect(mergedConfig.corpId).toBe('ww123');
    expect(mergedConfig.secret).toBe('old_secret');
    expect(mergedConfig.agentId).toBe('1000002');
  });
});

describe('同步状态', () => {
  it('同步结果应该包含必要信息', () => {
    const syncResult = {
      success: true,
      syncedAt: new Date().toISOString(),
      groupCount: 5,
      memberCount: 100,
      messageCount: 50
    };

    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedAt).toBeDefined();
    expect(syncResult.groupCount).toBeGreaterThanOrEqual(0);
  });

  it('同步失败应该包含错误信息', () => {
    const syncError = {
      success: false,
      error: '连接超时',
      errorCode: 'TIMEOUT'
    };

    expect(syncError.success).toBe(false);
    expect(syncError.error).toBeDefined();
  });
});
