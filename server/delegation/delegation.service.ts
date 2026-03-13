/**
 * 代理职能服务
 * 审批委托的CRUD操作
 */

import { requireDb } from '../utils/db-helpers';
import { approvalDelegations } from '../../drizzle/approval-engine-schema';
import { hrmEmployees } from '../../drizzle/schema';
import { eq, and, sql, desc, lte, gte, ne, inArray } from 'drizzle-orm';

/** 查询我发出的委托 */
export async function getMyDelegations(userId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(approvalDelegations)
    .where(eq(approvalDelegations.delegatorId, userId))
    .orderBy(desc(approvalDelegations.createdAt))
    .limit(1000);
}

/** 查询当前有效的、委托给我的记录 */
export async function getDelegationsToMe(userId: number) {
  const db = await requireDb();
  const now = new Date();
  return db
    .select()
    .from(approvalDelegations)
    .where(
      and(
        eq(approvalDelegations.delegateeId, userId),
        eq(approvalDelegations.status, 'active'),
        lte(approvalDelegations.startDate, now),
        gte(approvalDelegations.endDate, now),
      ),
    )
    .orderBy(desc(approvalDelegations.createdAt))
    .limit(1000);
}

/** 新建委托 */
export async function createDelegation(params: {
  delegatorId: number;
  delegatorName: string;
  delegateeId: number;
  delegateeName: string;
  businessTypes: string[];
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  const db = await requireDb();

  // 检查是否存在重叠的有效委托
  const overlap = await db
    .select({ id: approvalDelegations.id })
    .from(approvalDelegations)
    .where(
      and(
        eq(approvalDelegations.delegatorId, params.delegatorId),
        eq(approvalDelegations.status, 'active'),
        lte(approvalDelegations.startDate, new Date(params.endDate)),
        gte(approvalDelegations.endDate, new Date(params.startDate)),
      ),
    )
    .limit(1);

  if (overlap.length > 0) {
    throw new Error('该时间段内已存在有效委托，请先撤销后再创建');
  }

  const result = await db.insert(approvalDelegations).values({
    delegatorId: params.delegatorId,
    delegatorName: params.delegatorName,
    delegateeId: params.delegateeId,
    delegateeName: params.delegateeName,
    businessTypes: params.businessTypes,
    startDate: new Date(params.startDate),
    endDate: new Date(params.endDate),
    reason: params.reason ?? null,
    status: 'active',
  } as any).returning();

  return result[0] ?? { success: true };
}

/** 撤销委托（仅委托人可操作） */
export async function revokeDelegation(delegationId: number, userId: number) {
  const db = await requireDb();
  const result = await db
    .update(approvalDelegations)
    .set({ status: 'inactive', updatedAt: new Date() } as any)
    .where(
      and(
        eq(approvalDelegations.id, delegationId),
        eq(approvalDelegations.delegatorId, userId),
        eq(approvalDelegations.status, 'active'),
      ),
    )
    .returning();

  if (result.length === 0) {
    throw new Error('委托不存在或无权撤销');
  }
  return { success: true };
}

/** 搜索员工（用于选择被委托人） */
export async function searchEmployees(keyword: string, excludeUserId: number) {
  const db = await requireDb();
  return db
    .select({
      id: hrmEmployees.id,
      employeeCode: hrmEmployees.employeeCode,
      name: hrmEmployees.name,
      department: hrmEmployees.department,
      position: hrmEmployees.position,
    })
    .from(hrmEmployees)
    .where(
      and(
        sql`(${hrmEmployees.name} LIKE ${'%' + keyword + '%'} OR ${hrmEmployees.employeeCode} LIKE ${'%' + keyword + '%'})`,
        ne(hrmEmployees.userId, excludeUserId),
        inArray(hrmEmployees.status, ['probation', 'regular']),
      ),
    )
    .limit(20);
}
