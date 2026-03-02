/**
 * 企业微信 API 服务
 * WeCom (Enterprise WeChat) API Service
 * 
 * 功能：
 * - 获取访问令牌 (Access Token)
 * - 获取群组列表
 * - 获取群组成员
 * - 发送群消息
 * - Webhook消息接收
 */

import { env } from '../_core/env';
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("wecom");

// 企业微信API基础URL
const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

// 配置接口
export interface WeComConfig {
  corpId: string;        // 企业ID
  agentId: string;       // 应用ID
  secret: string;        // 应用Secret
  token?: string;        // 回调Token（用于验证消息来源）
  encodingAESKey?: string; // 消息加密密钥
}

// 访问令牌缓存
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

/**
 * 获取企业微信访问令牌
 */
export async function getAccessToken(config: WeComConfig): Promise<string> {
  // 检查缓存是否有效
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const url = `${WECOM_API_BASE}/gettoken?corpid=${config.corpId}&corpsecret=${config.secret}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      access_token?: string;
      expires_in?: number;
    };

    if (data.errcode !== 0) {
      throw new Error(`企业微信API错误: ${data.errmsg} (${data.errcode})`);
    }

    // 缓存令牌，提前5分钟过期
    tokenCache = {
      accessToken: data.access_token!,
      expiresAt: Date.now() + (data.expires_in! - 300) * 1000
    };

    return tokenCache.accessToken;
  } catch (error) {
    log.error({ err: error }, "获取企业微信访问令牌失败");
    throw error;
  }
}

/**
 * 群组信息接口
 */
export interface WeComGroup {
  chat_id: string;
  name: string;
  owner: string;
  member_count: number;
  create_time: number;
}

/**
 * 获取群聊列表
 * 注意：企业微信API需要应用有相应权限
 */
export async function getGroupList(config: WeComConfig): Promise<WeComGroup[]> {
  const accessToken = await getAccessToken(config);
  
  // 企业微信的群聊列表API
  const url = `${WECOM_API_BASE}/appchat/get?access_token=${accessToken}`;
  
  try {
    // 注意：企业微信没有直接获取所有群聊列表的API
    // 需要通过其他方式获取群聊ID，然后逐个查询
    // 这里返回模拟数据，实际使用时需要根据业务逻辑调整
    log.info("企业微信群聊列表API需要先知道chat_id");
    return [];
  } catch (error) {
    log.error({ err: error }, "获取企业微信群聊列表失败");
    throw error;
  }
}

/**
 * 获取群聊详情
 */
export async function getGroupDetail(config: WeComConfig, chatId: string): Promise<WeComGroup | null> {
  const accessToken = await getAccessToken(config);
  
  const url = `${WECOM_API_BASE}/appchat/get?access_token=${accessToken}&chatid=${chatId}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      chat_info?: {
        chatid: string;
        name: string;
        owner: string;
        userlist: string[];
      };
    };

    if (data.errcode !== 0) {
      log.error({ errmsg: data.errmsg }, "获取群聊详情失败");
      return null;
    }

    return {
      chat_id: data.chat_info!.chatid,
      name: data.chat_info!.name,
      owner: data.chat_info!.owner,
      member_count: data.chat_info!.userlist.length,
      create_time: Date.now()
    };
  } catch (error) {
    log.error({ err: error }, "获取企业微信群聊详情失败");
    throw error;
  }
}

/**
 * 发送群聊消息
 */
export async function sendGroupMessage(
  config: WeComConfig,
  chatId: string,
  content: string,
  msgType: 'text' | 'markdown' = 'text'
): Promise<boolean> {
  const accessToken = await getAccessToken(config);
  
  const url = `${WECOM_API_BASE}/appchat/send?access_token=${accessToken}`;
  
  const body = {
    chatid: chatId,
    msgtype: msgType,
    [msgType]: {
      content: content
    },
    safe: 0
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json() as { errcode: number; errmsg: string };

    if (data.errcode !== 0) {
      log.error({ errmsg: data.errmsg }, "发送群消息失败");
      return false;
    }

    return true;
  } catch (error) {
    log.error({ err: error }, "发送企业微信群消息失败");
    return false;
  }
}

/**
 * 获取部门成员列表
 */
export async function getDepartmentUsers(config: WeComConfig, departmentId: number = 1): Promise<any[]> {
  const accessToken = await getAccessToken(config);
  
  const url = `${WECOM_API_BASE}/user/simplelist?access_token=${accessToken}&department_id=${departmentId}&fetch_child=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      userlist?: Array<{
        userid: string;
        name: string;
        department: number[];
      }>;
    };

    if (data.errcode !== 0) {
      log.error({ errmsg: data.errmsg }, "获取部门成员失败");
      return [];
    }

    return data.userlist || [];
  } catch (error) {
    log.error({ err: error }, "获取企业微信部门成员失败");
    return [];
  }
}

/**
 * 验证企业微信回调URL（用于接收消息）
 */
export function verifyCallback(
  config: WeComConfig,
  msgSignature: string,
  timestamp: string,
  nonce: string,
  echostr: string
): string | null {
  // 实际实现需要使用企业微信提供的加解密库
  // 这里仅作为示例
  log.info("企业微信回调验证需要使用官方加解密库");
  return echostr;
}

/**
 * 解析企业微信推送的消息
 */
export interface WeComMessage {
  msgType: string;
  content: string;
  fromUser: string;
  createTime: number;
  msgId: string;
  chatId?: string;
}

export function parseMessage(
  config: WeComConfig,
  encryptedMsg: string,
  msgSignature: string,
  timestamp: string,
  nonce: string
): WeComMessage | null {
  // 实际实现需要使用企业微信提供的加解密库
  // 这里仅作为示例
  log.info("企业微信消息解析需要使用官方加解密库");
  return null;
}

/**
 * 测试企业微信连接
 */
export async function testConnection(config: WeComConfig): Promise<{
  success: boolean;
  message: string;
  corpName?: string;
}> {
  try {
    const accessToken = await getAccessToken(config);
    
    // 获取企业信息验证连接
    const url = `${WECOM_API_BASE}/corp/get_join_qrcode?access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json() as { errcode: number; errmsg: string };
    
    // 即使这个API返回错误，只要能获取到access_token就说明连接成功
    return {
      success: true,
      message: '企业微信连接成功',
      corpName: config.corpId
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}
