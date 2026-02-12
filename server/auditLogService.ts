/**
 * GRT系统敏感数据审计日志服务
 * 记录薪资、面试等敏感数据的访问和修改操作
 */

import { requireDb } from './db';
import {
  sensitiveDataAccessLog,
  permissionChangeHistory,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// ============================================
// 1. 审计日志类型定义
// ============================================

export interface AuditLogQuery {
  userId?: number;
  moduleId?: string;
  dataType?: string;
  operation?: "read" | "write" | "delete";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogSummary {
  totalAccess: number;
  readCount: number;
  writeCount: number;
  deleteCount: number;
  uniqueUsers: number;
  topModules: Array<{ moduleId: string; count: number }>;
  topUsers: Array<{ userId: number; userName: string; count: number }>;
  recentActivity: Array<{
    id: number;
    userId: number;
    userName: string;
    moduleId: string;
    dataType: string;
    operation: string;
    accessTime: Date;
  }>;
}

export interface PermissionChangeQuery {
  targetUserId?: number;
  modifierId?: number;
  changeType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================
// 2. 敏感数据访问日志
// ============================================

/**
 * 记录敏感数据访问
 */
export async function recordSensitiveDataAccess(params: {
  userId: number;
  userName: string;
  moduleId: string;
  dataType: string;
  dataId: string;
  operation: "read" | "write" | "delete";
  ipAddress?: string;
  result?: "success" | "denied";
}): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;

  const result = await db.insert(sensitiveDataAccessLog).values({
    userId: params.userId,
    userName: params.userName,
    dataType: params.dataType,
    dataId: params.dataId,
    action: params.operation,
    ipAddress: params.ipAddress || null,
    accessResult: params.result === "denied" ? "denied" : "allowed",
  });

  return result[0].insertId;
}

/**
 * 查询敏感数据访问日志
 */
export async function querySensitiveDataAccessLogs(
  query: AuditLogQuery
): Promise<{
  logs: Array<{
    id: number;
    userId: number;
    userName: string;
    moduleId: string;
    dataType: string;
    dataId: string;
    operation: string;
    ipAddress: string | null;
    result: string;
    accessTime: Date;
  }>;
  total: number;
}> {
  const db = await requireDb();
  if (!db) return { logs: [], total: 0 };

  // 构建查询条件
  const conditions = [];
  if (query.userId) {
    conditions.push(eq(sensitiveDataAccessLog.userId, query.userId));
  }
  if (query.dataType) {
    conditions.push(eq(sensitiveDataAccessLog.dataType, query.dataType));
  }
  if (query.operation) {
    conditions.push(eq(sensitiveDataAccessLog.action, query.operation));
  }
  if (query.startDate) {
    conditions.push(gte(sensitiveDataAccessLog.createdAt, query.startDate.toISOString()));
  }
  if (query.endDate) {
    conditions.push(lte(sensitiveDataAccessLog.createdAt, query.endDate.toISOString()));
  }

  // 查询日志
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const logs = await db
    .select()
    .from(sensitiveDataAccessLog)
    .where(whereClause)
    .orderBy(desc(sensitiveDataAccessLog.createdAt))
    .limit(query.limit || 50)
    .offset(query.offset || 0);

  // 查询总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sensitiveDataAccessLog)
    .where(whereClause);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName || '',
      moduleId: '',
      dataType: log.dataType,
      dataId: log.dataId || '',
      operation: log.action,
      ipAddress: log.ipAddress,
      result: log.accessResult || 'allowed',
      accessTime: log.createdAt ? new Date(log.createdAt) : new Date(),
    })),
    total: countResult[0]?.count || 0,
  };
}

/**
 * 获取审计日志摘要统计
 */
export async function getAuditLogSummary(
  startDate?: Date,
  endDate?: Date
): Promise<AuditLogSummary> {
  const db = await requireDb();
  if (!db) {
    return {
      totalAccess: 0,
      readCount: 0,
      writeCount: 0,
      deleteCount: 0,
      uniqueUsers: 0,
      topModules: [],
      topUsers: [],
      recentActivity: [],
    };
  }

  // 构建时间条件
  const conditions = [];
  if (startDate) {
    conditions.push(gte(sensitiveDataAccessLog.createdAt, startDate.toISOString()));
  }
  if (endDate) {
    conditions.push(lte(sensitiveDataAccessLog.createdAt, endDate.toISOString()));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 总访问次数
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sensitiveDataAccessLog)
    .where(whereClause);

  // 按操作类型统计
  const readResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sensitiveDataAccessLog)
    .where(
      whereClause
        ? and(whereClause, eq(sensitiveDataAccessLog.action, "read"))
        : eq(sensitiveDataAccessLog.action, "read")
    );

  const writeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sensitiveDataAccessLog)
    .where(
      whereClause
        ? and(whereClause, eq(sensitiveDataAccessLog.action, "write"))
        : eq(sensitiveDataAccessLog.action, "write")
    );

  const deleteResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sensitiveDataAccessLog)
    .where(
      whereClause
        ? and(whereClause, eq(sensitiveDataAccessLog.action, "delete"))
        : eq(sensitiveDataAccessLog.action, "delete")
    );

  // 唯一用户数
  const uniqueUsersResult = await db
    .select({ count: sql<number>`count(distinct userId)` })
    .from(sensitiveDataAccessLog)
    .where(whereClause);

  // 最近活动
  const recentActivity = await db
    .select()
    .from(sensitiveDataAccessLog)
    .where(whereClause)
    .orderBy(desc(sensitiveDataAccessLog.createdAt))
    .limit(10);

  return {
    totalAccess: totalResult[0]?.count || 0,
    readCount: readResult[0]?.count || 0,
    writeCount: writeResult[0]?.count || 0,
    deleteCount: deleteResult[0]?.count || 0,
    uniqueUsers: uniqueUsersResult[0]?.count || 0,
    topModules: [],
    topUsers: [],
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName || '',
      moduleId: log.dataType,
      dataType: log.dataType,
      operation: log.action,
      accessTime: new Date(log.createdAt || new Date().toISOString()),
    })),
  };
}

// ============================================
// 3. 权限变更历史
// ============================================

/**
 * 记录权限变更
 */
export async function recordPermissionChange(params: {
  targetUserId: number;
  targetUserName: string;
  modifierId: number;
  modifierName: string;
  changeType: "role_assignment" | "permission_update" | "department_change";
  oldValue?: string;
  newValue?: string;
  reason?: string;
}): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;

  const result = await db.insert(permissionChangeHistory).values({
    targetUserId: params.targetUserId,
    changedBy: params.modifierId,
    changedByName: params.modifierName,
    changeType: params.changeType,
    oldValue: params.oldValue || null,
    newValue: params.newValue || null,
    reason: params.reason || null,
  });

  return result[0].insertId;
}

/**
 * 查询权限变更历史
 */
export async function queryPermissionChangeHistory(
  query: PermissionChangeQuery
): Promise<{
  changes: Array<{
    id: number;
    targetUserId: number;
    targetUserName: string;
    modifierId: number;
    modifierName: string;
    changeType: string;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    changedAt: Date;
  }>;
  total: number;
}> {
  const db = await requireDb();
  if (!db) return { changes: [], total: 0 };

  // 构建查询条件
  const conditions = [];
  if (query.targetUserId) {
    conditions.push(eq(permissionChangeHistory.targetUserId, query.targetUserId));
  }
  if (query.modifierId) {
    conditions.push(eq(permissionChangeHistory.changedBy, query.modifierId));
  }
  if (query.changeType) {
    conditions.push(
      eq(
        permissionChangeHistory.changeType,
        query.changeType as "role_assignment" | "permission_update" | "department_change"
      )
    );
  }
  if (query.startDate) {
    conditions.push(gte(permissionChangeHistory.createdAt, query.startDate.toISOString()));
  }
  if (query.endDate) {
    conditions.push(lte(permissionChangeHistory.createdAt, query.endDate.toISOString()));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询变更记录
  const changes = await db
    .select()
    .from(permissionChangeHistory)
    .where(whereClause)
    .orderBy(desc(permissionChangeHistory.createdAt))
    .limit(query.limit || 50)
    .offset(query.offset || 0);

  // 查询总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(permissionChangeHistory)
    .where(whereClause);

  return {
    changes: changes.map((change) => ({
      id: change.id,
      targetUserId: change.targetUserId!,
      targetUserName: '',
      modifierId: change.changedBy,
      modifierName: change.changedByName || '',
      changeType: change.changeType,
      oldValue: change.oldValue,
      newValue: change.newValue,
      reason: change.reason,
      changedAt: change.createdAt ? new Date(change.createdAt) : new Date(),
    })),
    total: countResult[0]?.count || 0,
  };
}

// ============================================
// 4. 敏感数据访问报告
// ============================================

/**
 * 生成敏感数据访问报告
 */
export async function generateAccessReport(
  startDate: Date,
  endDate: Date
): Promise<{
  period: { start: Date; end: Date };
  summary: AuditLogSummary;
  sensitiveModuleAccess: Array<{
    moduleId: string;
    moduleName: string;
    totalAccess: number;
    uniqueUsers: number;
    operations: { read: number; write: number; delete: number };
  }>;
  userActivity: Array<{
    userId: number;
    userName: string;
    totalAccess: number;
    sensitiveAccess: number;
    lastAccessTime: Date | null;
  }>;
}> {
  const summary = await getAuditLogSummary(startDate, endDate);

  return {
    period: { start: startDate, end: endDate },
    summary,
    sensitiveModuleAccess: [
      {
        moduleId: "hrm_salary_detail",
        moduleName: "员工薪资明细",
        totalAccess: 0,
        uniqueUsers: 0,
        operations: { read: 0, write: 0, delete: 0 },
      },
      {
        moduleId: "hrm_employee_id",
        moduleName: "员工身份信息",
        totalAccess: 0,
        uniqueUsers: 0,
        operations: { read: 0, write: 0, delete: 0 },
      },
      {
        moduleId: "hrm_ai_interview",
        moduleName: "AI面试系统",
        totalAccess: 0,
        uniqueUsers: 0,
        operations: { read: 0, write: 0, delete: 0 },
      },
    ],
    userActivity: [],
  };
}

// ============================================
// 5. 审计日志清理
// ============================================

/**
 * 清理过期的审计日志（保留指定天数）
 */
export async function cleanupOldAuditLogs(retentionDays: number = 365): Promise<number> {
  const db = await requireDb();
  if (!db) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .delete(sensitiveDataAccessLog)
    .where(lte(sensitiveDataAccessLog.createdAt, cutoffDate.toISOString()));

  return result[0].affectedRows || 0;
}

/**
 * 导出审计日志为CSV格式
 */
export async function exportAuditLogsToCSV(query: AuditLogQuery): Promise<string> {
  const { logs } = await querySensitiveDataAccessLogs({
    ...query,
    limit: 10000,
  });

  const headers = [
    "ID",
    "用户ID",
    "用户名",
    "模块ID",
    "数据类型",
    "数据ID",
    "操作",
    "IP地址",
    "结果",
    "访问时间",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.userId,
    log.userName,
    log.moduleId,
    log.dataType,
    log.dataId,
    log.operation,
    log.ipAddress || "",
    log.result,
    log.accessTime,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
