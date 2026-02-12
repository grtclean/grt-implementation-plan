/**
 * 社群平台统一接口定义
 * 支持企业微信、钉钉、飞书等平台的统一抽象
 */

// 平台类型
export type SocialPlatformType = 'wecom' | 'dingtalk' | 'feishu' | 'wechat';

// 群组信息
export interface SocialGroup {
  id: string;           // 平台群组ID
  name: string;         // 群组名称
  platform: SocialPlatformType;
  memberCount?: number;
  ownerName?: string;
  ownerId?: string;
  createdAt?: Date;
  avatarUrl?: string;
  description?: string;
}

// 消息类型
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'link' | 'markdown' | 'card';

// 消息信息
export interface SocialMessage {
  id: string;           // 消息ID
  groupId: string;      // 群组ID
  senderId: string;     // 发送者ID
  senderName?: string;  // 发送者名称
  content: string;      // 消息内容
  contentType: MessageType;
  timestamp: Date;
  platform: SocialPlatformType;
  // 附件信息
  attachments?: {
    type: 'image' | 'file' | 'voice' | 'video';
    url: string;
    name?: string;
    size?: number;
  }[];
  // @提及
  mentions?: {
    userId: string;
    userName: string;
    offset: number;
    length: number;
  }[];
}

// 发送消息请求
export interface SendMessageRequest {
  groupId: string;
  content: string;
  contentType: MessageType;
  // 可选：@某人
  mentionUserIds?: string[];
  // 可选：@所有人
  mentionAll?: boolean;
  // 可选：附件
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  }[];
}

// 发送消息响应
export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// 平台配置
export interface PlatformConfig {
  platform: SocialPlatformType;
  enabled: boolean;
  // 企业微信配置
  wecom?: {
    corpId: string;
    agentId: string;
    secret: string;
    token?: string;
    encodingAESKey?: string;
  };
  // 钉钉配置
  dingtalk?: {
    appKey: string;
    appSecret: string;
    agentId: string;
    robotCode?: string;
  };
  // 飞书配置
  feishu?: {
    appId: string;
    appSecret: string;
  };
}

// 平台统一接口
export interface ISocialPlatformService {
  platform: SocialPlatformType;
  
  // 初始化/认证
  initialize(config: PlatformConfig): Promise<void>;
  
  // 获取访问令牌
  getAccessToken(): Promise<string>;
  
  // 群组操作
  getGroups(): Promise<SocialGroup[]>;
  getGroupInfo(groupId: string): Promise<SocialGroup | null>;
  
  // 消息操作
  getMessages(groupId: string, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<SocialMessage[]>;
  
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
  
  // Webhook处理
  handleWebhook(payload: any): Promise<SocialMessage | null>;
}

// 平台统计
export interface PlatformStats {
  platform: SocialPlatformType;
  groupCount: number;
  todayMessageCount: number;
  activeGroupCount: number;
  lastSyncTime?: Date;
}
