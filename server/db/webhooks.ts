/**
 * Webhook configuration, templates, and batch operations
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  costAlertRules, webhookConfigs, InsertWebhookConfig, WebhookConfig,
  webhookLogs, InsertWebhookLog, WebhookLog, webhookTemplates,
  WebhookTemplate,
} from "../../drizzle/schema";

// ============================================
// Webhook Configuration Management Functions
// ============================================

/**
 * Get all webhook configurations
 */
export async function getWebhookConfigs(): Promise<WebhookConfig[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(webhookConfigs).orderBy(desc(webhookConfigs.createdAt)).limit(1000);
}

/**
 * Get enabled webhook configurations by event type
 */
export async function getEnabledWebhooksByEvent(eventType: string): Promise<WebhookConfig[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const allConfigs = await db.select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.enabled, true as any))
    .limit(1000);
  
  // Filter by event type (stored as JSON array in triggerEvents)
  return allConfigs.filter(config => {
    if (!config.triggerEvents) return true; // If no specific events, trigger for all
    try {
      const events = JSON.parse(config.triggerEvents);
      return events.includes(eventType) || events.includes('all');
    } catch {
      return true;
    }
  });
}

/**
 * Create a new webhook configuration
 */
export async function createWebhookConfig(data: InsertWebhookConfig): Promise<WebhookConfig | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(webhookConfigs).values(data) as any;
  const insertId = result[0]?.insertId ?? result.insertId;

  const [created] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, insertId));
  return created || null;
}

/**
 * Update a webhook configuration
 */
export async function updateWebhookConfig(id: number, data: Partial<InsertWebhookConfig>): Promise<WebhookConfig | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(webhookConfigs).set(data).where(eq(webhookConfigs.id, id));
  
  const [updated] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, id));
  return updated || null;
}

/**
 * Delete a webhook configuration
 */
export async function deleteWebhookConfig(id: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  await db.delete(webhookConfigs).where(eq(webhookConfigs.id, id));
  return true;
}

/**
 * Log a webhook delivery attempt
 */
export async function logWebhookDelivery(data: InsertWebhookLog): Promise<WebhookLog | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(webhookLogs).values(data) as any;
  const insertId = result[0]?.insertId ?? result.insertId;

  const [created] = await db.select().from(webhookLogs).where(eq(webhookLogs.id, insertId));
  return created || null;
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookLogs(webhookId?: number, limit: number = 50): Promise<WebhookLog[]> {
  const db = await requireDb();
  if (!db) return [];
  
  if (webhookId) {
    return db.select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.sentAt))
      .limit(limit);
  }
  
  return db.select()
    .from(webhookLogs)
    .orderBy(desc(webhookLogs.sentAt))
    .limit(limit);
}


// ============================================
// Webhook Template Management Functions
// ============================================

/**
 * Get all webhook templates
 */
export async function getWebhookTemplates(): Promise<WebhookTemplate[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(webhookTemplates).orderBy(desc(webhookTemplates.createdAt)).limit(1000);
}

/**
 * Get webhook templates by event type
 */
export async function getWebhookTemplatesByEvent(eventType: string): Promise<WebhookTemplate[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(webhookTemplates)
    .where(eq(webhookTemplates.eventType, eventType))
    .limit(1000);
}

/**
 * Get webhook template by ID
 */
export async function getWebhookTemplateById(id: number): Promise<WebhookTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(webhookTemplates)
    .where(eq(webhookTemplates.id, id));
  
  return results[0] || null;
}

/**
 * Create a new webhook template
 */
export async function createWebhookTemplate(data: {
  name: string;
  eventType: string;
  webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom';
  titleTemplate: string;
  contentTemplate: string;
  availableVariables?: string;
  isDefault?: boolean;
  createdBy?: number;
}): Promise<WebhookTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(webhookTemplates).values({
    name: data.name,
    eventType: data.eventType,
    webhookType: data.webhookType,
    titleTemplate: data.titleTemplate,
    contentTemplate: data.contentTemplate,
    availableVariables: data.availableVariables || null,
    isDefault: data.isDefault || false,
    createdBy: data.createdBy || null,
  } as any) as any;

  const insertId = result[0]?.insertId ?? result.insertId;
  return getWebhookTemplateById(insertId);
}

/**
 * Update a webhook template
 */
export async function updateWebhookTemplate(
  id: number,
  data: Partial<{
    name: string;
    eventType: string;
    webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom';
    titleTemplate: string;
    contentTemplate: string;
    availableVariables: string;
    isDefault: boolean;
  }>
): Promise<{ success: boolean }> {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.update(webhookTemplates)
    .set(data as any)
    .where(eq(webhookTemplates.id, id));
  
  return { success: true };
}

/**
 * Delete a webhook template
 */
export async function deleteWebhookTemplate(id: number): Promise<{ success: boolean }> {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.delete(webhookTemplates).where(eq(webhookTemplates.id, id));
  return { success: true };
}

/**
 * Get default template for event type and webhook type
 */
export async function getDefaultTemplate(
  eventType: string,
  webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom'
): Promise<WebhookTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(webhookTemplates)
    .where(
      and(
        eq(webhookTemplates.eventType, eventType),
        eq(webhookTemplates.webhookType, webhookType),
        eq(webhookTemplates.isDefault, true as any)
      )
    )
    .limit(1000);

  return results[0] || null;
}

/**
 * Initialize default webhook templates
 */
export async function initDefaultWebhookTemplates(): Promise<{ created: number }> {
  const db = await requireDb();
  if (!db) return { created: 0 };
  
  const defaultTemplates = [
    // Cost Alert Templates
    {
      name: '成本预警-企业微信',
      eventType: 'cost_alert',
      webhookType: 'wecom' as const,
      titleTemplate: '{{levelEmoji}} 成本预警: {{title}}',
      contentTemplate: `**项目**: {{projectName}}
**预警级别**: {{alertLevel}}
**当前值**: {{currentValue}}
**阈值**: {{threshold}}
**规则**: {{ruleName}}
**时间**: {{time}}`,
      availableVariables: JSON.stringify(['title', 'projectName', 'alertLevel', 'currentValue', 'threshold', 'ruleName', 'time', 'levelEmoji']),
      isDefault: true,
    },
    {
      name: '成本预警-钉钉',
      eventType: 'cost_alert',
      webhookType: 'dingtalk' as const,
      titleTemplate: '{{levelEmoji}} 成本预警: {{title}}',
      contentTemplate: `**项目**: {{projectName}}
**预警级别**: {{alertLevel}}
**当前值**: {{currentValue}}
**阈值**: {{threshold}}
**规则**: {{ruleName}}
**时间**: {{time}}`,
      availableVariables: JSON.stringify(['title', 'projectName', 'alertLevel', 'currentValue', 'threshold', 'ruleName', 'time', 'levelEmoji']),
      isDefault: true,
    },
    // Meeting Reminder Templates
    {
      name: '会议提醒-企业微信',
      eventType: 'meeting_reminder',
      webhookType: 'wecom' as const,
      titleTemplate: '📅 会议提醒: {{title}}',
      contentTemplate: `**会议主题**: {{title}}
**开始时间**: {{startTime}}
**会议地点**: {{location}}
**会议类型**: {{meetingType}}
**参与人员**: {{participants}}`,
      availableVariables: JSON.stringify(['title', 'startTime', 'location', 'meetingType', 'participants', 'description']),
      isDefault: true,
    },
    {
      name: '会议提醒-钉钉',
      eventType: 'meeting_reminder',
      webhookType: 'dingtalk' as const,
      titleTemplate: '📅 会议提醒: {{title}}',
      contentTemplate: `**会议主题**: {{title}}
**开始时间**: {{startTime}}
**会议地点**: {{location}}
**会议类型**: {{meetingType}}
**参与人员**: {{participants}}`,
      availableVariables: JSON.stringify(['title', 'startTime', 'location', 'meetingType', 'participants', 'description']),
      isDefault: true,
    },
    // Training Complete Templates
    {
      name: '培训完成-企业微信',
      eventType: 'training_complete',
      webhookType: 'wecom' as const,
      titleTemplate: '🎓 培训完成通知: {{trainingName}}',
      contentTemplate: `**培训名称**: {{trainingName}}
**培训类型**: {{trainingType}}
**完成人数**: {{completedCount}}/{{totalCount}}
**通过率**: {{passRate}}%
**平均成绩**: {{avgScore}}`,
      availableVariables: JSON.stringify(['trainingName', 'trainingType', 'completedCount', 'totalCount', 'passRate', 'avgScore']),
      isDefault: true,
    },
  ];
  
  let created = 0;
  for (const template of defaultTemplates) {
    // Check if default template already exists
    const existing = await getDefaultTemplate(template.eventType, template.webhookType);
    if (!existing) {
      await createWebhookTemplate(template);
      created++;
    }
  }
  
  return { created };
}

/**
 * Apply template to generate message content
 */
export function applyWebhookTemplate(
  template: WebhookTemplate,
  variables: Record<string, string | number>
): { title: string; content: string } {
  let title = template.titleTemplate;
  let content = template.contentTemplate;
  
  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), String(value));
    content = content.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return { title, content };
}


// ============================================
// Cost Alert Rules Batch Import (v1.3.7)
// ============================================

/**
 * Batch import cost alert rules from Excel/CSV data
 * @param rules Array of rule data to import
 * @param userId User performing the import
 * @returns Import result with success/failure counts
 */
export async function batchImportCostAlertRules(
  rules: Array<{
    name: string;
    description?: string;
    scope?: "all" | "project" | "category";
    projectId?: number;
    categoryId?: number;
    alertType: "budget_percent" | "absolute_amount" | "cpi";
    threshold: number;
    alertLevel: "warning" | "critical" | "emergency";
    notifyType?: "email" | "system" | "both";
    notifyUserIds?: string;
    isActive?: number;
  }>,
  userId: number
) {
  const db = await requireDb();
  if (!db) return { success: 0, failed: 0, errors: ["Database connection failed"] };
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    try {
      // Validate required fields
      if (!rule.name || !rule.alertType || rule.threshold === undefined) {
        throw new Error(`Row ${i + 1}: Missing required fields (name, alertType, threshold)`);
      }
      
      // Validate threshold based on alert type
      if (rule.alertType === "budget_percent" && (rule.threshold < 0 || rule.threshold > 200)) {
        throw new Error(`Row ${i + 1}: Budget percent threshold must be between 0 and 200`);
      }
      if (rule.alertType === "cpi" && (rule.threshold < 0 || rule.threshold > 2)) {
        throw new Error(`Row ${i + 1}: CPI threshold must be between 0 and 2`);
      }
      
      // Insert the rule
      await db.insert(costAlertRules).values({
        name: rule.name,
        description: rule.description || null,
        scope: rule.scope || "all",
        projectId: rule.projectId || null,
        categoryId: rule.categoryId || null,
        alertType: rule.alertType,
        threshold: rule.alertType === "cpi" ? Math.round(rule.threshold * 100) : rule.threshold,
        alertLevel: rule.alertLevel,
        notifyType: rule.notifyType || "system",
        notifyUserIds: rule.notifyUserIds || null,
        isActive: rule.isActive ?? 1,
      });
      
      success++;
    } catch (error: any) {
      failed++;
      errors.push(error.message || `Row ${i + 1}: Unknown error`);
    }
  }
  
  return { success, failed, errors };
}

/**
 * Parse CSV content to cost alert rules
 * @param csvContent CSV file content as string
 * @returns Parsed rules array
 */
export function parseCostAlertRulesFromCSV(csvContent: string): Array<{
  name: string;
  description?: string;
  scope?: "all" | "project" | "category";
  projectId?: number;
  categoryId?: number;
  alertType: "budget_percent" | "absolute_amount" | "cpi";
  threshold: number;
  alertLevel: "warning" | "critical" | "emergency";
  notifyType?: "email" | "system" | "both";
  notifyUserIds?: string;
  isActive?: number;
}> {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const rules: any[] = [];
  
  // Map column names to field names
  const columnMap: Record<string, string> = {
    "规则名称": "name",
    "name": "name",
    "描述": "description",
    "description": "description",
    "适用范围": "scope",
    "scope": "scope",
    "项目id": "projectId",
    "projectid": "projectId",
    "类别id": "categoryId",
    "categoryid": "categoryId",
    "预警类型": "alertType",
    "alerttype": "alertType",
    "阈值": "threshold",
    "threshold": "threshold",
    "预警级别": "alertLevel",
    "alertlevel": "alertLevel",
    "通知方式": "notifyType",
    "notifytype": "notifyType",
    "通知用户": "notifyUserIds",
    "notifyuserids": "notifyUserIds",
    "是否启用": "isActive",
    "isactive": "isActive",
  };
  
  // Map alert type values
  const alertTypeMap: Record<string, string> = {
    "预算百分比": "budget_percent",
    "budget_percent": "budget_percent",
    "绝对金额": "absolute_amount",
    "absolute_amount": "absolute_amount",
    "cpi指数": "cpi",
    "cpi": "cpi",
  };
  
  // Map alert level values
  const alertLevelMap: Record<string, string> = {
    "警告": "warning",
    "warning": "warning",
    "严重": "critical",
    "critical": "critical",
    "紧急": "emergency",
    "emergency": "emergency",
  };
  
  // Map scope values
  const scopeMap: Record<string, string> = {
    "所有项目": "all",
    "all": "all",
    "指定项目": "project",
    "project": "project",
    "指定类别": "category",
    "category": "category",
  };
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const rule: any = {};
    
    headers.forEach((header, index) => {
      const fieldName = columnMap[header];
      if (fieldName && values[index]) {
        let value: any = values[index];
        
        // Convert special values
        if (fieldName === "alertType") {
          value = alertTypeMap[value.toLowerCase()] || value;
        } else if (fieldName === "alertLevel") {
          value = alertLevelMap[value.toLowerCase()] || value;
        } else if (fieldName === "scope") {
          value = scopeMap[value.toLowerCase()] || value;
        } else if (fieldName === "threshold" || fieldName === "projectId" || fieldName === "categoryId") {
          value = parseFloat(value) || 0;
        } else if (fieldName === "isActive") {
          value = value === "1" || value.toLowerCase() === "true" || value === "是" ? 1 : 0;
        }
        
        rule[fieldName] = value;
      }
    });
    
    if (rule.name) {
      rules.push(rule);
    }
  }
  
  return rules;
}

/**
 * Export cost alert rules to CSV format
 * @returns CSV content string
 */
export async function exportCostAlertRulesToCSV(): Promise<string> {
  const db = await requireDb();
  if (!db) return "";
  
  const rules = await db.select().from(costAlertRules).limit(1000);

  // CSV header
  const headers = [
    "规则名称",
    "描述",
    "适用范围",
    "项目ID",
    "类别ID",
    "预警类型",
    "阈值",
    "预警级别",
    "通知方式",
    "通知用户",
    "是否启用"
  ];
  
  // Map values back to Chinese
  const alertTypeMapReverse: Record<string, string> = {
    "budget_percent": "预算百分比",
    "absolute_amount": "绝对金额",
    "cpi": "CPI指数",
  };
  
  const alertLevelMapReverse: Record<string, string> = {
    "warning": "警告",
    "critical": "严重",
    "emergency": "紧急",
  };
  
  const scopeMapReverse: Record<string, string> = {
    "all": "所有项目",
    "project": "指定项目",
    "category": "指定类别",
  };
  
  const notifyTypeMapReverse: Record<string, string> = {
    "email": "邮件",
    "system": "系统通知",
    "both": "两者",
  };
  
  // Generate CSV rows
  const rows = rules.map(rule => [
    rule.name,
    rule.description || "",
    scopeMapReverse[rule.scope] || rule.scope,
    rule.projectId || "",
    rule.categoryId || "",
    alertTypeMapReverse[rule.alertType] || rule.alertType,
    rule.alertType === "cpi" ? (rule.threshold / 100).toFixed(2) : rule.threshold,
    alertLevelMapReverse[rule.alertLevel] || rule.alertLevel,
    notifyTypeMapReverse[rule.notifyType] || rule.notifyType,
    rule.notifyUserIds || "",
    rule.isActive ? "是" : "否"
  ].join(","));
  
  return [headers.join(","), ...rows].join("\n");
}
