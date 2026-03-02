/**
 * 企业微信API服务模块
 * 实现企业微信群组管理和消息同步
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
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger('wecom-platform');

// 企业微信API基础URL
const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

// 访问令牌缓存
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class WeComService implements ISocialPlatformService {
  platform: 'wecom' = 'wecom';
  private config: PlatformConfig['wecom'] | null = null;
  private tokenCache: TokenCache | null = null;

  async initialize(config: PlatformConfig): Promise<void> {
    if (!config.wecom) {
      throw new Error('企业微信配置缺失');
    }
    this.config = config.wecom;
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
    const url = `${WECOM_API_BASE}/gettoken?corpid=${this.config.corpId}&corpsecret=${this.config.secret}`;
    
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
      log.error({ err: error }, "获取企业微信访问令牌失败");
      throw error;
    }
  }

  async getGroups(): Promise<SocialGroup[]> {
    const accessToken = await this.getAccessToken();
    
    // 获取应用可见的群聊列表
    // 注意：企业微信需要通过会话存档或其他方式获取群列表
    // 这里使用群聊列表接口
    const url = `${WECOM_API_BASE}/appchat/get?access_token=${accessToken}`;
    
    try {
      // 企业微信没有直接的群列表接口，需要通过其他方式获取
      // 这里返回从数据库同步的群组
      // 实际使用时需要通过Webhook接收群聊事件来维护群列表
      return [];
    } catch (error) {
      log.error({ err: error }, "获取企业微信群组列表失败");
      return [];
    }
  }

  async getGroupInfo(groupId: string): Promise<SocialGroup | null> {
    const accessToken = await this.getAccessToken();
    const url = `${WECOM_API_BASE}/appchat/get?access_token=${accessToken}&chatid=${groupId}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode !== 0) {
        log.error({ errmsg: data.errmsg }, "获取群信息失败");
        return null;
      }

      return {
        id: data.chat_info.chatid,
        name: data.chat_info.name,
        platform: 'wecom',
        ownerName: data.chat_info.owner,
        memberCount: data.chat_info.userlist?.length || 0,
      };
    } catch (error) {
      log.error({ err: error }, "获取企业微信群信息失败");
      return null;
    }
  }

  async getMessages(groupId: string, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<SocialMessage[]> {
    // 企业微信需要通过会话存档API获取消息
    // 这里返回空数组，实际消息通过Webhook接收
    log.info("企业微信消息通过Webhook接收，不支持主动拉取");
    return [];
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const accessToken = await this.getAccessToken();
    const url = `${WECOM_API_BASE}/appchat/send?access_token=${accessToken}`;
    
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
            content: request.content,
          };
          break;
        case 'image':
          if (request.attachments?.[0]) {
            messageBody.image = {
              media_id: request.attachments[0].url, // 需要先上传获取media_id
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
        messageId: data.msgid,
      };
    } catch (error) {
      log.error({ err: error }, "发送企业微信消息失败");
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送失败',
      };
    }
  }

  async handleWebhook(payload: any): Promise<SocialMessage | null> {
    // 解析企业微信Webhook消息
    try {
      const { MsgType, Content, FromUserName, CreateTime, MsgId, ChatId } = payload;

      if (!ChatId) {
        // 非群聊消息，忽略
        return null;
      }

      return {
        id: MsgId || `wecom_${Date.now()}`,
        groupId: ChatId,
        senderId: FromUserName,
        content: Content || '',
        contentType: this.parseMessageType(MsgType),
        timestamp: new Date(CreateTime * 1000),
        platform: 'wecom',
      };
    } catch (error) {
      log.error({ err: error }, "解析企业微信Webhook失败");
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
      link: 'news',
      markdown: 'markdown',
      card: 'textcard',
    };
    return typeMap[type] || 'text';
  }

  private parseMessageType(wecomType: string): MessageType {
    const typeMap: Record<string, MessageType> = {
      text: 'text',
      image: 'image',
      voice: 'voice',
      video: 'video',
      file: 'file',
      link: 'link',
    };
    return typeMap[wecomType] || 'text';
  }
}

// 导出单例
export const wecomService = new WeComService();
