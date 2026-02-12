/**
 * 钉钉Webhook加签测试脚本
 * 支持加签安全设置
 */

import crypto from 'crypto';

// 钉钉Webhook配置
const DINGTALK_WEBHOOK_URL = 'https://oapi.dingtalk.com/robot/send?access_token=8d003ada94b037153ee995bdfe955049e378af2b7e54e6bb87b686c959893b6c';
const DINGTALK_SECRET = 'SEC179f421330c60dae9e928cdcafced74e38c80b2df72062e7eb08c14f98043235';

/**
 * 生成钉钉加签签名
 * @param timestamp 时间戳（毫秒）
 * @param secret 加签密钥
 * @returns Base64编码的签名
 */
function generateDingTalkSign(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  const sign = hmac.digest('base64');
  return encodeURIComponent(sign);
}

/**
 * 发送钉钉消息（带加签）
 */
export async function sendDingTalkMessageWithSign(
  webhookUrl: string,
  secret: string,
  message: {
    title: string;
    content: string;
    type?: 'text' | 'markdown';
    atAll?: boolean;
  }
): Promise<{ success: boolean; error?: string; response?: any }> {
  // 生成时间戳和签名
  const timestamp = Date.now();
  const sign = generateDingTalkSign(timestamp, secret);
  
  // 构建带签名的URL
  const signedUrl = `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
  
  // 构建消息体（包含关键词"1"以满足自定义关键词要求）
  let payload: any;
  
  if (message.type === 'markdown') {
    payload = {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        // 在内容中包含关键词"1"
        text: `### ${message.title}\n\n${message.content}\n\n---\n[1]`,
      },
      at: {
        isAtAll: message.atAll || false,
      },
    };
  } else {
    payload = {
      msgtype: 'text',
      text: {
        // 在内容中包含关键词"1"
        content: `${message.title}\n\n${message.content}\n\n[1]`,
      },
      at: {
        isAtAll: message.atAll || false,
      },
    };
  }
  
  try {
    const response = await fetch(signedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      return { success: true, response: result };
    } else {
      return { 
        success: false, 
        error: `钉钉API错误: ${result.errcode} - ${result.errmsg}`,
        response: result 
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 测试钉钉Webhook连接
 */
export async function testDingTalkWebhook(): Promise<void> {
  console.log('🔔 开始测试钉钉Webhook连接...\n');
  
  const testMessage = {
    title: '🔔 GRT系统连接测试',
    content: `这是一条来自GRT智能系统的测试消息。\n\n` +
      `⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}\n` +
      `📡 Webhook类型: 钉钉群机器人\n` +
      `🔐 安全设置: 加签 + 自定义关键词`,
    type: 'markdown' as const,
  };
  
  console.log('📤 发送测试消息...');
  console.log(`   标题: ${testMessage.title}`);
  console.log(`   类型: ${testMessage.type}`);
  
  const result = await sendDingTalkMessageWithSign(
    DINGTALK_WEBHOOK_URL,
    DINGTALK_SECRET,
    testMessage
  );
  
  if (result.success) {
    console.log('\n✅ 钉钉Webhook测试成功！');
    console.log('   消息已成功发送到钉钉群');
  } else {
    console.log('\n❌ 钉钉Webhook测试失败');
    console.log(`   错误: ${result.error}`);
    if (result.response) {
      console.log(`   响应: ${JSON.stringify(result.response)}`);
    }
  }
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDingTalkWebhook().catch(console.error);
}
