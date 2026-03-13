/**
 * 外部平台采购数据导入服务
 * Maps external sync procurement forms → purchaseRequests + purchaseOrders tables
 *
 * Reads confirmed form mappings with targetEntity = 'procurement' or 'purchase_order',
 * resolves user references via externalSyncUserMappings cache,
 * handles quarantine for unmapped departments.
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ext-sync-procurement-import");

// 外部平台 procurement status → GRT purchaseRequests.status
const STATUS_MAP: Record<string, string> = {
  "已通过": "approved",
  "已审批": "approved",
  "approved": "approved",
  "待审批": "submitted",
  "审批中": "submitted",
  "pending": "submitted",
  "已拒绝": "rejected",
  "已驳回": "rejected",
  "rejected": "rejected",
  "已取消": "cancelled",
  "已撤回": "cancelled",
  "cancelled": "cancelled",
  "草稿": "draft",
  "draft": "draft",
};

// Field label patterns → GRT column (priority order)
const PR_FIELD_PATTERNS: Array<{ patterns: string[]; column: string }> = [
  { patterns: ["采购单号", "申请编号", "PR编号", "申请单号"], column: "requestCode" },
  { patterns: ["申请部门", "部门", "所属部门"], column: "department" },
  { patterns: ["申请人", "提交人", "创建人"], column: "requestedBy" },
  { patterns: ["物料", "材料", "品名", "物品名称"], column: "materialName" },
  { patterns: ["数量", "申请数量", "需求数量"], column: "quantity" },
  { patterns: ["单价", "预估单价", "估价"], column: "estimatedUnitPrice" },
  { patterns: ["金额", "总金额", "预估金额"], column: "estimatedTotalAmount" },
  { patterns: ["需求日期", "到货日期", "交期"], column: "requiredDate" },
  { patterns: ["状态", "审批状态", "流程状态"], column: "status" },
  { patterns: ["备注", "说明", "用途"], column: "purpose" },
  { patterns: ["审批人", "批准人"], column: "approvedBy" },
  { patterns: ["审批时间", "批准时间"], column: "approvedAt" },
];

interface ImportResult {
  purchaseRequestsCreated: number;
  purchaseRequestsUpdated: number;
  purchaseRequestsSkipped: number;
  purchaseRequestsFailed: number;
  errors: Array<{ entity: string; extId?: string; message: string }>;
}

/**
 * Build user cache: jdy_username → grt_user_id
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

/**
 * Resolve an external sync user reference to a GRT userId
 */
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

/**
 * Match external sync field labels to GRT columns
 */
function matchField(label: string): string | null {
  for (const rule of PR_FIELD_PATTERNS) {
    if (rule.patterns.some((p) => label.includes(p))) {
      return rule.column;
    }
  }
  return null;
}

/**
 * Map external sync status string → GRT status
 */
function mapStatus(value: unknown): string {
  if (!value) return "draft";
  const str = String(value).trim();
  return STATUS_MAP[str] || "draft";
}

/**
 * Import procurement data from external sync forms
 */
export async function importProcurementFromExternalSync(dryRun: boolean = false): Promise<ImportResult> {
  const db = await requireDb();
  const userCache = await buildUserCache(db);
  const result: ImportResult = {
    purchaseRequestsCreated: 0,
    purchaseRequestsUpdated: 0,
    purchaseRequestsSkipped: 0,
    purchaseRequestsFailed: 0,
    errors: [],
  };

  // Get confirmed form mappings for procurement
  const mappingsResult = await db.execute(sql`
    SELECT id, jdy_app_id, jdy_form_id, jdy_form_name, target_entity,
           field_mapping, field_schema, record_count
    FROM jiandaoyun_form_mappings
    WHERE target_entity IN ('procurement', 'purchase_order', 'purchase_request')
      AND is_confirmed = true
    LIMIT 100
  `);
  const formMappings = (mappingsResult.rows as any[]) || [];

  if (formMappings.length === 0) {
    log.info("No confirmed procurement form mappings found, skipping");
    return result;
  }

  for (const mapping of formMappings) {
    const appId = mapping.jdy_app_id;
    const formId = mapping.jdy_form_id;
    const fieldMapping = typeof mapping.field_mapping === "string"
      ? JSON.parse(mapping.field_mapping) : (mapping.field_mapping || {});
    const fieldSchema = typeof mapping.field_schema === "string"
      ? JSON.parse(mapping.field_schema) : (mapping.field_schema || []);

    // Build label→fieldName lookup from schema
    const labelToField = new Map<string, string>();
    for (const field of fieldSchema) {
      if (field.label && field.name) {
        labelToField.set(field.label, field.name);
      }
    }

    // Build fieldName→grtColumn mapping
    const fieldToColumn = new Map<string, string>();
    for (const [jdyField, grtColumn] of Object.entries(fieldMapping)) {
      fieldToColumn.set(jdyField, grtColumn as string);
    }
    // Auto-map by label matching
    for (const field of fieldSchema) {
      if (!fieldToColumn.has(field.name) && field.label) {
        const col = matchField(field.label);
        if (col) fieldToColumn.set(field.name, col);
      }
    }

    // Fetch form data in batches
    let hasMore = true;
    let lastDataId: string | undefined;
    let batchCount = 0;

    while (hasMore && batchCount < 100) {
      batchCount++;
      try {
        const { queryFormData } = await import("./external-sync.service");
        const filter = lastDataId ? { _id: { $gt: lastDataId } } : undefined;
        const records = await queryFormData(appId, formId, filter as any, 50);

        if (records.length === 0) {
          hasMore = false;
          break;
        }
        lastDataId = records[records.length - 1]._id;
        if (records.length < 50) hasMore = false;

        for (const record of records) {
          try {
            const extId = record._id;

            // Check if already imported
            const existingResult = await db.execute(sql`
              SELECT id FROM purchase_requests
              WHERE request_code = ${`EXT-PR-${extId.substring(0, 16)}`}
              LIMIT 1
            `);
            if (((existingResult.rows as any[]) || []).length > 0) {
              result.purchaseRequestsSkipped++;
              continue;
            }

            // Extract mapped values
            const mapped: Record<string, unknown> = {};
            for (const [fieldName, column] of fieldToColumn.entries()) {
              if (record[fieldName] !== undefined) {
                mapped[column] = record[fieldName];
              }
            }

            const requestCode = String(mapped.requestCode || `EXT-PR-${extId.substring(0, 16)}`);
            const department = String(mapped.department || "系统迁移隔离区");
            const requestedBy = resolveUser(mapped.requestedBy || record.creator, userCache);
            const quantity = parseInt(String(mapped.quantity || 0)) || 1;
            const unitPrice = parseFloat(String(mapped.estimatedUnitPrice || 0)) || 0;
            const totalAmount = parseFloat(String(mapped.estimatedTotalAmount || 0)) || (quantity * unitPrice);
            const status = mapStatus(mapped.status);
            const purpose = String(mapped.purpose || "").substring(0, 500);

            if (!dryRun) {
              await db.execute(sql`
                INSERT INTO purchase_requests
                  (request_code, request_date, department, requested_by, required_date,
                   material_id, quantity, estimated_unit_price, estimated_total_amount,
                   status, notes, created_at, updated_at)
                VALUES (
                  ${requestCode}, NOW(), ${department}, ${requestedBy || 1},
                  ${mapped.requiredDate ? String(mapped.requiredDate) : new Date().toISOString()},
                  ${1}, ${quantity},
                  ${String(unitPrice)}, ${String(totalAmount)},
                  ${status}, ${purpose || `从外部平台导入 (${extId})`},
                  NOW(), NOW()
                )
              `);
            }

            result.purchaseRequestsCreated++;
          } catch (recErr: any) {
            result.purchaseRequestsFailed++;
            result.errors.push({
              entity: "purchase_request",
              extId: record._id,
              message: recErr.message,
            });
          }
        }
      } catch (batchErr: any) {
        result.errors.push({
          entity: "procurement_batch",
          message: `Batch ${batchCount} failed for form ${formId}: ${batchErr.message}`,
        });
        hasMore = false;
      }
    }
  }

  log.info({
    created: result.purchaseRequestsCreated,
    updated: result.purchaseRequestsUpdated,
    skipped: result.purchaseRequestsSkipped,
    failed: result.purchaseRequestsFailed,
  }, "Procurement import completed");

  return result;
}

// Singleton accessor
let instance: { importProcurement: typeof importProcurementFromExternalSync } | null = null;
export function getExtSyncProcurementImportService() {
  if (!instance) {
    instance = { importProcurement: importProcurementFromExternalSync };
  }
  return instance;
}
