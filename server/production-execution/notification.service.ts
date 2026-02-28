/**
 * 审批通知推送服务
 * Approval Notification Push Service
 * 
 * 功能：
 * - 将审批请求和结果推送到企业微信/钉钉
 * - 支持多种通知渠道（WeCom、DingTalk、Email、SMS）
 * - 支持消息模板和多语言
 * - 支持审批提醒和超时升级
 */

import { notifyOwner } from '../_core/notification';

// ============================================================================
// 类型定义
// ============================================================================

export type NotificationChannel = 'WECOM' | 'DINGTALK' | 'EMAIL' | 'SMS' | 'SYSTEM';
export type NotificationType = 
  | 'APPROVAL_REQUEST'      // 审批请求
  | 'APPROVAL_APPROVED'     // 审批通过
  | 'APPROVAL_REJECTED'     // 审批拒绝
  | 'APPROVAL_REMINDER'     // 审批提醒
  | 'APPROVAL_ESCALATION'   // 审批升级
  | 'STAGE_STARTED'         // 阶段开始
  | 'STAGE_COMPLETED'       // 阶段完成
  | 'STAGE_ALERT'           // 阶段异常
  | 'TIME_RECORD_CREATED'   // 工时记录创建
  | 'UWB_SYNC_COMPLETED';   // UWB同步完成

export interface NotificationConfig {
  channel: NotificationChannel;
  enabled: boolean;
  webhookUrl?: string;
  apiKey?: string;
  corpId?: string;
  agentId?: string;
  templateId?: string;
}

export interface NotificationRecipient {
  userId: number;
  userName: string;
  email?: string;
  phone?: string;
  wecomId?: string;
  dingtalkId?: string;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  titleZh: string;
  content: string;
  contentZh: string;
  projectId?: number;
  projectName?: string;
  stageCode?: string;
  stageName?: string;
  approvalId?: number;
  requestedBy?: string;
  approverId?: string;
  status?: string;
  actionUrl?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

// ============================================================================
// 消息模板
// ============================================================================

const MESSAGE_TEMPLATES: Record<NotificationType, { title: string; titleZh: string; template: string; templateZh: string }> = {
  APPROVAL_REQUEST: {
    title: '🔔 New Approval Request',
    titleZh: '🔔 新审批请求',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Requested By**: {{requestedBy}}
**Type**: {{approvalType}}

Please review and approve/reject this request.

[Click to Review]({{actionUrl}})`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**申请人**: {{requestedBy}}
**类型**: {{approvalType}}

请审核并批准/拒绝此请求。

[点击查看]({{actionUrl}})`,
  },
  
  APPROVAL_APPROVED: {
    title: '✅ Approval Approved',
    titleZh: '✅ 审批已通过',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Approved By**: {{approverId}}
**Comments**: {{comments}}

The approval request has been approved.`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**审批人**: {{approverId}}
**备注**: {{comments}}

审批请求已通过。`,
  },
  
  APPROVAL_REJECTED: {
    title: '❌ Approval Rejected',
    titleZh: '❌ 审批已拒绝',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Rejected By**: {{approverId}}
**Reason**: {{rejectionReason}}

The approval request has been rejected.`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**审批人**: {{approverId}}
**原因**: {{rejectionReason}}

审批请求已被拒绝。`,
  },
  
  APPROVAL_REMINDER: {
    title: '⏰ Approval Reminder',
    titleZh: '⏰ 审批提醒',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Pending Since**: {{pendingSince}}

This approval request is still pending. Please review.

[Click to Review]({{actionUrl}})`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**等待时间**: {{pendingSince}}

此审批请求仍在等待中，请尽快审核。

[点击查看]({{actionUrl}})`,
  },
  
  APPROVAL_ESCALATION: {
    title: '🚨 Approval Escalation',
    titleZh: '🚨 审批升级',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Original Approver**: {{originalApprover}}
**Escalated To**: {{escalatedTo}}

This approval has been escalated due to timeout.

[Click to Review]({{actionUrl}})`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**原审批人**: {{originalApprover}}
**升级至**: {{escalatedTo}}

由于超时，此审批已升级处理。

[点击查看]({{actionUrl}})`,
  },
  
  STAGE_STARTED: {
    title: '▶️ Stage Started',
    titleZh: '▶️ 阶段开始',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Started By**: {{startedBy}}
**Planned Hours**: {{plannedHours}}h

Stage execution has started.`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**启动人**: {{startedBy}}
**计划工时**: {{plannedHours}}小时

阶段执行已开始。`,
  },
  
  STAGE_COMPLETED: {
    title: '✅ Stage Completed',
    titleZh: '✅ 阶段完成',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Actual Hours**: {{actualHours}}h
**Variance**: {{variance}}%

Stage has been completed successfully.`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**实际工时**: {{actualHours}}小时
**偏差**: {{variance}}%

阶段已成功完成。`,
  },
  
  STAGE_ALERT: {
    title: '⚠️ Stage Alert',
    titleZh: '⚠️ 阶段异常',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}} - {{stageName}}
**Alert Type**: {{alertType}}
**Description**: {{alertDescription}}

Immediate attention required.

[Click to View]({{actionUrl}})`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}} - {{stageName}}
**异常类型**: {{alertType}}
**描述**: {{alertDescription}}

需要立即处理。

[点击查看]({{actionUrl}})`,
  },
  
  TIME_RECORD_CREATED: {
    title: '⏱️ Time Record Created',
    titleZh: '⏱️ 工时记录已创建',
    template: `**Project**: {{projectName}}
**Stage**: {{stageCode}}
**User**: {{userName}}
**Duration**: {{duration}} minutes
**Source**: {{sourceType}}`,
    templateZh: `**项目**: {{projectName}}
**阶段**: {{stageCode}}
**用户**: {{userName}}
**时长**: {{duration}} 分钟
**来源**: {{sourceType}}`,
  },
  
  UWB_SYNC_COMPLETED: {
    title: '📡 UWB Sync Completed',
    titleZh: '📡 UWB同步完成',
    template: `**Synced Records**: {{syncedRecords}}
**Errors**: {{errorCount}}
**Timestamp**: {{timestamp}}`,
    templateZh: `**同步记录数**: {{syncedRecords}}
**错误数**: {{errorCount}}
**时间戳**: {{timestamp}}`,
  },
};

// ============================================================================
// 通知服务类
// ============================================================================

export class NotificationService {
  private configs: Map<NotificationChannel, NotificationConfig> = new Map();
  private defaultLanguage: 'en' | 'zh' = 'zh';

  constructor() {
    this.loadConfigurations();
  }

  /**
   * 加载通知配置
   */
  private loadConfigurations(): void {
    // 从环境变量加载配置
    const wecomWebhook = process.env.WECOM_WEBHOOK_URL;
    const dingtalkWebhook = process.env.DINGTALK_WEBHOOK_URL;

    if (wecomWebhook) {
      this.configs.set('WECOM', {
        channel: 'WECOM',
        enabled: true,
        webhookUrl: wecomWebhook,
      });
    }

    if (dingtalkWebhook) {
      this.configs.set('DINGTALK', {
        channel: 'DINGTALK',
        enabled: true,
        webhookUrl: dingtalkWebhook,
      });
    }

    // 系统通知始终启用
    this.configs.set('SYSTEM', {
      channel: 'SYSTEM',
      enabled: true,
    });
  }

  /**
   * 发送通知
   */
  public async send(
    payload: NotificationPayload,
    recipients: NotificationRecipient[],
    channels: NotificationChannel[] = ['SYSTEM']
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channel of channels) {
      const config = this.configs.get(channel);
      
      if (!config || !config.enabled) {
        results.push({
          success: false,
          channel,
          error: `Channel ${channel} is not configured or disabled`,
          timestamp: new Date(),
        });
        continue;
      }

      try {
        const result = await this.sendToChannel(channel, config, payload, recipients);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          channel,
          error: String(error),
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(
    channel: NotificationChannel,
    config: NotificationConfig,
    payload: NotificationPayload,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'WECOM':
        return this.sendToWeCom(config, payload, recipients);
      case 'DINGTALK':
        return this.sendToDingTalk(config, payload, recipients);
      case 'EMAIL':
        return this.sendToEmail(config, payload, recipients);
      case 'SMS':
        return this.sendToSMS(config, payload, recipients);
      case 'SYSTEM':
        return this.sendToSystem(payload);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * 发送到企业微信
   */
  private async sendToWeCom(
    config: NotificationConfig,
    payload: NotificationPayload,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult> {
    if (!config.webhookUrl) {
      return {
        success: false,
        channel: 'WECOM',
        error: 'WeCom webhook URL not configured',
        timestamp: new Date(),
      };
    }

    const template = MESSAGE_TEMPLATES[payload.type];
    const title = this.defaultLanguage === 'zh' ? template.titleZh : template.title;
    const content = this.renderTemplate(
      this.defaultLanguage === 'zh' ? template.templateZh : template.template,
      payload
    );

    // 构建企业微信消息格式
    const message = {
      msgtype: 'markdown',
      markdown: {
        content: `### ${title}\n\n${content}`,
      },
    };

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.errcode === 0) {
        return {
          success: true,
          channel: 'WECOM',
          messageId: result.msgid,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          channel: 'WECOM',
          error: result.errmsg || 'Unknown error',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        channel: 'WECOM',
        error: String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * 发送到钉钉
   */
  private async sendToDingTalk(
    config: NotificationConfig,
    payload: NotificationPayload,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult> {
    if (!config.webhookUrl) {
      return {
        success: false,
        channel: 'DINGTALK',
        error: 'DingTalk webhook URL not configured',
        timestamp: new Date(),
      };
    }

    const template = MESSAGE_TEMPLATES[payload.type];
    const title = this.defaultLanguage === 'zh' ? template.titleZh : template.title;
    const content = this.renderTemplate(
      this.defaultLanguage === 'zh' ? template.templateZh : template.template,
      payload
    );

    // 构建钉钉消息格式
    const message = {
      msgtype: 'markdown',
      markdown: {
        title: title,
        text: `### ${title}\n\n${content}`,
      },
      at: {
        atMobiles: recipients.map(r => r.phone).filter(Boolean),
        isAtAll: false,
      },
    };

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.errcode === 0) {
        return {
          success: true,
          channel: 'DINGTALK',
          messageId: result.msgid,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          channel: 'DINGTALK',
          error: result.errmsg || 'Unknown error',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        channel: 'DINGTALK',
        error: String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendToEmail(
    config: NotificationConfig,
    payload: NotificationPayload,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult> {
    // 邮件发送需要配置SMTP服务器
    // 这里使用系统通知作为备选
    console.log('[Notification] Email channel not fully implemented, falling back to system notification');
    return this.sendToSystem(payload);
  }

  /**
   * 发送短信通知
   */
  private async sendToSMS(
    config: NotificationConfig,
    payload: NotificationPayload,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult> {
    // 短信发送需要配置短信网关
    // 这里使用系统通知作为备选
    console.log('[Notification] SMS channel not fully implemented, falling back to system notification');
    return this.sendToSystem(payload);
  }

  /**
   * 发送系统通知（使用Manus内置通知）
   */
  private async sendToSystem(payload: NotificationPayload): Promise<NotificationResult> {
    const template = MESSAGE_TEMPLATES[payload.type];
    const title = this.defaultLanguage === 'zh' ? template.titleZh : template.title;
    const content = this.renderTemplate(
      this.defaultLanguage === 'zh' ? template.templateZh : template.template,
      payload
    );

    try {
      const success = await notifyOwner({
        title: title.replace(/[🔔✅❌⏰🚨▶️⚠️⏱️📡]/g, '').trim(),
        content: content,
      });

      return {
        success,
        channel: 'SYSTEM',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        channel: 'SYSTEM',
        error: String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * 渲染消息模板
   */
  private renderTemplate(template: string, payload: NotificationPayload): string {
    let result = template;
    
    // 替换标准字段
    const replacements: Record<string, string> = {
      '{{projectName}}': payload.projectName || '-',
      '{{stageCode}}': payload.stageCode || '-',
      '{{stageName}}': payload.stageName || '-',
      '{{requestedBy}}': payload.requestedBy || '-',
      '{{approverId}}': payload.approverId || '-',
      '{{status}}': payload.status || '-',
      '{{actionUrl}}': payload.actionUrl || '#',
    };

    // 替换元数据字段
    if (payload.metadata) {
      for (const [key, value] of Object.entries(payload.metadata)) {
        replacements[`{{${key}}}`] = String(value);
      }
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * 设置默认语言
   */
  public setDefaultLanguage(language: 'en' | 'zh'): void {
    this.defaultLanguage = language;
  }

  /**
   * 更新渠道配置
   */
  public updateConfig(channel: NotificationChannel, config: Partial<NotificationConfig>): void {
    const existing = this.configs.get(channel) || { channel, enabled: false };
    this.configs.set(channel, { ...existing, ...config });
  }

  /**
   * 获取渠道配置
   */
  public getConfig(channel: NotificationChannel): NotificationConfig | undefined {
    return this.configs.get(channel);
  }

  /**
   * 获取所有已配置的渠道
   */
  public getConfiguredChannels(): NotificationChannel[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([channel]) => channel);
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

const notificationService = new NotificationService();

/**
 * 发送审批请求通知
 */
export async function notifyApprovalRequest(
  projectId: number,
  projectName: string,
  stageCode: string,
  stageName: string,
  requestedBy: string,
  approvalType: string,
  actionUrl: string,
  recipients: NotificationRecipient[]
): Promise<NotificationResult[]> {
  return notificationService.send(
    {
      type: 'APPROVAL_REQUEST',
      title: 'New Approval Request',
      titleZh: '新审批请求',
      content: '',
      contentZh: '',
      projectId,
      projectName,
      stageCode,
      stageName,
      requestedBy,
      actionUrl,
      metadata: { approvalType },
    },
    recipients,
    notificationService.getConfiguredChannels()
  );
}

/**
 * 发送审批结果通知
 */
export async function notifyApprovalResult(
  projectId: number,
  projectName: string,
  stageCode: string,
  stageName: string,
  approverId: string,
  status: 'APPROVED' | 'REJECTED',
  comments: string,
  rejectionReason: string,
  recipients: NotificationRecipient[]
): Promise<NotificationResult[]> {
  return notificationService.send(
    {
      type: status === 'APPROVED' ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
      title: status === 'APPROVED' ? 'Approval Approved' : 'Approval Rejected',
      titleZh: status === 'APPROVED' ? '审批已通过' : '审批已拒绝',
      content: '',
      contentZh: '',
      projectId,
      projectName,
      stageCode,
      stageName,
      approverId,
      status,
      metadata: { comments, rejectionReason },
    },
    recipients,
    notificationService.getConfiguredChannels()
  );
}

/**
 * 发送阶段状态通知
 */
export async function notifyStageStatus(
  projectId: number,
  projectName: string,
  stageCode: string,
  stageName: string,
  status: 'STARTED' | 'COMPLETED' | 'ALERT',
  metadata: Record<string, unknown>,
  recipients: NotificationRecipient[]
): Promise<NotificationResult[]> {
  const typeMap: Record<string, NotificationType> = {
    STARTED: 'STAGE_STARTED',
    COMPLETED: 'STAGE_COMPLETED',
    ALERT: 'STAGE_ALERT',
  };

  return notificationService.send(
    {
      type: typeMap[status],
      title: `Stage ${status}`,
      titleZh: status === 'STARTED' ? '阶段开始' : status === 'COMPLETED' ? '阶段完成' : '阶段异常',
      content: '',
      contentZh: '',
      projectId,
      projectName,
      stageCode,
      stageName,
      metadata,
    },
    recipients,
    notificationService.getConfiguredChannels()
  );
}

export { notificationService };
