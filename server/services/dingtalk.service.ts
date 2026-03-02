/**
 * 钉钉 API 服务
 * DingTalk API Service
 * 
 * 功能：
 * - 获取访问令牌 (Access Token)
 * - 获取群组列表
 * - 获取群组成员
 * - 发送群消息（通过Webhook机器人）
 * - 获取消息记录
 */

import crypto from 'crypto';
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("dingtalk");

// 钉钉API基础URL
const DINGTALK_API_BASE = 'https://oapi.dingtalk.com';
const DINGTALK_API_V2 = 'https://api.dingtalk.com/v1.0';

// 配置接口
export interface DingTalkConfig {
  appKey: string;        // 应用AppKey
  appSecret: string;     // 应用AppSecret
  agentId?: string;      // 应用AgentId
  robotWebhook?: string; // 群机器人Webhook URL
  robotSecret?: string;  // 群机器人签名密钥
}

// 访问令牌缓存
interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

/**
 * 获取钉钉访问令牌
 */
export async function getAccessToken(config: DingTalkConfig): Promise<string> {
  // 检查缓存是否有效
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const url = `${DINGTALK_API_BASE}/gettoken?appkey=${config.appKey}&appsecret=${config.appSecret}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      access_token?: string;
      expires_in?: number;
    };

    if (data.errcode !== 0) {
      throw new Error(`钉钉API错误: ${data.errmsg} (${data.errcode})`);
    }

    // 缓存令牌，提前5分钟过期
    tokenCache = {
      accessToken: data.access_token!,
      expiresAt: Date.now() + (data.expires_in! - 300) * 1000
    };

    return tokenCache.accessToken;
  } catch (error) {
    log.error({ err: error }, "获取钉钉访问令牌失败");
    throw error;
  }
}

/**
 * 群组信息接口
 */
export interface DingTalkGroup {
  open_conversation_id: string;
  name: string;
  owner: string;
  member_count: number;
  create_time: number;
  icon?: string;
}

/**
 * 获取用户加入的群列表
 * 使用新版API
 */
export async function getUserGroups(config: DingTalkConfig, userId: string): Promise<DingTalkGroup[]> {
  const accessToken = await getAccessToken(config);
  
  const url = `${DINGTALK_API_V2}/im/conversations`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: JSON.stringify({
        userId: userId,
        maxResults: 100
      })
    });
    
    const data = await response.json() as {
      success: boolean;
      result?: {
        conversationList: Array<{
          openConversationId: string;
          title: string;
          ownerUserId: string;
          memberCount: number;
          createTime: number;
          icon?: string;
        }>;
      };
    };

    if (!data.success || !data.result) {
      log.error("获取钉钉群列表失败");
      return [];
    }

    return data.result.conversationList.map(g => ({
      open_conversation_id: g.openConversationId,
      name: g.title,
      owner: g.ownerUserId,
      member_count: g.memberCount,
      create_time: g.createTime,
      icon: g.icon
    }));
  } catch (error) {
    log.error({ err: error }, "获取钉钉群列表失败");
    return [];
  }
}

/**
 * 获取群成员列表
 */
export async function getGroupMembers(
  config: DingTalkConfig,
  openConversationId: string
): Promise<Array<{ userId: string; name: string }>> {
  const accessToken = await getAccessToken(config);
  
  const url = `${DINGTALK_API_V2}/im/conversations/members`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: JSON.stringify({
        openConversationId: openConversationId,
        maxResults: 500
      })
    });
    
    const data = await response.json() as {
      success: boolean;
      result?: {
        memberList: Array<{
          staffId: string;
          name: string;
        }>;
      };
    };

    if (!data.success || !data.result) {
      return [];
    }

    return data.result.memberList.map(m => ({
      userId: m.staffId,
      name: m.name
    }));
  } catch (error) {
    log.error({ err: error }, "获取钉钉群成员失败");
    return [];
  }
}

/**
 * 生成钉钉机器人签名
 */
export function generateSign(timestamp: number, secret: string): string {
  return generateRobotSign(secret, timestamp);
}

function generateRobotSign(secret: string, timestamp: number): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return encodeURIComponent(hmac.digest('base64'));
}

/**
 * 通过Webhook机器人发送群消息
 */
export async function sendRobotMessage(
  webhookUrl: string,
  secret: string | undefined,
  content: string,
  msgType: 'text' | 'markdown' = 'text',
  title?: string,
  atMobiles?: string[],
  atAll?: boolean
): Promise<boolean> {
  let url = webhookUrl;
  
  // 如果有签名密钥，添加签名参数
  if (secret) {
    const timestamp = Date.now();
    const sign = generateRobotSign(secret, timestamp);
    url = `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
  }

  let body: any;
  
  if (msgType === 'text') {
    body = {
      msgtype: 'text',
      text: {
        content: content
      },
      at: {
        atMobiles: atMobiles || [],
        isAtAll: atAll || false
      }
    };
  } else {
    body = {
      msgtype: 'markdown',
      markdown: {
        title: title || '消息通知',
        text: content
      },
      at: {
        atMobiles: atMobiles || [],
        isAtAll: atAll || false
      }
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json() as { errcode: number; errmsg: string };

    if (data.errcode !== 0) {
      log.error({ errmsg: data.errmsg }, "发送钉钉机器人消息失败");
      return false;
    }

    return true;
  } catch (error) {
    log.error({ err: error }, "发送钉钉机器人消息失败");
    return false;
  }
}

/**
 * 通过应用发送工作通知消息
 */
export async function sendWorkNotification(
  config: DingTalkConfig,
  userIds: string[],
  content: string,
  msgType: 'text' | 'markdown' = 'text',
  title?: string
): Promise<boolean> {
  if (!config.agentId) {
    log.error("发送工作通知需要agentId");
    return false;
  }

  const accessToken = await getAccessToken(config);
  
  const url = `${DINGTALK_API_BASE}/topapi/message/corpconversation/asyncsend_v2?access_token=${accessToken}`;
  
  let msg: any;
  if (msgType === 'text') {
    msg = {
      msgtype: 'text',
      text: { content }
    };
  } else {
    msg = {
      msgtype: 'markdown',
      markdown: {
        title: title || '通知',
        text: content
      }
    };
  }

  const body = {
    agent_id: config.agentId,
    userid_list: userIds.join(','),
    msg: msg
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json() as { errcode: number; errmsg: string };

    if (data.errcode !== 0) {
      log.error({ errmsg: data.errmsg }, "发送钉钉工作通知失败");
      return false;
    }

    return true;
  } catch (error) {
    log.error({ err: error }, "发送钉钉工作通知失败");
    return false;
  }
}

/**
 * 获取部门列表
 */
export async function getDepartmentList(config: DingTalkConfig): Promise<Array<{
  dept_id: number;
  name: string;
  parent_id: number;
}>> {
  const accessToken = await getAccessToken(config);
  
  const url = `${DINGTALK_API_BASE}/topapi/v2/department/listsub?access_token=${accessToken}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dept_id: 1 })
    });
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      result?: Array<{
        dept_id: number;
        name: string;
        parent_id: number;
      }>;
    };

    if (data.errcode !== 0) {
      log.error({ errmsg: data.errmsg }, "获取钉钉部门列表失败");
      return [];
    }

    return data.result || [];
  } catch (error) {
    log.error({ err: error }, "获取钉钉部门列表失败");
    return [];
  }
}

/**
 * 获取部门用户列表
 */
export async function getDepartmentUsers(
  config: DingTalkConfig,
  deptId: number
): Promise<Array<{ userid: string; name: string }>> {
  const accessToken = await getAccessToken(config);
  
  const url = `${DINGTALK_API_BASE}/topapi/user/listid?access_token=${accessToken}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dept_id: deptId })
    });
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      result?: {
        userid_list: string[];
      };
    };

    if (data.errcode !== 0 || !data.result) {
      return [];
    }

    // 获取用户详情
    const users: Array<{ userid: string; name: string }> = [];
    for (const userId of data.result.userid_list.slice(0, 50)) {
      const userInfo = await getUserInfo(config, userId);
      if (userInfo) {
        users.push({ userid: userId, name: userInfo.name });
      }
    }

    return users;
  } catch (error) {
    log.error({ err: error }, "获取钉钉部门用户失败");
    return [];
  }
}

/**
 * 获取用户信息
 */
export async function getUserInfo(
  config: DingTalkConfig,
  userId: string
): Promise<{ userid: string; name: string; avatar?: string } | null> {
  const accessToken = await getAccessToken(config);
  
  const url = `${DINGTALK_API_BASE}/topapi/v2/user/get?access_token=${accessToken}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: userId })
    });
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      result?: {
        userid: string;
        name: string;
        avatar?: string;
      };
    };

    if (data.errcode !== 0 || !data.result) {
      return null;
    }

    return data.result;
  } catch (error) {
    log.error({ err: error }, "获取钉钉用户信息失败");
    return null;
  }
}

/**
 * 测试钉钉连接
 */
export async function testConnection(config: DingTalkConfig): Promise<{
  success: boolean;
  message: string;
  corpName?: string;
}> {
  try {
    const accessToken = await getAccessToken(config);
    
    // 获取企业信息验证连接
    const url = `${DINGTALK_API_BASE}/topapi/v2/department/get?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dept_id: 1 })
    });
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      result?: { name: string };
    };

    if (data.errcode === 0 && data.result) {
      return {
        success: true,
        message: '钉钉连接成功',
        corpName: data.result.name
      };
    }

    return {
      success: true,
      message: '钉钉连接成功（无法获取企业名称）'
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 测试机器人Webhook连接
 */
export async function testRobotWebhook(
  webhookUrl: string,
  secret?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sendRobotMessage(
      webhookUrl,
      secret,
      '🔔 GRT系统连接测试\n\n这是一条测试消息，用于验证钉钉机器人Webhook配置是否正确。',
      'text'
    );

    if (result) {
      return {
        success: true,
        message: '机器人Webhook连接成功，测试消息已发送'
      };
    } else {
      return {
        success: false,
        message: '机器人Webhook连接失败，请检查URL和签名密钥'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}
