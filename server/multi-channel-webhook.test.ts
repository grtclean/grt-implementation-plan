/**
 * 多渠道Webhook服务单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendDingTalkMessage,
  sendWeComMessage,
  sendFeishuMessage,
  sendMessage,
  sendToAllChannels,
  getChannelConfigs,
  getChannelConfig,
  updateChannelConfig,
  setChannelEnabled,
  getChannelDisplayName,
  getChannelIcon,
  WebhookConfig,
  WebhookMessage,
} from './multi-channel-webhook';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('多渠道Webhook服务', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('钉钉消息发送', () => {
    const dingtalkConfig: WebhookConfig = {
      channel: 'dingtalk',
      webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      secret: 'SECtest123',
      keyword: '1',
      enabled: true,
    };

    const testMessage: WebhookMessage = {
      title: '测试标题',
      content: '测试内容',
      type: 'markdown',
    };

    it('应该成功发送markdown消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendDingTalkMessage(dingtalkConfig, testMessage);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('dingtalk');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('应该成功发送text消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendDingTalkMessage(dingtalkConfig, {
        ...testMessage,
        type: 'text',
      });

      expect(result.success).toBe(true);
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 310000, errmsg: 'keywords not in content' }),
      });

      const result = await sendDingTalkMessage(dingtalkConfig, testMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('钉钉API错误');
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendDingTalkMessage(dingtalkConfig, testMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('应该在URL中包含签名参数', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      await sendDingTalkMessage(dingtalkConfig, testMessage);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('timestamp=');
      expect(calledUrl).toContain('sign=');
    });
  });

  describe('企业微信消息发送', () => {
    const wecomConfig: WebhookConfig = {
      channel: 'wecom',
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test',
      enabled: true,
    };

    const testMessage: WebhookMessage = {
      title: '测试标题',
      content: '测试内容',
      type: 'markdown',
    };

    it('应该成功发送markdown消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendWeComMessage(wecomConfig, testMessage);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('wecom');
    });

    it('应该成功发送text消息并支持@功能', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const result = await sendWeComMessage(wecomConfig, {
        ...testMessage,
        type: 'text',
        atAll: true,
        atMobiles: ['13800138000'],
      });

      expect(result.success).toBe(true);
      
      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.text.mentioned_list).toContain('@all');
      expect(calledBody.text.mentioned_mobile_list).toContain('13800138000');
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 93000, errmsg: 'invalid webhook url' }),
      });

      const result = await sendWeComMessage(wecomConfig, testMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('企业微信API错误');
    });
  });

  describe('飞书消息发送', () => {
    const feishuConfig: WebhookConfig = {
      channel: 'feishu',
      webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
      secret: 'test_secret',
      enabled: true,
    };

    const testMessage: WebhookMessage = {
      title: '测试标题',
      content: '测试内容',
      type: 'markdown',
    };

    it('应该成功发送富文本消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 0, msg: 'success' }),
      });

      const result = await sendFeishuMessage(feishuConfig, testMessage);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('feishu');
    });

    it('应该成功发送text消息', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ StatusCode: 0, StatusMessage: 'success' }),
      });

      const result = await sendFeishuMessage(feishuConfig, {
        ...testMessage,
        type: 'text',
      });

      expect(result.success).toBe(true);
    });

    it('应该在请求中包含签名', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 0, msg: 'success' }),
      });

      await sendFeishuMessage(feishuConfig, testMessage);

      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.timestamp).toBeDefined();
      expect(calledBody.sign).toBeDefined();
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ code: 19001, msg: 'invalid signature' }),
      });

      const result = await sendFeishuMessage(feishuConfig, testMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('飞书API错误');
    });
  });

  describe('统一发送接口', () => {
    it('应该根据渠道类型调用正确的发送函数', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const dingtalkConfig: WebhookConfig = {
        channel: 'dingtalk',
        webhookUrl: 'https://test.com',
        enabled: true,
      };

      const result = await sendMessage(dingtalkConfig, {
        title: '测试',
        content: '内容',
      });

      expect(result.channel).toBe('dingtalk');
    });

    it('应该在渠道未启用时返回错误', async () => {
      const disabledConfig: WebhookConfig = {
        channel: 'dingtalk',
        webhookUrl: 'https://test.com',
        enabled: false,
      };

      const result = await sendMessage(disabledConfig, {
        title: '测试',
        content: '内容',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('该渠道未启用');
    });
  });

  describe('多渠道批量发送', () => {
    it('应该发送到所有已启用的渠道', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
      });

      const configs: WebhookConfig[] = [
        { channel: 'dingtalk', webhookUrl: 'https://test1.com', enabled: true },
        { channel: 'wecom', webhookUrl: 'https://test2.com', enabled: true },
        { channel: 'feishu', webhookUrl: 'https://test3.com', enabled: false },
      ];

      const results = await sendToAllChannels(configs, {
        title: '测试',
        content: '内容',
      });

      expect(results.length).toBe(2); // 只有2个启用的渠道
    });
  });

  describe('渠道配置管理', () => {
    it('应该获取所有渠道配置', () => {
      const configs = getChannelConfigs();
      expect(configs.length).toBeGreaterThan(0);
    });

    it('应该获取指定渠道配置', () => {
      const config = getChannelConfig('dingtalk');
      expect(config).toBeDefined();
      expect(config?.channel).toBe('dingtalk');
    });

    it('应该更新渠道配置', () => {
      const newConfig: WebhookConfig = {
        channel: 'wecom',
        webhookUrl: 'https://new-url.com',
        enabled: true,
      };

      updateChannelConfig(newConfig);

      const updated = getChannelConfig('wecom');
      expect(updated?.webhookUrl).toBe('https://new-url.com');
    });

    it('应该启用/禁用渠道', () => {
      setChannelEnabled('feishu', true);
      expect(getChannelConfig('feishu')?.enabled).toBe(true);

      setChannelEnabled('feishu', false);
      expect(getChannelConfig('feishu')?.enabled).toBe(false);
    });
  });

  describe('辅助函数', () => {
    it('应该返回正确的渠道显示名称', () => {
      expect(getChannelDisplayName('dingtalk')).toBe('钉钉');
      expect(getChannelDisplayName('wecom')).toBe('企业微信');
      expect(getChannelDisplayName('feishu')).toBe('飞书');
    });

    it('应该返回正确的渠道图标', () => {
      expect(getChannelIcon('dingtalk')).toBe('🔔');
      expect(getChannelIcon('wecom')).toBe('💬');
      expect(getChannelIcon('feishu')).toBe('🐦');
    });
  });
});
