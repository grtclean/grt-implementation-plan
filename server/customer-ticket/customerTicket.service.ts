/**
 * 客户需求工单服务
 * CRUD + 统计 + SOP流转
 */

import { requireDb } from '../utils/db-helpers';
import { customerRequirementTickets } from '../../drizzle/customer-ticket-schema';
import { eq, and, sql, desc, like } from 'drizzle-orm';

// SOP合法状态转移图
const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted:  ['reviewing', 'rejected'],
  reviewing:  ['scheduled', 'rejected'],
  scheduled:  ['developing'],
  developing: ['testing'],
  testing:    ['delivered', 'developing'], // 打回重做
  delivered:  ['accepted', 'testing'],
  accepted:   ['closed'],
  rejected:   ['submitted'],               // 驳回后可重新提交
};

/** 生成工单编号 CRT-YYYYMM-NNN */
async function generateTicketCode(): Promise<string> {
  const db = await requireDb();
  const now = new Date();
  const prefix = `CRT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(customerRequirementTickets)
    .where(like(customerRequirementTickets.ticketCode, `${prefix}%`));

  const seq = Number(result[0]?.cnt ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// 1. listTickets
// ---------------------------------------------------------------------------
export async function listTickets(params?: {
  status?: string;
  priority?: string;
  assigneeId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await requireDb();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (params?.status) conditions.push(eq(customerRequirementTickets.status, params.status));
  if (params?.priority) conditions.push(eq(customerRequirementTickets.priority, params.priority));
  if (params?.assigneeId) conditions.push(eq(customerRequirementTickets.assigneeId, params.assigneeId));
  if (params?.search) {
    conditions.push(
      sql`(${customerRequirementTickets.title} ILIKE ${'%' + params.search + '%'}
       OR ${customerRequirementTickets.ticketCode} ILIKE ${'%' + params.search + '%'}
       OR ${customerRequirementTickets.customerName} ILIKE ${'%' + params.search + '%'})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(customerRequirementTickets).where(where)
      .orderBy(desc(customerRequirementTickets.createdAt))
      .limit(pageSize).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(customerRequirementTickets).where(where),
  ]);

  return { items, total: Number(countResult[0]?.total ?? 0), page, pageSize };
}

// ---------------------------------------------------------------------------
// 2. getTicketDetail
// ---------------------------------------------------------------------------
export async function getTicketDetail(ticketId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(customerRequirementTickets)
    .where(eq(customerRequirementTickets.id, ticketId))
    .limit(1);

  if (rows.length === 0) throw new Error('工单不存在');
  return rows[0];
}

// ---------------------------------------------------------------------------
// 3. createTicket
// ---------------------------------------------------------------------------
export async function createTicket(params: {
  title: string;
  description?: string;
  customerName: string;
  customerContact?: string;
  source?: string;
  category?: string;
  priority?: string;
  assigneeId?: number;
  assigneeName?: string;
  dueDate?: string;
  estimatedHours?: number;
  createdBy: number;
  createdByName?: string;
}) {
  const db = await requireDb();
  const ticketCode = await generateTicketCode();

  const result = await db.insert(customerRequirementTickets).values({
    ticketCode,
    title: params.title,
    description: params.description ?? null,
    customerName: params.customerName,
    customerContact: params.customerContact ?? null,
    source: params.source ?? 'internal',
    category: params.category ?? 'requirement',
    priority: params.priority ?? 'medium',
    status: 'submitted',
    assigneeId: params.assigneeId ?? null,
    assigneeName: params.assigneeName ?? null,
    dueDate: params.dueDate ?? null,
    estimatedHours: params.estimatedHours?.toString() ?? null,
    createdBy: params.createdBy,
    createdByName: params.createdByName ?? null,
  } as any).returning();

  return result[0] ?? { success: true, ticketCode };
}

// ---------------------------------------------------------------------------
// 4. updateTicket (含SOP状态校验)
// ---------------------------------------------------------------------------
export async function updateTicket(
  ticketId: number,
  userId: number,
  params: {
    title?: string;
    description?: string;
    status?: string;
    assigneeId?: number;
    assigneeName?: string;
    priority?: string;
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    resolution?: string;
  },
) {
  const db = await requireDb();

  // 若涉及状态变更，校验SOP
  if (params.status) {
    const current = await db
      .select({ status: customerRequirementTickets.status })
      .from(customerRequirementTickets)
      .where(eq(customerRequirementTickets.id, ticketId))
      .limit(1);

    if (current.length === 0) throw new Error('工单不存在');
    const cur = current[0].status;
    const allowed = VALID_TRANSITIONS[cur] ?? [];
    if (!allowed.includes(params.status)) {
      throw new Error(`状态不允许从「${cur}」变更为「${params.status}」`);
    }
  }

  const setFields: Record<string, any> = { updatedAt: sql`now()` };
  if (params.title !== undefined) setFields.title = params.title;
  if (params.description !== undefined) setFields.description = params.description;
  if (params.status !== undefined) setFields.status = params.status;
  if (params.assigneeId !== undefined) setFields.assigneeId = params.assigneeId;
  if (params.assigneeName !== undefined) setFields.assigneeName = params.assigneeName;
  if (params.priority !== undefined) setFields.priority = params.priority;
  if (params.dueDate !== undefined) setFields.dueDate = params.dueDate;
  if (params.estimatedHours !== undefined) setFields.estimatedHours = params.estimatedHours.toString();
  if (params.actualHours !== undefined) setFields.actualHours = params.actualHours.toString();
  if (params.resolution !== undefined) setFields.resolution = params.resolution;

  // 关闭时记录 closedAt
  if (params.status === 'closed') setFields.closedAt = sql`now()`;

  const result = await db
    .update(customerRequirementTickets)
    .set(setFields as any)
    .where(eq(customerRequirementTickets.id, ticketId))
    .returning();

  if (result.length === 0) throw new Error('工单不存在');
  return result[0];
}

// ---------------------------------------------------------------------------
// 5. rateTicket (满意度评分)
// ---------------------------------------------------------------------------
export async function rateTicket(
  ticketId: number,
  params: { satisfactionRating: number; satisfactionComment?: string },
) {
  const db = await requireDb();

  // 仅 delivered / accepted / closed 可评分
  const current = await db
    .select({ status: customerRequirementTickets.status })
    .from(customerRequirementTickets)
    .where(eq(customerRequirementTickets.id, ticketId))
    .limit(1);

  if (current.length === 0) throw new Error('工单不存在');
  if (!['delivered', 'accepted', 'closed'].includes(current[0].status)) {
    throw new Error('仅已交付/已验收/已关闭状态可评分');
  }

  const result = await db
    .update(customerRequirementTickets)
    .set({
      satisfactionRating: params.satisfactionRating,
      satisfactionComment: params.satisfactionComment ?? null,
      ratedAt: sql`now()`,
      updatedAt: sql`now()`,
    } as any)
    .where(eq(customerRequirementTickets.id, ticketId))
    .returning();

  return result[0];
}

// ---------------------------------------------------------------------------
// 6. getTicketStats
// ---------------------------------------------------------------------------
export async function getTicketStats(assigneeId?: number) {
  const db = await requireDb();

  const where = assigneeId
    ? eq(customerRequirementTickets.assigneeId, assigneeId)
    : undefined;

  const rows = await db
    .select({
      status: customerRequirementTickets.status,
      cnt: sql<number>`count(*)`,
    })
    .from(customerRequirementTickets)
    .where(where)
    .groupBy(customerRequirementTickets.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r.status] = Number(r.cnt);
    total += Number(r.cnt);
  }

  // 平均满意度
  const satResult = await db
    .select({ avg: sql<number>`avg(${customerRequirementTickets.satisfactionRating})` })
    .from(customerRequirementTickets)
    .where(
      and(
        where,
        sql`${customerRequirementTickets.satisfactionRating} IS NOT NULL`,
      ),
    );

  // 逾期工单
  const overdueResult = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(customerRequirementTickets)
    .where(
      and(
        where,
        sql`${customerRequirementTickets.dueDate} IS NOT NULL`,
        sql`${customerRequirementTickets.dueDate}::date < CURRENT_DATE`,
        sql`${customerRequirementTickets.status} NOT IN ('closed', 'accepted', 'rejected')`,
      ),
    );

  return {
    byStatus,
    total,
    avgSatisfaction: satResult[0]?.avg ? Number(Number(satResult[0].avg).toFixed(1)) : null,
    overdueCount: Number(overdueResult[0]?.cnt ?? 0),
  };
}
