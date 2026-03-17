/**
 * 安全系统增强功能服务
 * 功能：告警Webhook配置、日志归档策略
 */

import { requireDb } from "../db";

// ==================== DB Row Types ====================

interface DbExecutable {
  execute(query: string, params?: unknown[]): Promise<[unknown[], unknown]>;
}

interface InsertResult {
  insertId: number;
}

interface DeleteResult {
  affectedRows: number;
}

interface WebhookRow {
  id: number;
  name: string;
  channel_type: string;
  webhook_url: string;
  secret: string | null;
  enabled: boolean;
  alert_types: string;
  min_severity: string;
  rate_limit: number;
  template: string | null;
}

interface PolicyRow {
  id: number;
  name: string;
  log_type: string;
  retention_days: number;
  archive_after_days: number;
  compression_enabled: boolean;
  storage_location: string;
  enabled: boolean;
}

interface CountRow {
  count: number;
  oldest?: string | null;
}

interface TotalRow {
  total: number | null;
}

// ==================== 告警Webhook配置 ====================

export type WebhookChannelType = "dingtalk" | "wecom" | "feishu" | "slack" | "custom";

export interface WebhookConfig {
  id?: number;
  name: string;
  channelType: WebhookChannelType;
  webhookUrl: string;
  secret?: string;
  enabled: boolean;
  alertTypes: string[];
  minSeverity: "low" | "medium" | "high" | "critical";
  rateLimit?: number;
  template?: string;
}

export interface SecurityAlert {
  id: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  timestamp: string;
}

export interface SendResult {
  webhookId: number;
  webhookName: string;
  success: boolean;
  error?: string;
}

export class AlertWebhookService {
  static async saveConfig(config: WebhookConfig, userId: number): Promise<{ id: number }> {
    const db = await requireDb() as unknown as DbExecutable;
    if (config.id) {
      await db.execute(
        `UPDATE alert_webhooks SET name=?, channel_type=?, webhook_url=?, secret=?,
         enabled=?, alert_types=?, min_severity=?, rate_limit=?, template=?, updated_by=?
         WHERE id=?`,
        [config.name, config.channelType, config.webhookUrl, config.secret || null,
         config.enabled, JSON.stringify(config.alertTypes), config.minSeverity,
         config.rateLimit || 60, config.template || null, userId, config.id]
      );
      return { id: config.id };
    } else {
      const [result] = await db.execute(
        `INSERT INTO alert_webhooks (name, channel_type, webhook_url, secret, enabled,
         alert_types, min_severity, rate_limit, template, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [config.name, config.channelType, config.webhookUrl, config.secret || null,
         config.enabled, JSON.stringify(config.alertTypes), config.minSeverity,
         config.rateLimit || 60, config.template || null, userId]
      );
      return { id: (result as unknown as InsertResult).insertId };
    }
  }

  static async getConfigs(): Promise<WebhookConfig[]> {
    const db = await requireDb() as unknown as DbExecutable;
    const [rows] = await db.execute(`SELECT * FROM alert_webhooks ORDER BY created_at DESC`);
    return (rows as WebhookRow[]).map((row) => ({
      id: row.id, name: row.name, channelType: row.channel_type as WebhookChannelType,
      webhookUrl: row.webhook_url, secret: row.secret ?? undefined, enabled: row.enabled,
      alertTypes: JSON.parse(row.alert_types || "[]") as string[], minSeverity: row.min_severity as WebhookConfig['minSeverity'],
      rateLimit: row.rate_limit, template: row.template ?? undefined,
    }));
  }

  static async sendAlert(alert: SecurityAlert): Promise<SendResult[]> {
    const db = await requireDb() as unknown as DbExecutable;
    const results: SendResult[] = [];
    const [rows] = await db.execute(`SELECT * FROM alert_webhooks WHERE enabled = 1`);
    const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

    for (const config of rows as WebhookRow[]) {
      if (severityOrder[alert.severity] < severityOrder[config.min_severity]) continue;
      const alertTypes = JSON.parse(config.alert_types || "[]");
      if (alertTypes.length > 0 && !alertTypes.includes(alert.type)) continue;

      try {
        const message = this.buildMessage(alert, config);
        await this.sendToWebhook(config.channel_type, config.webhook_url, message, config.secret as any);
        await db.execute(
          `INSERT INTO webhook_send_history (webhook_id, alert_id, success, response) VALUES (?, ?, ?, ?)`,
          [config.id, alert.id, true, "{}"]
        );
        results.push({ webhookId: config.id, webhookName: config.name, success: true });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await db.execute(
          `INSERT INTO webhook_send_history (webhook_id, alert_id, success, error_message) VALUES (?, ?, ?, ?)`,
          [config.id, alert.id, false, errMsg]
        );
        results.push({ webhookId: config.id, webhookName: config.name, success: false, error: errMsg });
      }
    }
    return results;
  }

  private static buildMessage(alert: SecurityAlert, config: { channel_type: string }): Record<string, unknown> {
    const severityColors: Record<string, string> = { low: "#36a64f", medium: "#f2c744", high: "#ff9800", critical: "#dc3545" };
    switch (config.channel_type) {
      case "dingtalk":
        return { msgtype: "markdown", markdown: { title: `[${alert.severity}] ${alert.title}`,
          text: `### ${alert.title}\n**严重程度**: ${alert.severity}\n**类型**: ${alert.type}\n**描述**: ${alert.description}\n**时间**: ${alert.timestamp}` }};
      case "wecom":
        return { msgtype: "markdown", markdown: { content: `### ${alert.title}\n> 严重程度: ${alert.severity}\n> 类型: ${alert.type}\n> 描述: ${alert.description}` }};
      case "feishu":
        return { msg_type: "text", content: { text: `[${alert.severity}] ${alert.title}\n${alert.description}` }};
      case "slack":
        return { attachments: [{ color: severityColors[alert.severity], title: alert.title,
          fields: [{ title: "严重程度", value: alert.severity, short: true }, { title: "类型", value: alert.type, short: true }] }]};
      default:
        return { title: alert.title, severity: alert.severity, type: alert.type, description: alert.description };
    }
  }

  private static async sendToWebhook(channelType: string, url: string, message: Record<string, unknown>, secret?: string): Promise<unknown> {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  static async testWebhook(config: WebhookConfig): Promise<{ success: boolean; message: string }> {
    const testAlert: SecurityAlert = { id: 0, title: "测试告警", description: "这是一条测试告警消息", severity: "low", type: "test", timestamp: new Date().toISOString() };
    try {
      const message = this.buildMessage(testAlert, { channel_type: config.channelType });
      await this.sendToWebhook(config.channelType, config.webhookUrl, message, config.secret);
      return { success: true, message: "测试消息发送成功" };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: `发送失败: ${errMsg}` };
    }
  }
}

// ==================== 日志归档策略 ====================

export interface ArchivePolicy {
  id?: number;
  name: string;
  logType: string;
  retentionDays: number;
  archiveAfterDays: number;
  compressionEnabled: boolean;
  storageLocation: string;
  enabled: boolean;
}

export interface ArchiveResult {
  policyId: number;
  policyName: string;
  recordsArchived: number;
  recordsDeleted: number;
  archiveFile: string | null;
  success: boolean;
  message: string;
}

export class LogArchiveService {
  static async savePolicy(policy: ArchivePolicy, userId: number): Promise<{ id: number }> {
    const db = await requireDb() as unknown as DbExecutable;
    if (policy.id) {
      await db.execute(
        `UPDATE archive_policies SET name=?, log_type=?, retention_days=?, archive_after_days=?,
         compression_enabled=?, storage_location=?, enabled=?, updated_by=? WHERE id=?`,
        [policy.name, policy.logType, policy.retentionDays, policy.archiveAfterDays,
         policy.compressionEnabled, policy.storageLocation, policy.enabled, userId, policy.id]
      );
      return { id: policy.id };
    } else {
      const [result] = await db.execute(
        `INSERT INTO archive_policies (name, log_type, retention_days, archive_after_days,
         compression_enabled, storage_location, enabled, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [policy.name, policy.logType, policy.retentionDays, policy.archiveAfterDays,
         policy.compressionEnabled, policy.storageLocation, policy.enabled, userId]
      );
      return { id: (result as unknown as InsertResult).insertId };
    }
  }

  static async getPolicies(): Promise<ArchivePolicy[]> {
    const db = await requireDb() as unknown as DbExecutable;
    const [rows] = await db.execute(`SELECT * FROM archive_policies ORDER BY created_at DESC`);
    return (rows as PolicyRow[]).map((row) => ({
      id: row.id, name: row.name, logType: row.log_type, retentionDays: row.retention_days,
      archiveAfterDays: row.archive_after_days, compressionEnabled: row.compression_enabled,
      storageLocation: row.storage_location, enabled: row.enabled,
    }));
  }

  static async executeArchive(policyId: number): Promise<ArchiveResult> {
    const db = await requireDb() as unknown as DbExecutable;
    const [policyRows] = await db.execute(`SELECT * FROM archive_policies WHERE id = ?`, [policyId]);
    if ((policyRows as PolicyRow[]).length === 0) throw new Error("策略不存在");
    const policy = (policyRows as PolicyRow[])[0];

    const tableMap: Record<string, string> = {
      security_alert: "security_alerts", audit_log: "audit_logs",
      access_log: "access_logs", behavior_probe: "behavior_probes",
    };
    const tableName = tableMap[policy.log_type];
    if (!tableName) throw new Error(`不支持的日志类型: ${policy.log_type}`);

    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - policy.archive_after_days);
    const archiveDateStr = archiveDate.toISOString().split("T")[0];

    const [countRows] = await db.execute(`SELECT COUNT(*) as count FROM ${tableName} WHERE created_at < ?`, [archiveDateStr]);
    const recordCount = (countRows as CountRow[])[0].count;

    if (recordCount === 0) {
      return { policyId, policyName: policy.name, recordsArchived: 0, recordsDeleted: 0, archiveFile: null, success: true, message: "没有需要归档的数据" };
    }

    const archiveId = `ARCH-${Date.now()}-${policy.log_type}`;
    const archiveFile = `${policy.storage_location}/${archiveId}.json${policy.compression_enabled ? ".gz" : ""}`;

    await db.execute(
      `INSERT INTO archive_history (policy_id, archive_id, log_type, record_count, archive_file, status) VALUES (?, ?, ?, ?, ?, 'completed')`,
      [policyId, archiveId, policy.log_type, recordCount, archiveFile]
    );

    let deletedCount = 0;
    if (policy.retention_days > 0) {
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - policy.retention_days);
      const [deleteResult] = await db.execute(`DELETE FROM ${tableName} WHERE created_at < ? LIMIT 10000`, [deleteDate.toISOString().split("T")[0]]);
      deletedCount = (deleteResult as unknown as DeleteResult).affectedRows;
    }

    return { policyId, policyName: policy.name, recordsArchived: recordCount, recordsDeleted: deletedCount, archiveFile, success: true, message: `成功归档 ${recordCount} 条记录` };
  }

  static async getArchiveHistory(policyId?: number, limit: number = 20): Promise<Record<string, unknown>[]> {
    const db = await requireDb() as unknown as DbExecutable;
    let query = `SELECT ah.*, ap.name as policy_name FROM archive_history ah LEFT JOIN archive_policies ap ON ah.policy_id = ap.id WHERE 1=1`;
    const params: unknown[] = [];
    if (policyId) { query += ` AND ah.policy_id = ?`; params.push(policyId); }
    query += ` ORDER BY ah.created_at DESC LIMIT ?`;
    params.push(limit);
    const [rows] = await db.execute(query, params);
    return rows as Record<string, unknown>[];
  }

  static async getStorageStats(): Promise<{ logStats: Record<string, unknown>; totalArchived: number }> {
    const db = await requireDb() as unknown as DbExecutable;
    const tables = [{ name: "security_alerts", type: "security_alert" }, { name: "behavior_probes", type: "behavior_probe" }];
    const stats: Record<string, unknown> = {};
    for (const table of tables) {
      try {
        const [countRows] = await db.execute(`SELECT COUNT(*) as count, MIN(created_at) as oldest FROM ${table.name}`);
        stats[table.type] = { count: (countRows as CountRow[])[0].count, oldestDate: (countRows as CountRow[])[0].oldest };
      } catch { stats[table.type] = { count: 0, oldestDate: null }; }
    }
    const [archiveRows] = await db.execute(`SELECT SUM(record_count) as total FROM archive_history WHERE status = 'completed'`);
    return { logStats: stats, totalArchived: (archiveRows as TotalRow[])[0].total || 0 };
  }
}
