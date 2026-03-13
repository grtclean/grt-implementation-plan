/**
 * 变更事件服务 (Change Event Service)
 *
 * 实现设计变更 → BOM变更 → 采购单更新的链式通知机制。
 *
 * 链路说明:
 *   1. 机械设计发生变更 → 创建 design_change 事件
 *   2. 系统自动创建下游 bom_change 事件（待BOM负责人确认）
 *   3. BOM变更确认后 → 系统自动创建下游 po_update 事件（待采购确认）
 *
 * 每个事件通过 sourceChangeId 链接到触发它的上游事件，
 * 形成完整的变更追溯链。
 */

import { requireDb } from "../db";
import { changeEvents } from "../../drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// ============================================================
// Types
// ============================================================

export type ChangeEventType = "design_change" | "bom_change" | "po_update";
export type ChangeEventStatus = "pending" | "acknowledged" | "resolved";

export interface AffectedItem {
  itemCode: string;
  itemName: string;
  field?: string;       // which field changed (e.g. 'quantity', 'material', 'spec')
  oldValue?: string;
  newValue?: string;
}

export interface CreateChangeEventInput {
  projectId: number;
  type: ChangeEventType;
  title: string;
  description?: string;
  sourceChangeId?: number;
  affectedItems?: AffectedItem[];
  createdBy: number;
}

// Map from upstream type to the downstream type it triggers
const DOWNSTREAM_TYPE_MAP: Record<string, ChangeEventType | null> = {
  design_change: "bom_change",
  bom_change: "po_update",
  po_update: null, // terminal node
};

const DOWNSTREAM_TITLE_PREFIX: Record<string, string> = {
  design_change: "[BOM变更通知]",
  bom_change: "[采购单更新通知]",
};

// ============================================================
// CRUD
// ============================================================

/**
 * 查询变更事件列表（支持类型、状态、项目过滤）
 */
export async function listChangeEvents(params: {
  type?: ChangeEventType;
  status?: ChangeEventStatus;
  projectId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { type, status, projectId, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (type) conditions.push(eq(changeEvents.type, type));
  if (status) conditions.push(eq(changeEvents.status, status));
  if (projectId) conditions.push(eq(changeEvents.projectId, projectId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(changeEvents)
    .where(where)
    .orderBy(desc(changeEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(changeEvents)
    .where(where);

  return {
    items: items.map(parseAffectedItems),
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

/**
 * 根据 ID 获取单个变更事件
 */
export async function getChangeEventById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(changeEvents)
    .where(eq(changeEvents.id, id))
    .limit(1000);

  if (results.length === 0) return null;
  return parseAffectedItems(results[0]);
}

/**
 * 创建变更事件，并自动为下游生成通知事件
 *
 * 例如创建 design_change 时，会自动创建一条 bom_change (pending)
 * 让BOM负责人知晓有设计变更需要响应。
 */
export async function createChangeEvent(input: CreateChangeEventInput) {
  const db = await requireDb();
  const now = new Date().toISOString();

  const inserted = await db
    .insert(changeEvents)
    .values({
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      sourceChangeId: input.sourceChangeId ?? null,
      status: "pending",
      affectedItems: input.affectedItems
        ? JSON.stringify(input.affectedItems)
        : null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const created = parseAffectedItems(inserted[0]);

  // Auto-create downstream notification event
  let downstreamEvent = null;
  const downstreamType = DOWNSTREAM_TYPE_MAP[input.type];
  if (downstreamType) {
    const prefix = DOWNSTREAM_TITLE_PREFIX[input.type] ?? "";
    const downstreamInserted = await db
      .insert(changeEvents)
      .values({
        projectId: input.projectId,
        type: downstreamType,
        title: `${prefix} ${input.title}`,
        description: `由上游变更事件 #${created.id} 自动触发。${input.description ?? ""}`.trim(),
        sourceChangeId: created.id,
        status: "pending",
        affectedItems: input.affectedItems
          ? JSON.stringify(input.affectedItems)
          : null,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    downstreamEvent = parseAffectedItems(downstreamInserted[0]);
  }

  return { event: created, downstreamEvent };
}

/**
 * 确认（acknowledge）一个变更事件
 *
 * 将状态从 pending 变为 acknowledged，记录确认人和时间。
 */
export async function acknowledgeChangeEvent(
  id: number,
  acknowledgedBy: number,
) {
  const db = await requireDb();
  const now = new Date().toISOString();

  const updated = await db
    .update(changeEvents)
    .set({
      status: "acknowledged",
      acknowledgedAt: now,
      acknowledgedBy,
      updatedAt: now,
    })
    .where(eq(changeEvents.id, id))
    .returning();

  if (updated.length === 0) return null;
  return parseAffectedItems(updated[0]);
}

/**
 * 将事件标记为已解决 (resolved)
 */
export async function resolveChangeEvent(id: number) {
  const db = await requireDb();
  const now = new Date().toISOString();

  const updated = await db
    .update(changeEvents)
    .set({
      status: "resolved",
      updatedAt: now,
    })
    .where(eq(changeEvents.id, id))
    .returning();

  if (updated.length === 0) return null;
  return parseAffectedItems(updated[0]);
}

/**
 * 获取完整的变更链
 *
 * 从给定的事件ID出发，沿 sourceChangeId 向上溯源到根事件，
 * 同时向下收集所有以此为源的下游事件，返回完整链。
 */
export async function getChangeChain(eventId: number) {
  const db = await requireDb();

  // 1. Get the starting event
  const startEvent = await getChangeEventById(eventId);
  if (!startEvent) return null;

  // 2. Walk up to the root
  const chain: any[] = [];
  let current = startEvent;

  // Walk upstream
  const upstream: any[] = [];
  while (current.sourceChangeId) {
    const parent = await getChangeEventById(current.sourceChangeId);
    if (!parent) break;
    upstream.unshift(parent);
    current = parent;
  }

  // The root is the first element
  chain.push(...upstream);

  // 3. From the root, walk downstream by finding children via sourceChangeId
  // Rebuild the full chain starting from root
  const rootId = chain.length > 0 ? chain[0].id : startEvent.id;
  const allEvents = await collectDownstream(db, rootId);

  // Combine: root + all downstream
  const rootEvent =
    chain.length > 0 ? chain[0] : startEvent;

  const fullChain = [rootEvent, ...allEvents];

  return {
    rootEventId: rootEvent.id,
    chain: fullChain,
    total: fullChain.length,
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Recursively collect all downstream events from a given parent ID
 */
async function collectDownstream(db: any, parentId: number): Promise<any[]> {
  const children = await db
    .select()
    .from(changeEvents)
    .where(eq(changeEvents.sourceChangeId, parentId))
    .orderBy(changeEvents.createdAt)
    .limit(1000);

  const result: any[] = [];
  for (const child of children) {
    const parsed = parseAffectedItems(child);
    result.push(parsed);
    const grandChildren = await collectDownstream(db, child.id);
    result.push(...grandChildren);
  }
  return result;
}

/**
 * Parse the affectedItems JSON string into an array
 */
function parseAffectedItems(row: any) {
  if (!row) return row;
  return {
    ...row,
    affectedItems: row.affectedItems
      ? safeParseJSON(row.affectedItems)
      : [],
  };
}

function safeParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
