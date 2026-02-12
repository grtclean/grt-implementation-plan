/**
 * 企业IM通知服务
 * 支持飞书、企业微信、Teams等多种通知渠道
 */

// 通知渠道类型
export type NotificationChannel = 'feishu' | 'wechat_work' | 'teams' | 'email' | 'sms';

// 通知配置接口
export interface NotificationConfig {
  channel: NotificationChannel;
  enabled: boolean;
  webhookUrl?: string;
  appId?: string;
  appSecret?: string;
  botToken?: string;
}

// 通知消息接口
export interface NotificationMessage {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  projectCode?: string;
  stageCode?: string;
  actionUrl?: string;
  mentions?: string[]; // @提及的用户
}

// 飞书消息格式
interface FeishuMessage {
  msg_type: 'interactive' | 'text' | 'post';
  card?: {
    config: { wide_screen_mode: boolean };
    header: { title: { tag: string; content: string }; template: string };
    elements: Array<{
      tag: string;
      text?: { tag: string; content: string };
      actions?: Array<{ tag: string; text: { tag: string; content: string }; url: string; type: string }>;
    }>;
  };
  content?: string;
}

// 企业微信消息格式
interface WechatWorkMessage {
  msgtype: 'markdown' | 'text' | 'news';
  markdown?: { content: string };
  text?: { content: string; mentioned_list?: string[] };
}

// Teams消息格式
interface TeamsMessage {
  '@type': 'MessageCard';
  '@context': string;
  themeColor: string;
  summary: string;
  sections: Array<{
    activityTitle: string;
    facts: Array<{ name: string; value: string }>;
    markdown: boolean;
  }>;
  potentialAction?: Array<{
    '@type': string;
    name: string;
    targets: Array<{ os: string; uri: string }>;
  }>;
}

/**
 * 发送飞书通知
 */
export async function sendFeishuNotification(
  webhookUrl: string,
  message: NotificationMessage
): Promise<{ success: boolean; error?: string }> {
  const colorMap = {
    info: 'blue',
    warning: 'orange',
    error: 'red',
    success: 'green',
  };

  const feishuMessage: FeishuMessage = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: message.title },
        template: colorMap[message.type],
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: message.content },
        },
      ],
    },
  };

  // 添加项目和阶段信息
  if (message.projectCode || message.stageCode) {
    feishuMessage.card!.elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**项目**: ${message.projectCode || '-'} | **阶段**: ${message.stageCode || '-'}`,
      },
    });
  }

  // 添加操作按钮
  if (message.actionUrl) {
    feishuMessage.card!.elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '查看详情' },
          url: message.actionUrl,
          type: 'primary',
        },
      ],
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feishuMessage),
    });

    if (!response.ok) {
      return { success: false, error: `飞书API错误: ${response.status}` };
    }

    const result = await response.json();
    if (result.code !== 0) {
      return { success: false, error: result.msg || '飞书发送失败' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '网络错误' };
  }
}

/**
 * 发送企业微信通知
 */
export async function sendWechatWorkNotification(
  webhookUrl: string,
  message: NotificationMessage
): Promise<{ success: boolean; error?: string }> {
  const iconMap = {
    info: '📋',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  };

  let content = `${iconMap[message.type]} **${message.title}**\n\n${message.content}`;

  if (message.projectCode || message.stageCode) {
    content += `\n\n> 项目: ${message.projectCode || '-'} | 阶段: ${message.stageCode || '-'}`;
  }

  if (message.actionUrl) {
    content += `\n\n[查看详情](${message.actionUrl})`;
  }

  const wechatMessage: WechatWorkMessage = {
    msgtype: 'markdown',
    markdown: { content },
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wechatMessage),
    });

    if (!response.ok) {
      return { success: false, error: `企业微信API错误: ${response.status}` };
    }

    const result = await response.json();
    if (result.errcode !== 0) {
      return { success: false, error: result.errmsg || '企业微信发送失败' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '网络错误' };
  }
}

/**
 * 发送Teams通知
 */
export async function sendTeamsNotification(
  webhookUrl: string,
  message: NotificationMessage
): Promise<{ success: boolean; error?: string }> {
  const colorMap = {
    info: '0078D7',
    warning: 'FFA500',
    error: 'FF0000',
    success: '00FF00',
  };

  const teamsMessage: TeamsMessage = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: colorMap[message.type],
    summary: message.title,
    sections: [
      {
        activityTitle: message.title,
        facts: [
          { name: '内容', value: message.content },
        ],
        markdown: true,
      },
    ],
  };

  if (message.projectCode) {
    teamsMessage.sections[0].facts.push({ name: '项目', value: message.projectCode });
  }
  if (message.stageCode) {
    teamsMessage.sections[0].facts.push({ name: '阶段', value: message.stageCode });
  }

  if (message.actionUrl) {
    teamsMessage.potentialAction = [
      {
        '@type': 'OpenUri',
        name: '查看详情',
        targets: [{ os: 'default', uri: message.actionUrl }],
      },
    ];
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsMessage),
    });

    if (!response.ok) {
      return { success: false, error: `Teams API错误: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '网络错误' };
  }
}

/**
 * 统一通知发送接口
 */
export async function sendNotification(
  config: NotificationConfig,
  message: NotificationMessage
): Promise<{ success: boolean; error?: string; channel: NotificationChannel }> {
  if (!config.enabled) {
    return { success: false, error: '通知渠道未启用', channel: config.channel };
  }

  if (!config.webhookUrl) {
    return { success: false, error: '未配置Webhook URL', channel: config.channel };
  }

  switch (config.channel) {
    case 'feishu':
      const feishuResult = await sendFeishuNotification(config.webhookUrl, message);
      return { ...feishuResult, channel: 'feishu' };

    case 'wechat_work':
      const wechatResult = await sendWechatWorkNotification(config.webhookUrl, message);
      return { ...wechatResult, channel: 'wechat_work' };

    case 'teams':
      const teamsResult = await sendTeamsNotification(config.webhookUrl, message);
      return { ...teamsResult, channel: 'teams' };

    default:
      return { success: false, error: `不支持的通知渠道: ${config.channel}`, channel: config.channel };
  }
}

/**
 * 批量发送通知到多个渠道
 */
export async function sendNotificationToAllChannels(
  configs: NotificationConfig[],
  message: NotificationMessage
): Promise<Array<{ success: boolean; error?: string; channel: NotificationChannel }>> {
  const enabledConfigs = configs.filter(c => c.enabled);
  
  if (enabledConfigs.length === 0) {
    return [{ success: false, error: '没有启用的通知渠道', channel: 'feishu' }];
  }

  const results = await Promise.all(
    enabledConfigs.map(config => sendNotification(config, message))
  );

  return results;
}

// 预定义的通知模板
export const NotificationTemplates = {
  // 项目状态变更
  projectStatusChange: (projectCode: string, oldStatus: string, newStatus: string, actionUrl?: string): NotificationMessage => ({
    title: '项目状态变更',
    content: `项目 **${projectCode}** 状态已从 \`${oldStatus}\` 变更为 \`${newStatus}\``,
    type: 'info',
    projectCode,
    actionUrl,
  }),

  // 阶段评审结果
  stageReviewResult: (projectCode: string, stageCode: string, result: 'approved' | 'rejected', reviewer: string, actionUrl?: string): NotificationMessage => ({
    title: result === 'approved' ? '阶段评审通过' : '阶段评审驳回',
    content: `项目 **${projectCode}** 的 **${stageCode}** 阶段评审${result === 'approved' ? '已通过' : '被驳回'}，评审人: ${reviewer}`,
    type: result === 'approved' ? 'success' : 'warning',
    projectCode,
    stageCode,
    actionUrl,
  }),

  // 风险预警
  riskAlert: (projectCode: string, riskLevel: string, riskDesc: string, actionUrl?: string): NotificationMessage => ({
    title: '项目风险预警',
    content: `项目 **${projectCode}** 出现 **${riskLevel}** 级风险：${riskDesc}`,
    type: riskLevel === '高' ? 'error' : 'warning',
    projectCode,
    actionUrl,
  }),

  // 任务到期提醒
  taskDueReminder: (projectCode: string, stageCode: string, taskName: string, dueDate: string, assignee: string, actionUrl?: string): NotificationMessage => ({
    title: '任务即将到期',
    content: `任务 **${taskName}** 将于 **${dueDate}** 到期，负责人: ${assignee}`,
    type: 'warning',
    projectCode,
    stageCode,
    actionUrl,
    mentions: [assignee],
  }),

  // PO建议生成
  poSuggestionGenerated: (projectCode: string, itemCount: number, actionUrl?: string): NotificationMessage => ({
    title: 'PO建议已生成',
    content: `项目 **${projectCode}** 已生成 **${itemCount}** 条采购建议，请及时确认`,
    type: 'info',
    projectCode,
    actionUrl,
  }),

  // MES工单状态更新
  mesWorkOrderUpdate: (projectCode: string, workOrderId: string, status: string, progress: number, actionUrl?: string): NotificationMessage => ({
    title: 'MES工单状态更新',
    content: `工单 **${workOrderId}** 状态更新为 **${status}**，进度: ${progress}%`,
    type: progress === 100 ? 'success' : 'info',
    projectCode,
    actionUrl,
  }),

  // 版本激活通知
  versionActivated: (projectCode: string, versionCode: string, activatedBy: string, actionUrl?: string): NotificationMessage => ({
    title: '项目版本已激活',
    content: `项目 **${projectCode}** 的版本 **${versionCode}** 已被 ${activatedBy} 激活`,
    type: 'success',
    projectCode,
    actionUrl,
  }),
};
