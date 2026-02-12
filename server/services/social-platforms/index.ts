/**
 * 社群平台管理器
 * 统一管理企业微信、钉钉、飞书等平台的连接和消息同步
 */

import {
  ISocialPlatformService,
  PlatformConfig,
  SocialPlatformType,
  SocialGroup,
  SocialMessage,
  SendMessageRequest,
  SendMessageResponse,
  PlatformStats,
} from './types';
import { WeComService } from './wecom.service';
import { DingTalkService, dingtalkService } from './dingtalk.service';

// 平台服务实例缓存
const platformServices: Map<SocialPlatformType, ISocialPlatformService> = new Map();

// 平台配置缓存
const platformConfigs: Map<SocialPlatformType, PlatformConfig> = new Map();

/**
 * 初始化平台服务
 */
export async function initializePlatform(config: PlatformConfig): Promise<void> {
  let service: ISocialPlatformService;

  switch (config.platform) {
    case 'wecom':
      service = new WeComService();
      break;
    case 'dingtalk':
      service = new DingTalkService();
      break;
    case 'feishu':
      // TODO: 实现飞书服务
      throw new Error('飞书服务暂未实现');
    default:
      throw new Error(`不支持的平台类型: ${config.platform}`);
  }

  await service.initialize(config);
  platformServices.set(config.platform, service);
  platformConfigs.set(config.platform, config);
}

/**
 * 获取平台服务
 */
export function getPlatformService(platform: SocialPlatformType): ISocialPlatformService | null {
  return platformServices.get(platform) || null;
}

/**
 * 获取所有已初始化的平台
 */
export function getInitializedPlatforms(): SocialPlatformType[] {
  return Array.from(platformServices.keys());
}

/**
 * 获取所有平台的群组
 */
export async function getAllGroups(): Promise<SocialGroup[]> {
  const allGroups: SocialGroup[] = [];
  
  for (const [platform, service] of Array.from(platformServices)) {
    try {
      const groups = await service.getGroups();
      allGroups.push(...groups);
    } catch (error) {
      console.error(`获取${platform}群组失败:`, error);
    }
  }
  
  return allGroups;
}

/**
 * 发送消息到指定平台
 */
export async function sendMessage(
  platform: SocialPlatformType,
  request: SendMessageRequest
): Promise<SendMessageResponse> {
  const service = platformServices.get(platform);
  
  if (!service) {
    return {
      success: false,
      error: `平台${platform}未初始化`,
    };
  }
  
  return service.sendMessage(request);
}

/**
 * 发送钉钉Webhook消息（群机器人）
 */
export async function sendDingTalkWebhook(
  webhookUrl: string,
  content: string,
  options?: {
    msgtype?: 'text' | 'markdown' | 'link' | 'actionCard';
    title?: string;
    atMobiles?: string[];
    atUserIds?: string[];
    isAtAll?: boolean;
  }
): Promise<SendMessageResponse> {
  return dingtalkService.sendWebhookMessage(webhookUrl, content, options);
}

/**
 * 处理Webhook消息
 */
export async function handleWebhook(
  platform: SocialPlatformType,
  payload: any
): Promise<SocialMessage | null> {
  const service = platformServices.get(platform);
  
  if (!service) {
    console.error(`平台${platform}未初始化，无法处理Webhook`);
    return null;
  }
  
  return service.handleWebhook(payload);
}

/**
 * 获取平台统计
 */
export async function getPlatformStats(): Promise<PlatformStats[]> {
  const stats: PlatformStats[] = [];
  
  for (const [platform, service] of Array.from(platformServices)) {
    try {
      const groups = await service.getGroups();
      stats.push({
        platform,
        groupCount: groups.length,
        todayMessageCount: 0, // 需要从数据库获取
        activeGroupCount: groups.length,
        lastSyncTime: new Date(),
      });
    } catch (error) {
      console.error(`获取${platform}统计失败:`, error);
      stats.push({
        platform,
        groupCount: 0,
        todayMessageCount: 0,
        activeGroupCount: 0,
      });
    }
  }
  
  return stats;
}

// 导出类型
export * from './types';
export { WeComService } from './wecom.service';
export { DingTalkService, dingtalkService } from './dingtalk.service';
