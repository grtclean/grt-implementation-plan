/**
 * 客户沟通记录服务
 * CRUD + 按工单查询
 */

import { requireDb } from '../utils/db-helpers';
import { customerCommRecords } from '../../drizzle/customer-ticket-schema';
import { eq, and, sql, desc, like } from 'drizzle-orm';

/** 生成沟通记录编号 CCR-YYYYMM-NNN */
async function generateRecordCode(): Promise<string> {
  const db = await requireDb();
  const now = new Date();
  const prefix = `CCR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(customerCommRecords)
    .where(like(customerCommRecords.recordCode, `${prefix}%`));

  const seq = Number(result[0]?.cnt ?? 0) + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// 1. listCommRecords
// ---------------------------------------------------------------------------
export async function listCommRecords(params?: {
  ticketId?: number;
  commType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await requireDb();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (params?.ticketId) conditions.push(eq(customerCommRecords.ticketId, params.ticketId));
  if (params?.commType) conditions.push(eq(customerCommRecords.commType, params.commType));
  if (params?.search) {
    conditions.push(
      sql`(${customerCommRecords.subject} ILIKE ${'%' + params.search + '%'}
       OR ${customerCommRecords.customerName} ILIKE ${'%' + params.search + '%'}
       OR ${customerCommRecords.recordCode} ILIKE ${'%' + params.search + '%'})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(customerCommRecords).where(where)
      .orderBy(desc(customerCommRecords.commDate))
      .limit(pageSize).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(customerCommRecords).where(where),
  ]);

  return { items, total: Number(countResult[0]?.total ?? 0), page, pageSize };
}

// ---------------------------------------------------------------------------
// 2. getCommRecordDetail
// ---------------------------------------------------------------------------
export async function getCommRecordDetail(recordId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(customerCommRecords)
    .where(eq(customerCommRecords.id, recordId))
    .limit(1);

  if (rows.length === 0) throw new Error('沟通记录不存在');
  return rows[0];
}

// ---------------------------------------------------------------------------
// 3. createCommRecord
// ---------------------------------------------------------------------------
export async function createCommRecord(params: {
  ticketId?: number;
  customerName: string;
  commType?: string;
  subject: string;
  content?: string;
  summary?: string;
  participants?: any;
  commDate: string;
  duration?: number;
  actionItems?: string;
  nextFollowUpDate?: string;
  createdBy: number;
  createdByName?: string;
}) {
  const db = await requireDb();
  const recordCode = await generateRecordCode();

  const result = await db.insert(customerCommRecords).values({
    recordCode,
    ticketId: params.ticketId ?? null,
    customerName: params.customerName,
    commType: params.commType ?? 'email',
    subject: params.subject,
    content: params.content ?? null,
    summary: params.summary ?? null,
    participants: params.participants ?? null,
    commDate: params.commDate,
    duration: params.duration ?? null,
    actionItems: params.actionItems ?? null,
    nextFollowUpDate: params.nextFollowUpDate ?? null,
    createdBy: params.createdBy,
    createdByName: params.createdByName ?? null,
  } as any).returning();

  return result[0] ?? { success: true, recordCode };
}

// ---------------------------------------------------------------------------
// 4. updateCommRecord
// ---------------------------------------------------------------------------
export async function updateCommRecord(
  recordId: number,
  params: {
    subject?: string;
    content?: string;
    summary?: string;
    actionItems?: string;
    nextFollowUpDate?: string;
  },
) {
  const db = await requireDb();

  const setFields: Record<string, any> = { updatedAt: new Date() };
  if (params.subject !== undefined) setFields.subject = params.subject;
  if (params.content !== undefined) setFields.content = params.content;
  if (params.summary !== undefined) setFields.summary = params.summary;
  if (params.actionItems !== undefined) setFields.actionItems = params.actionItems;
  if (params.nextFollowUpDate !== undefined) setFields.nextFollowUpDate = params.nextFollowUpDate;

  const result = await db
    .update(customerCommRecords)
    .set(setFields as any)
    .where(eq(customerCommRecords.id, recordId))
    .returning();

  if (result.length === 0) throw new Error('沟通记录不存在');
  return result[0];
}

// ---------------------------------------------------------------------------
// 5. getCommRecordsByTicket
// ---------------------------------------------------------------------------
export async function getCommRecordsByTicket(ticketId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(customerCommRecords)
    .where(eq(customerCommRecords.ticketId, ticketId))
    .orderBy(desc(customerCommRecords.commDate));
}
