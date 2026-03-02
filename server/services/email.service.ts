/**
 * 邮件服务集成模块
 * v1.3.94 - 支持SMTP和第三方邮件服务（SendGrid、AWS SES）
 */

import { env } from "../_core/env";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("email-svc");

// 邮件配置接口
export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'aws-ses' | 'internal';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  awsSes?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  from: {
    name: string;
    email: string;
  };
}

// 邮件内容接口
export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

// 邮件发送结果
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

// 获取邮件配置
function getEmailConfig(): EmailConfig {
  // 检查环境变量确定使用哪种邮件服务
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const awsRegion = process.env.AWS_SES_REGION;
  
  if (sendgridApiKey) {
    return {
      provider: 'sendgrid',
      sendgrid: {
        apiKey: sendgridApiKey,
      },
      from: {
        name: process.env.EMAIL_FROM_NAME || 'GRT智能系统',
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@grt.com',
      },
    };
  }
  
  if (smtpHost) {
    return {
      provider: 'smtp',
      smtp: {
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      from: {
        name: process.env.EMAIL_FROM_NAME || 'GRT智能系统',
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@grt.com',
      },
    };
  }
  
  if (awsRegion) {
    return {
      provider: 'aws-ses',
      awsSes: {
        region: awsRegion,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      from: {
        name: process.env.EMAIL_FROM_NAME || 'GRT智能系统',
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@grt.com',
      },
    };
  }
  
  // 默认使用内部通知系统
  return {
    provider: 'internal',
    from: {
      name: 'GRT智能系统',
      email: 'system@grt.com',
    },
  };
}

// 通过SendGrid发送邮件
async function sendViaSendGrid(config: EmailConfig, message: EmailMessage): Promise<EmailSendResult> {
  if (!config.sendgrid?.apiKey) {
    return { success: false, error: 'SendGrid API key not configured', provider: 'sendgrid' };
  }
  
  try {
    const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.sendgrid.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: toAddresses.map(email => ({ email })),
        }],
        from: {
          email: config.from.email,
          name: config.from.name,
        },
        subject: message.subject,
        content: [
          message.text ? { type: 'text/plain', value: message.text } : null,
          message.html ? { type: 'text/html', value: message.html } : null,
        ].filter(Boolean),
      }),
    });
    
    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
      return { success: true, messageId, provider: 'sendgrid' };
    } else {
      const errorText = await response.text();
      return { success: false, error: `SendGrid error: ${response.status} - ${errorText}`, provider: 'sendgrid' };
    }
  } catch (error) {
    return { success: false, error: `SendGrid exception: ${String(error)}`, provider: 'sendgrid' };
  }
}

// 通过SMTP发送邮件（需要nodemailer）
async function sendViaSMTP(config: EmailConfig, message: EmailMessage): Promise<EmailSendResult> {
  if (!config.smtp) {
    return { success: false, error: 'SMTP not configured', provider: 'smtp' };
  }
  
  try {
    // 动态导入nodemailer
    const nodemailer = await import('nodemailer').catch(() => null);
    
    if (!nodemailer) {
      return { success: false, error: 'nodemailer not installed. Run: pnpm add nodemailer', provider: 'smtp' };
    }
    
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    });
    
    const toAddresses = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    
    const info = await transporter.sendMail({
      from: `"${config.from.name}" <${config.from.email}>`,
      to: toAddresses,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
    
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  } catch (error) {
    return { success: false, error: `SMTP error: ${String(error)}`, provider: 'smtp' };
  }
}

// 通过AWS SES发送邮件
async function sendViaAWSSES(config: EmailConfig, message: EmailMessage): Promise<EmailSendResult> {
  if (!config.awsSes) {
    return { success: false, error: 'AWS SES not configured', provider: 'aws-ses' };
  }
  
  try {
    // 使用AWS SDK v3
    // @ts-expect-error - @aws-sdk/client-ses is an optional dependency
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses').catch(() => ({ SESClient: null, SendEmailCommand: null }));
    
    if (!SESClient || !SendEmailCommand) {
      return { success: false, error: 'AWS SDK not installed. Run: pnpm add @aws-sdk/client-ses', provider: 'aws-ses' };
    }
    
    const client = new SESClient({
      region: config.awsSes.region,
      credentials: {
        accessKeyId: config.awsSes.accessKeyId,
        secretAccessKey: config.awsSes.secretAccessKey,
      },
    });
    
    const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
    
    const command = new SendEmailCommand({
      Source: `${config.from.name} <${config.from.email}>`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: message.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: message.text ? { Data: message.text, Charset: 'UTF-8' } : undefined,
          Html: message.html ? { Data: message.html, Charset: 'UTF-8' } : undefined,
        },
      },
    });
    
    const response = await client.send(command);
    return { success: true, messageId: response.MessageId, provider: 'aws-ses' };
  } catch (error) {
    return { success: false, error: `AWS SES error: ${String(error)}`, provider: 'aws-ses' };
  }
}

// 通过内部通知系统发送（模拟邮件）
async function sendViaInternal(config: EmailConfig, message: EmailMessage): Promise<EmailSendResult> {
  try {
    const { notifyOwner } = await import('../_core/notification');
    
    const toAddresses = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    
    await notifyOwner({
      title: `[邮件] ${message.subject}`,
      content: `收件人: ${toAddresses}\n\n${message.text || message.html || ''}`,
    });
    
    return { success: true, messageId: `internal-${Date.now()}`, provider: 'internal' };
  } catch (error) {
    return { success: false, error: `Internal notification error: ${String(error)}`, provider: 'internal' };
  }
}

// 主发送函数
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const config = getEmailConfig();
  
  log.info({ provider: config.provider, to: Array.isArray(message.to) ? message.to.join(', ') : message.to }, "Sending email");
  
  switch (config.provider) {
    case 'sendgrid':
      return sendViaSendGrid(config, message);
    case 'smtp':
      return sendViaSMTP(config, message);
    case 'aws-ses':
      return sendViaAWSSES(config, message);
    case 'internal':
    default:
      return sendViaInternal(config, message);
  }
}

// 批量发送邮件
export async function sendBulkEmails(messages: EmailMessage[]): Promise<{
  total: number;
  sent: number;
  failed: number;
  results: EmailSendResult[];
}> {
  const results: EmailSendResult[] = [];
  let sent = 0;
  let failed = 0;
  
  for (const message of messages) {
    const result = await sendEmail(message);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    
    // 添加延迟避免速率限制
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {
    total: messages.length,
    sent,
    failed,
    results,
  };
}

// 获取当前邮件服务状态
export function getEmailServiceStatus(): {
  provider: string;
  configured: boolean;
  fromEmail: string;
  fromName: string;
} {
  const config = getEmailConfig();
  
  return {
    provider: config.provider,
    configured: config.provider !== 'internal',
    fromEmail: config.from.email,
    fromName: config.from.name,
  };
}

// 测试邮件服务连接
export async function testEmailService(testEmail: string): Promise<EmailSendResult> {
  return sendEmail({
    to: testEmail,
    subject: '[GRT系统] 邮件服务测试',
    text: `这是一封测试邮件，用于验证GRT智能系统的邮件服务配置是否正确。\n\n发送时间: ${new Date().toLocaleString('zh-CN')}\n\n如果您收到此邮件，说明邮件服务配置正确。`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">GRT智能系统 - 邮件服务测试</h2>
        <p>这是一封测试邮件，用于验证GRT智能系统的邮件服务配置是否正确。</p>
        <p><strong>发送时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">如果您收到此邮件，说明邮件服务配置正确。</p>
      </div>
    `,
  });
}

// 生成HTML邮件模板
export function generateHtmlEmail(options: {
  title: string;
  greeting?: string;
  content: string;
  footer?: string;
  ctaButton?: {
    text: string;
    url: string;
  };
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">GRT智能系统</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${options.greeting ? `<p style="color: #333; font-size: 16px; margin-bottom: 20px;">${options.greeting}</p>` : ''}
              <div style="color: #555; font-size: 14px; line-height: 1.8;">
                ${options.content}
              </div>
              ${options.ctaButton ? `
              <div style="text-align: center; margin-top: 30px;">
                <a href="${options.ctaButton.url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">${options.ctaButton.text}</a>
              </div>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                ${options.footer || '此邮件由GRT智能系统自动发送，请勿直接回复。'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
