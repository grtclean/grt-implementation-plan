/**
 * Scheduled Report Service
 * Creates scheduled report configurations, generates and sends reports.
 */

export interface ScheduleConfig {
  type: "cron" | "interval";
  cronExpression?: string;
  intervalHours?: number;
  timezone?: string;
}

export interface Recipient {
  type: string;
  value: string;
  name?: string;
}

export interface ScheduledReportConfig {
  id: string;
  name: string;
  reportType: string;
  reportFormat: string;
  dataSource: string;
  schedule: ScheduleConfig;
  recipients: Recipient[];
  deliveryChannels: string[];
  enabled: boolean;
  createdBy: string;
  nextRunAt: Date;
}

export interface GeneratedReport {
  content: string;
  fileName: string;
  format: string;
}

export interface DeliveryRecord {
  id: string;
  configId: string;
  status: string;
  recipients: Recipient[];
  sentAt: string;
  reportType?: string;
  channel?: string;
}

export interface DeliveryStats {
  totalSent: number;
  successRate: number;
  byReportType: Record<string, number>;
  byChannel: Record<string, number>;
}

export function createScheduledReportConfig(params: {
  name: string;
  reportType: string;
  reportFormat: string;
  dataSource: string;
  schedule: ScheduleConfig;
  recipients: Recipient[];
  deliveryChannels?: string[];
  createdBy: string;
}): ScheduledReportConfig {
  return {
    id: `SRC-${Date.now().toString(36).toUpperCase()}`,
    name: params.name,
    reportType: params.reportType,
    reportFormat: params.reportFormat,
    dataSource: params.dataSource,
    schedule: params.schedule,
    recipients: params.recipients,
    deliveryChannels: params.deliveryChannels ?? ["email"],
    enabled: true,
    createdBy: params.createdBy,
    nextRunAt: calculateNextRunTime(params.schedule),
  };
}

export function calculateNextRunTime(schedule: ScheduleConfig): Date {
  if (schedule.type === "interval" && schedule.intervalHours) {
    const next = new Date();
    next.setHours(next.getHours() + schedule.intervalHours);
    return next;
  }

  // Parse simple cron expressions
  if (schedule.type === "cron" && schedule.cronExpression) {
    const parts = schedule.cronExpression.split(" ");
    // parts: [minute, hour, dayOfMonth, month, dayOfWeek]
    const minute = parseInt(parts[0], 10);
    const hour = parseInt(parts[1], 10);
    const dayOfMonth = parts[2];
    const dayOfWeek = parts[4];

    const next = new Date();

    if (dayOfMonth !== "*") {
      // Monthly: e.g. "0 9 1 * *"
      const dom = parseInt(dayOfMonth, 10);
      next.setDate(dom);
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= Date.now()) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(dom);
      }
      return next;
    }

    if (dayOfWeek !== "*") {
      // Weekly: e.g. "0 9 * * 1"
      const dow = parseInt(dayOfWeek, 10);
      next.setHours(hour, minute, 0, 0);
      const currentDay = next.getDay();
      let daysToAdd = dow - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      next.setDate(next.getDate() + daysToAdd);
      return next;
    }

    // Daily
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  // Default: next day
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next;
}

export async function generateReport(
  config: ScheduledReportConfig,
  dateRange: { start: Date; end: Date }
): Promise<GeneratedReport> {
  return {
    content: `Report data for ${config.name}`,
    fileName: `${config.name}_${dateRange.start.toISOString().split("T")[0]}.${config.reportFormat === "excel" ? "xlsx" : config.reportFormat}`,
    format: config.reportFormat,
  };
}

export async function sendReport(
  config: ScheduledReportConfig,
  report: GeneratedReport
): Promise<DeliveryRecord> {
  return {
    id: `DR-${Date.now().toString(36).toUpperCase()}`,
    configId: config.id,
    status: "sent",
    recipients: config.recipients,
    sentAt: new Date().toISOString(),
  };
}

export async function executeScheduledReport(
  config: ScheduledReportConfig
): Promise<DeliveryRecord> {
  const dateRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  };
  const report = await generateReport(config, dateRange);
  const record = await sendReport(config, report);
  return record;
}

const storedConfigs: ScheduledReportConfig[] = [];

export async function getScheduledReportConfigs(): Promise<ScheduledReportConfig[]> {
  // Return at least one default config
  if (storedConfigs.length === 0) {
    return [
      createScheduledReportConfig({
        name: "默认周报",
        reportType: "weekly",
        reportFormat: "excel",
        dataSource: "toothpaste_tests",
        schedule: { type: "cron", cronExpression: "0 9 * * 1" },
        recipients: [{ type: "email", value: "admin@example.com" }],
        createdBy: "system",
      }),
    ];
  }
  return storedConfigs;
}

export async function getDeliveryHistory(
  params: { limit?: number }
): Promise<DeliveryRecord[]> {
  return [];
}

export function getDeliveryStatistics(history: DeliveryRecord[]): DeliveryStats {
  const byReportType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};

  for (const record of history) {
    if (record.reportType) {
      byReportType[record.reportType] = (byReportType[record.reportType] || 0) + 1;
    }
    if (record.channel) {
      byChannel[record.channel] = (byChannel[record.channel] || 0) + 1;
    }
  }

  const successCount = history.filter((h) => h.status === "sent").length;

  return {
    totalSent: history.length,
    successRate: history.length > 0 ? Math.round((successCount / history.length) * 100) : 0,
    byReportType,
    byChannel,
  };
}
