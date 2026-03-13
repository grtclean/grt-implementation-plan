/**
 * 外部平台客诉数据导入服务
 * Maps external sync complaint/ticket forms → customerRequirementTickets table
 *
 * Reads confirmed form mappings with targetEntity containing 'complaint' or 'ticket',
 * resolves assignee references via externalSyncUserMappings cache.
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ext-sync-complaint-import");

// 外部平台 complaint status → GRT customerRequirementTickets.status
const STATUS_MAP: Record<string, string> = {
  "待处理": "submitted",
  "已分配": "assigned",
  "处理中": "in_progress",
  "待客户确认": "pending_customer",
  "已处理": "resolved",
  "已解决": "resolved",
  "已关闭": "closed",
  "已完成": "closed",
  "已重开": "reopened",
};

// 外部平台 priority → GRT priority
const PRIORITY_MAP: Record<string, string> = {
  "高": "high",
  "中": "medium",
  "低": "low",
  "紧急": "high",
  "一般": "medium",
  "high": "high",
  "medium": "medium",
  "low": "low",
};

// Field label patterns → GRT column
const FIELD_PATTERNS: Array<{ patterns: string[]; column: string }> = [
  { patterns: ["投诉编号", "客诉单号", "工单号", "Ticket"], column: "ticketCode" },
  { patterns: ["标题", "主题", "投诉标题"], column: "title" },
  { patterns: ["客户名称", "客户", "公司名"], column: "customerName" },
  { patterns: ["联系人", "客户联系人", "联系方式"], column: "customerContact" },
  { patterns: ["描述", "投诉内容", "详细说明", "问题描述"], column: "description" },
  { patterns: ["优先级", "紧急程度"], column: "priority" },
  { patterns: ["状态", "处理状态", "流程状态"], column: "status" },
  { patterns: ["负责人", "处理人", "分配给"], column: "assignee" },
  { patterns: ["到期日", "截止日期", "期望完成"], column: "dueDate" },
  { patterns: ["分类", "类别", "投诉类型"], column: "category" },
  { patterns: ["来源", "渠道", "投诉来源"], column: "source" },
  { patterns: ["解决方案", "处理结果", "解决措施"], column: "resolution" },
];

interface ComplaintImportResult {
  ticketsCreated: number;
  ticketsUpdated: number;
  ticketsSkipped: number;
  ticketsFailed: number;
  errors: Array<{ entity: string; extId?: string; message: string }>;
}

/**
 * Build user cache
 */
async function buildUserCache(db: any): Promise<Map<string, number>> {
  const result = await db.execute(sql`
    SELECT jdy_username, jdy_name, grt_user_id
    FROM jiandaoyun_user_mappings
    WHERE grt_user_id IS NOT NULL
    LIMIT 10000
  `);
  const cache = new Map<string, number>();
  for (const row of ((result.rows as any[]) || [])) {
    cache.set(row.jdy_username, row.grt_user_id);
    if (row.jdy_name) cache.set(row.jdy_name, row.grt_user_id);
  }
  return cache;
}

function resolveUser(value: unknown, cache: Map<string, number>): number | null {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return cache.get(value) ?? null;
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const username = obj.username || obj.name || obj._id;
    if (typeof username === "string") return cache.get(username) ?? null;
  }
  return null;
}

function matchField(label: string): string | null {
  for (const rule of FIELD_PATTERNS) {
    if (rule.patterns.some((p) => label.includes(p))) return rule.column;
  }
  return null;
}

function mapStatus(value: unknown): string {
  if (!value) return "submitted";
  const str = String(value).trim();
  return STATUS_MAP[str] || "submitted";
}

function mapPriority(value: unknown): string {
  if (!value) return "medium";
  const str = String(value).trim();
  return PRIORITY_MAP[str] || "medium";
}

function generateTicketCode(extId: string): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `EXT-TK-${ym}-${extId.substring(0, 8)}`;
}

/**
 * Import complaint data from external sync forms
 */
export async function importComplaintsFromExternalSync(dryRun: boolean = false): Promise<ComplaintImportResult> {
  const db = await requireDb();
  const userCache = await buildUserCache(db);
  const result: ComplaintImportResult = {
    ticketsCreated: 0,
    ticketsUpdated: 0,
    ticketsSkipped: 0,
    ticketsFailed: 0,
    errors: [],
  };

  // Get confirmed complaint form mappings
  const mappingsResult = await db.execute(sql`
    SELECT id, jdy_app_id, jdy_form_id, jdy_form_name, target_entity,
           field_mapping, field_schema, record_count
    FROM jiandaoyun_form_mappings
    WHERE target_entity IN ('customer_complaint', 'complaint', 'customer_ticket', 'ticket')
      AND is_confirmed = true
    LIMIT 100
  `);
  const formMappings = (mappingsResult.rows as any[]) || [];

  if (formMappings.length === 0) {
    log.info("No confirmed complaint form mappings found, skipping");
    return result;
  }

  for (const mapping of formMappings) {
    const appId = mapping.jdy_app_id;
    const formId = mapping.jdy_form_id;
    const fieldMapping = typeof mapping.field_mapping === "string"
      ? JSON.parse(mapping.field_mapping) : (mapping.field_mapping || {});
    const fieldSchema = typeof mapping.field_schema === "string"
      ? JSON.parse(mapping.field_schema) : (mapping.field_schema || []);

    // Build label→fieldName lookup
    const fieldToColumn = new Map<string, string>();
    for (const [jdyField, grtColumn] of Object.entries(fieldMapping)) {
      fieldToColumn.set(jdyField, grtColumn as string);
    }
    for (const field of fieldSchema) {
      if (!fieldToColumn.has(field.name) && field.label) {
        const col = matchField(field.label);
        if (col) fieldToColumn.set(field.name, col);
      }
    }

    // Fetch form data
    let hasMore = true;
    let lastDataId: string | undefined;
    let batchCount = 0;

    while (hasMore && batchCount < 100) {
      batchCount++;
      try {
        const { queryFormData } = await import("./external-sync.service");
        const filter = lastDataId ? { _id: { $gt: lastDataId } } : undefined;
        const records = await queryFormData(appId, formId, filter as any, 50);

        if (records.length === 0) { hasMore = false; break; }
        lastDataId = records[records.length - 1]._id;
        if (records.length < 50) hasMore = false;

        for (const record of records) {
          try {
            const extId = record._id;
            const ticketCode = generateTicketCode(extId);

            // Check if already imported
            const existingResult = await db.execute(sql`
              SELECT id FROM customer_requirement_tickets
              WHERE ticket_code = ${ticketCode}
              LIMIT 1
            `);
            if (((existingResult.rows as any[]) || []).length > 0) {
              result.ticketsSkipped++;
              continue;
            }

            // Extract mapped values
            const mapped: Record<string, unknown> = {};
            for (const [fieldName, column] of fieldToColumn.entries()) {
              if (record[fieldName] !== undefined) mapped[column] = record[fieldName];
            }

            const title = String(mapped.title || `外部平台客诉 ${extId.substring(0, 8)}`).substring(0, 200);
            const customerName = String(mapped.customerName || "未知客户").substring(0, 200);
            const customerContact = String(mapped.customerContact || "").substring(0, 200);
            const description = String(mapped.description || "").substring(0, 2000);
            const priority = mapPriority(mapped.priority);
            const status = mapStatus(mapped.status);
            const assigneeId = resolveUser(mapped.assignee || record.creator, userCache);
            const category = mapped.category ? String(mapped.category) : "complaint";
            const source = mapped.source ? String(mapped.source) : "external";
            const resolution = mapped.resolution ? String(mapped.resolution).substring(0, 2000) : null;

            if (!dryRun) {
              await db.execute(sql`
                INSERT INTO customer_requirement_tickets
                  (ticket_code, title, description, customer_name, customer_contact,
                   source, category, priority, status, assignee_id,
                   resolution, created_at, updated_at)
                VALUES (
                  ${ticketCode}, ${title}, ${description}, ${customerName}, ${customerContact},
                  ${source}, ${category}, ${priority}, ${status}, ${assigneeId},
                  ${resolution}, NOW(), NOW()
                )
              `);
            }

            result.ticketsCreated++;
          } catch (recErr: any) {
            result.ticketsFailed++;
            result.errors.push({ entity: "customer_ticket", extId: record._id, message: recErr.message });
          }
        }
      } catch (batchErr: any) {
        result.errors.push({
          entity: "complaint_batch",
          message: `Batch ${batchCount} failed for form ${formId}: ${batchErr.message}`,
        });
        hasMore = false;
      }
    }
  }

  log.info({
    created: result.ticketsCreated,
    skipped: result.ticketsSkipped,
    failed: result.ticketsFailed,
  }, "Complaint import completed");

  return result;
}

let instance: { importComplaints: typeof importComplaintsFromExternalSync } | null = null;
export function getExtSyncComplaintImportService() {
  if (!instance) {
    instance = { importComplaints: importComplaintsFromExternalSync };
  }
  return instance;
}
