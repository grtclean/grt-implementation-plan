/**
 * Alert Notification Integration Service
 * Provides notification channel management, message formatting (WeChat Work, DingTalk, Feishu,
 * Slack, Teams, Webhook), rate limiting, filtering, silence rules, aggregation, and statistics.
 */

// ==================== Types ====================

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'webhook' | 'wechat_work' | 'dingtalk' | 'feishu' | 'slack' | 'teams';
  config: any;
  enabled: boolean;
  filters: Array<AlertFilter>;
  rateLimit: RateLimitConfig;
  createdAt: number;
  updatedAt: number;
}

export interface AlertEvent {
  id: string;
  source: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

export interface NotificationMessage {
  id: string;
  channelId: string;
  alertId: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  payload: any;
  createdAt: number;
  sentAt?: number;
  error?: string;
}

export interface RateLimitState {
  channelId: string;
  minuteCount: number;
  hourCount: number;
  dayCount: number;
  minuteResetAt: number;
  hourResetAt: number;
  dayResetAt: number;
}

export interface SilenceRule {
  id: string;
  name: string;
  matchers: AlertFilter[];
  startsAt: number;
  endsAt: number;
  createdBy: string;
  comment?: string;
  isActive: boolean;
}

interface AlertFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'regex' | 'in' | 'not_in';
  value: any;
}

interface RateLimitConfig {
  enabled: boolean;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// ==================== Constants ====================

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  enabled: true,
  maxPerMinute: 10,
  maxPerHour: 100,
  maxPerDay: 500,
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

// ==================== Channel Management ====================

export function createNotificationChannel(
  name: string,
  type: NotificationChannel['type'],
  config: any
): NotificationChannel {
  return {
    id: `channel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    config,
    enabled: true,
    filters: [],
    rateLimit: DEFAULT_RATE_LIMIT,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function updateNotificationChannel(
  channel: NotificationChannel,
  updates: Partial<NotificationChannel>
): NotificationChannel {
  return {
    ...channel,
    ...updates,
    updatedAt: Date.now(),
  };
}

export function validateChannelConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (config.type) {
    case 'webhook':
      if (!config.url || config.url.trim() === '') {
        errors.push('Webhook URL is required');
      }
      break;

    case 'wechat_work':
      if (!config.webhookUrl || !config.webhookUrl.includes('qyapi.weixin.qq.com')) {
        errors.push('Invalid WeChat Work webhook URL');
      }
      break;

    case 'dingtalk':
      if (!config.webhookUrl || !config.webhookUrl.includes('oapi.dingtalk.com')) {
        errors.push('Invalid DingTalk webhook URL');
      }
      break;

    case 'feishu':
      if (!config.webhookUrl || !config.webhookUrl.includes('open.feishu.cn')) {
        errors.push('Invalid Feishu webhook URL');
      }
      break;

    case 'slack':
      if (!config.webhookUrl || !config.webhookUrl.includes('hooks.slack.com')) {
        errors.push('Invalid Slack webhook URL');
      }
      break;

    case 'teams':
      if (!config.webhookUrl || !config.webhookUrl.includes('outlook.office.com')) {
        errors.push('Invalid Teams webhook URL');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ==================== Message Formatting ====================

const SEVERITY_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨',
};

const SEVERITY_COLOR: Record<string, string> = {
  info: '#3498db',
  warning: '#f39c12',
  error: '#e74c3c',
  critical: '#c0392b',
};

export function formatWechatWorkMessage(alert: AlertEvent, config: any): any {
  if (config.msgType === 'markdown') {
    return {
      msgtype: 'markdown',
      markdown: {
        content: `### ${SEVERITY_EMOJI[alert.severity]} ${alert.title}\n\n**严重程度**: ${alert.severity}\n**来源**: ${alert.source}\n**时间**: ${new Date(alert.timestamp).toLocaleString()}\n\n${alert.message}`,
      },
    };
  }

  return {
    msgtype: 'text',
    text: {
      content: `${SEVERITY_EMOJI[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.title}\n${alert.message}\n来源: ${alert.source}\n时间: ${new Date(alert.timestamp).toLocaleString()}`,
    },
  };
}

export function formatDingtalkMessage(alert: AlertEvent, config: any): any {
  if (config.msgType === 'actionCard') {
    return {
      msgtype: 'actionCard',
      actionCard: {
        title: `${SEVERITY_EMOJI[alert.severity]} ${alert.title}`,
        text: `### ${alert.title}\n\n**严重程度**: ${alert.severity}\n\n${alert.message}`,
        btnOrientation: '0',
        singleTitle: '查看详情',
        singleURL: '#',
      },
      at: { isAtAll: config.isAtAll || false },
    };
  }

  return {
    msgtype: 'text',
    text: {
      content: `${SEVERITY_EMOJI[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.title}\n${alert.message}`,
    },
    at: { isAtAll: config.isAtAll || false, atMobiles: config.atMobiles || [] },
  };
}

export function formatFeishuMessage(alert: AlertEvent, config: any): any {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          tag: 'plain_text',
          content: `${SEVERITY_EMOJI[alert.severity]} ${alert.title}`,
        },
        template: alert.severity === 'critical' ? 'red' : alert.severity === 'error' ? 'orange' : 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**严重程度**: ${alert.severity}\n**来源**: ${alert.source}\n**时间**: ${new Date(alert.timestamp).toLocaleString()}\n\n${alert.message}`,
          },
        },
      ],
    },
  };
}

export function formatSlackMessage(alert: AlertEvent, config: any): any {
  return {
    channel: config.channel || '#alerts',
    username: 'Alert Bot',
    attachments: [
      {
        title: alert.title,
        text: alert.message,
        color: SEVERITY_COLOR[alert.severity],
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Source', value: alert.source, short: true },
        ],
        ts: Math.floor(alert.timestamp / 1000),
      },
    ],
  };
}

export function formatTeamsMessage(alert: AlertEvent, config: any): any {
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: alert.title,
    themeColor: SEVERITY_COLOR[alert.severity],
    title: `${SEVERITY_EMOJI[alert.severity]} ${alert.title}`,
    sections: [
      {
        facts: [
          { name: 'Severity', value: alert.severity },
          { name: 'Source', value: alert.source },
          { name: 'Time', value: new Date(alert.timestamp).toLocaleString() },
        ],
        text: alert.message,
      },
    ],
  };
}

export function formatWebhookMessage(alert: AlertEvent, config: any): any {
  return {
    id: alert.id,
    source: alert.source,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    timestamp: alert.timestamp,
    tags: alert.tags,
    metadata: alert.metadata,
  };
}

// ==================== Rate Limiting ====================

export function createRateLimitState(channelId: string): RateLimitState {
  const now = Date.now();
  return {
    channelId,
    minuteCount: 0,
    hourCount: 0,
    dayCount: 0,
    minuteResetAt: now + 60000,
    hourResetAt: now + 3600000,
    dayResetAt: now + 86400000,
  };
}

export function checkRateLimit(
  state: RateLimitState,
  config: RateLimitConfig
): { allowed: boolean; reason?: string } {
  if (!config.enabled) {
    return { allowed: true };
  }

  const now = Date.now();

  // Reset counters if windows have passed
  const effectiveMinuteCount = now >= state.minuteResetAt ? 0 : state.minuteCount;
  const effectiveHourCount = now >= state.hourResetAt ? 0 : state.hourCount;
  const effectiveDayCount = now >= state.dayResetAt ? 0 : state.dayCount;

  if (effectiveMinuteCount >= config.maxPerMinute) {
    return { allowed: false, reason: `Rate limit exceeded: ${config.maxPerMinute} per minute` };
  }
  if (effectiveHourCount >= config.maxPerHour) {
    return { allowed: false, reason: `Rate limit exceeded: ${config.maxPerHour} per hour` };
  }
  if (effectiveDayCount >= config.maxPerDay) {
    return { allowed: false, reason: `Rate limit exceeded: ${config.maxPerDay} per day` };
  }

  return { allowed: true };
}

export function consumeRateLimit(state: RateLimitState): RateLimitState {
  return {
    ...state,
    minuteCount: state.minuteCount + 1,
    hourCount: state.hourCount + 1,
    dayCount: state.dayCount + 1,
  };
}

// ==================== Filtering ====================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current != null ? current[key] : undefined;
  }, obj);
}

export function applyFilters(alert: AlertEvent, filters: AlertFilter[]): boolean {
  if (!filters || filters.length === 0) return true;

  return filters.every(filter => {
    const value = getNestedValue(alert, filter.field);

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      case 'not_contains':
        return typeof value === 'string' && !value.includes(filter.value);
      case 'regex':
        return typeof value === 'string' && new RegExp(filter.value).test(value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return true;
    }
  });
}

// ==================== Notification Sending ====================

export function createNotificationMessage(
  channel: NotificationChannel,
  alert: AlertEvent
): NotificationMessage {
  let payload: any;

  switch (channel.type) {
    case 'wechat_work':
      payload = formatWechatWorkMessage(alert, channel.config);
      break;
    case 'dingtalk':
      payload = formatDingtalkMessage(alert, channel.config);
      break;
    case 'feishu':
      payload = formatFeishuMessage(alert, channel.config);
      break;
    case 'slack':
      payload = formatSlackMessage(alert, channel.config);
      break;
    case 'teams':
      payload = formatTeamsMessage(alert, channel.config);
      break;
    case 'webhook':
    default:
      payload = formatWebhookMessage(alert, channel.config);
      break;
  }

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    channelId: channel.id,
    alertId: alert.id,
    status: 'pending',
    payload,
    createdAt: Date.now(),
  };
}

export function simulateSendNotification(
  channel: NotificationChannel,
  message: NotificationMessage
): { success: boolean; channelId: string; messageId: string; sentAt: number; duration: number; error?: string } {
  const duration = 50 + Math.random() * 200;
  const success = channel.enabled && Math.random() > 0.05; // 95% success rate

  return {
    success,
    channelId: channel.id,
    messageId: message.id,
    sentAt: Date.now(),
    duration,
    error: success ? undefined : 'Simulated send failure',
  };
}

export function calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
  if (attempt >= policy.maxRetries) return -1;
  const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt);
  return Math.min(delay, policy.maxDelay);
}

// ==================== Statistics ====================

export function calculateStatistics(
  results: Array<{ success: boolean; channelId: string; messageId: string; sentAt: number; duration: number; error?: string }>,
  channelId: string,
  period: 'hour' | 'day' | 'week'
): {
  totalSent: number;
  totalFailed: number;
  avgLatency: number;
  successRate: number;
  period: string;
} {
  const channelResults = results.filter(r => r.channelId === channelId);
  const successful = channelResults.filter(r => r.success);
  const failed = channelResults.filter(r => !r.success);
  const totalSent = successful.length;
  const totalFailed = failed.length;
  const total = channelResults.length;
  const avgLatency =
    total > 0
      ? channelResults.reduce((sum, r) => sum + r.duration, 0) / total
      : 0;
  const successRate = total > 0 ? totalSent / total : 0;

  return {
    totalSent,
    totalFailed,
    avgLatency,
    successRate,
    period,
  };
}

// ==================== Alert Aggregation ====================

export function aggregateAlerts(
  alerts: AlertEvent[],
  config: { enabled: boolean; windowMs: number; maxAlerts: number; groupBy: string[] }
): AlertEvent[] {
  if (!config.enabled) return alerts;

  const groups = new Map<string, AlertEvent[]>();

  for (const alert of alerts) {
    const key = config.groupBy.map(field => (alert as any)[field] ?? '').join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(alert);
  }

  const aggregated: AlertEvent[] = [];
  for (const [_key, groupAlerts] of groups) {
    if (groupAlerts.length === 1) {
      aggregated.push(groupAlerts[0]);
    } else {
      // Use the first alert as the representative, update message with count
      const representative = {
        ...groupAlerts[0],
        message: `${groupAlerts[0].message} (${groupAlerts.length} similar alerts)`,
        metadata: {
          ...groupAlerts[0].metadata,
          aggregatedCount: groupAlerts.length,
        },
      };
      aggregated.push(representative);
    }
  }

  return aggregated;
}

// ==================== Silence Rules ====================

export function isAlertSilenced(
  alert: AlertEvent,
  rules: SilenceRule[]
): { silenced: boolean; rule?: SilenceRule } {
  const now = Date.now();

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (now < rule.startsAt || now > rule.endsAt) continue;

    const matches = applyFilters(alert, rule.matchers);
    if (matches) {
      return { silenced: true, rule };
    }
  }

  return { silenced: false };
}

export function createSilenceRule(
  name: string,
  matchers: AlertFilter[],
  durationMs: number,
  createdBy: string,
  comment?: string
): SilenceRule {
  const now = Date.now();
  return {
    id: `silence_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    matchers,
    startsAt: now,
    endsAt: now + durationMs,
    createdBy,
    comment,
    isActive: true,
  };
}

// ==================== Utilities ====================

export function calculateHmacSignature(secret: string, timestamp: number, data: string): string {
  // Simplified HMAC-like signature for testing purposes
  const input = `${secret}:${timestamp}:${data}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
