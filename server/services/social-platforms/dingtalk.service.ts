/**
 * 钉钉API服务模块
 * 实现钉钉群组管理和消息同步
 */

import {
  ISocialPlatformService,
  PlatformConfig,
  SocialGroup,
  SocialMessage,
  SendMessageRequest,
  SendMessageResponse,
  MessageType,
} from './types';

// 钉钉API基础URL
const DINGTALK_API_BASE = 'https://oapi.dingtalk.com';
const DINGTALK_API_NEW = 'https://api.dingtalk.com';

// 访问令牌缓存
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class DingTalkService implements ISocialPlatformService {
  platform: 'dingtalk' = 'dingtalk';
  private config: PlatformConfig['dingtalk'] | null = null;
  private tokenCache: TokenCache | null = null;

  async initialize(config: PlatformConfig): Promise<void> {
    if (!config.dingtalk) {
      throw new Error('钉钉配置缺失');
    }
    this.config = config.dingtalk;
    // 预获取访问令牌
    await this.getAccessToken();
  }

  async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('服务未初始化');
    }

    // 检查缓存是否有效
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.accessToken;
    }

    // 获取新的访问令牌
    const url = `${DINGTALK_API_BASE}/gettoken?appkey=${this.config.appKey}&appsecret=${this.config.appSecret}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode !== 0) {
        throw new Error(`获取访问令牌失败: ${data.errmsg}`);
      }

      this.tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 提前5分钟过期
      };

      return this.tokenCache.accessToken;
    } catch (error) {
      console.error('获取钉钉访问令牌失败:', error);
      throw error;
    }
  }

  async getGroups(): Promise<SocialGroup[]> {
    const accessToken = await this.getAccessToken();
    
    // 获取群列表（需要通过群机器人或会话接口）
    // 钉钉的群列表需要通过特定接口获取
    const url = `${DINGTALK_API_BASE}/chat/list?access_token=${accessToken}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: 'manager', // 需要指定用户ID
        }),
      });
      
      const data = await response.json();

      if (data.errcode !== 0) {
        console.error('获取钉钉群列表失败:', data.errmsg);
        return [];
      }

      return (data.chat_id_list || []).map((chatId: string) => ({
        id: chatId,
        name: '', // 需要单独获取群信息
        platform: 'dingtalk' as const,
      }));
    } catch (error) {
      console.error('获取钉钉群组列表失败:', error);
      return [];
    }
  }

  async getGroupInfo(groupId: string): Promise<SocialGroup | null> {
    const accessToken = await this.getAccessToken();
    const url = `${DINGTALK_API_BASE}/chat/get?access_token=${accessToken}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatid: groupId }),
      });
      
      const data = await response.json();

      if (data.errcode !== 0) {
        console.error('获取群信息失败:', data.errmsg);
        return null;
      }

      return {
        id: data.chat_info.chatid,
        name: data.chat_info.name,
        platform: 'dingtalk',
        ownerName: data.chat_info.owner,
        memberCount: data.chat_info.useridlist?.length || 0,
      };
    } catch (error) {
      console.error('获取钉钉群信息失败:', error);
      return null;
    }
  }

  async getMessages(groupId: string, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<SocialMessage[]> {
    // 钉钉消息通过Webhook接收，不支持主动拉取历史消息
    console.log('钉钉消息通过Webhook接收，不支持主动拉取');
    return [];
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const accessToken = await this.getAccessToken();
    const url = `${DINGTALK_API_BASE}/chat/send?access_token=${accessToken}`;
    
    try {
      const messageBody: any = {
        chatid: request.groupId,
        msgtype: this.mapMessageType(request.contentType),
      };

      // 根据消息类型构建消息体
      switch (request.contentType) {
        case 'text':
          messageBody.text = {
            content: request.content,
          };
          break;
        case 'markdown':
          messageBody.markdown = {
            title: '消息通知',
            text: request.content,
          };
          break;
        case 'image':
          if (request.attachments?.[0]) {
            messageBody.image = {
              media_id: request.attachments[0].url,
            };
          }
          break;
        case 'file':
          if (request.attachments?.[0]) {
            messageBody.file = {
              media_id: request.attachments[0].url,
            };
          }
          break;
        case 'link':
          messageBody.link = {
            messageUrl: request.content,
            picUrl: request.attachments?.[0]?.url || '',
            title: '链接消息',
            text: request.content,
          };
          break;
        case 'card':
          messageBody.action_card = {
            title: '卡片消息',
            markdown: request.content,
            single_title: '查看详情',
            single_url: '',
          };
          break;
        default:
          messageBody.text = {
            content: request.content,
          };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody),
      });
      
      const data = await response.json();

      if (data.errcode !== 0) {
        return {
          success: false,
          error: data.errmsg,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
      };
    } catch (error) {
      console.error('发送钉钉消息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送失败',
      };
    }
  }

  // 通过Webhook发送消息（群机器人）
  async sendWebhookMessage(webhookUrl: string, content: string, options?: {
    msgtype?: 'text' | 'markdown' | 'link' | 'actionCard';
    title?: string;
    atMobiles?: string[];
    atUserIds?: string[];
    isAtAll?: boolean;
  }): Promise<SendMessageResponse> {
    try {
      const msgtype = options?.msgtype || 'text';
      const messageBody: any = { msgtype };

      switch (msgtype) {
        case 'text':
          messageBody.text = {
            content,
          };
          if (options?.atMobiles || options?.atUserIds || options?.isAtAll) {
            messageBody.at = {
              atMobiles: options.atMobiles || [],
              atUserIds: options.atUserIds || [],
              isAtAll: options.isAtAll || false,
            };
          }
          break;
        case 'markdown':
          messageBody.markdown = {
            title: options?.title || '消息通知',
            text: content,
          };
          if (options?.atMobiles || options?.atUserIds || options?.isAtAll) {
            messageBody.at = {
              atMobiles: options.atMobiles || [],
              atUserIds: options.atUserIds || [],
              isAtAll: options.isAtAll || false,
            };
          }
          break;
        case 'link':
          messageBody.link = {
            title: options?.title || '链接消息',
            text: content,
            messageUrl: content,
            picUrl: '',
          };
          break;
        case 'actionCard':
          messageBody.actionCard = {
            title: options?.title || '卡片消息',
            text: content,
            singleTitle: '查看详情',
            singleURL: '',
          };
          break;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody),
      });
      
      const data = await response.json();

      if (data.errcode !== 0) {
        return {
          success: false,
          error: data.errmsg,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('发送钉钉Webhook消息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送失败',
      };
    }
  }

  async handleWebhook(payload: any): Promise<SocialMessage | null> {
    // 解析钉钉Webhook消息
    try {
      const { msgtype, text, conversationId, senderId, senderNick, createAt, msgId } = payload;

      if (!conversationId) {
        return null;
      }

      let content = '';
      let contentType: MessageType = 'text';

      switch (msgtype) {
        case 'text':
          content = text?.content || '';
          contentType = 'text';
          break;
        case 'picture':
          content = payload.content?.downloadCode || '';
          contentType = 'image';
          break;
        case 'file':
          content = payload.content?.downloadCode || '';
          contentType = 'file';
          break;
        default:
          content = JSON.stringify(payload);
          contentType = 'text';
      }

      return {
        id: msgId || `dingtalk_${Date.now()}`,
        groupId: conversationId,
        senderId: senderId,
        senderName: senderNick,
        content,
        contentType,
        timestamp: new Date(createAt),
        platform: 'dingtalk',
      };
    } catch (error) {
      console.error('解析钉钉Webhook失败:', error);
      return null;
    }
  }

  // 消息类型映射
  private mapMessageType(type: MessageType): string {
    const typeMap: Record<MessageType, string> = {
      text: 'text',
      image: 'image',
      file: 'file',
      voice: 'voice',
      video: 'video',
      link: 'link',
      markdown: 'markdown',
      card: 'action_card',
    };
    return typeMap[type] || 'text';
  }
}

// 导出单例
export const dingtalkService = new DingTalkService();
