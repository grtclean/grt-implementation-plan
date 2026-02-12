/**
 * 导出历史记录服务
 * v1.3.83 - 记录和管理导出历史
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

// 类型定义
export type ExportType = 'transcription' | 'report' | 'data' | 'sync_log';
export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'docx' | 'csv' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportOptions {
  includeTimestamps?: boolean;
  includeSpeakers?: boolean;
  includeDecisions?: boolean;
  includeActionItems?: boolean;
  includeSummary?: boolean;
  dateRange?: { start: number; end: number };
  [key: string]: unknown;
}

export interface ExportHistoryRecord {
  id: string;
  userId: string;
  exportType: ExportType;
  format: ExportFormat;
  fileName: string;
  fileUrl: string | null;
  fileSize: number;
  sourceId: string | null;
  sourceType: string | null;
  options: ExportOptions | null;
  status: ExportStatus;
  errorMessage: string | null;
  createdAt: number;
  expiresAt: number | null;
}

export interface CreateExportHistoryInput {
  userId: string;
  exportType: ExportType;
  format: ExportFormat;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  sourceId?: string;
  sourceType?: string;
  options?: ExportOptions;
  expiresAt?: number;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建导出历史记录
 */
export async function createExportHistory(
  input: CreateExportHistoryInput
): Promise<ExportHistoryRecord> {
  const db = await requireDb();
  const id = generateId();
  const now = Date.now();

  // 默认7天后过期
  const expiresAt = input.expiresAt || now + 7 * 24 * 60 * 60 * 1000;

  await db.execute(sql`
    INSERT INTO export_history (
      id, user_id, export_type, format, file_name, file_url, file_size,
      source_id, source_type, options, status, created_at, expires_at
    ) VALUES (
      ${id},
      ${input.userId},
      ${input.exportType},
      ${input.format},
      ${input.fileName},
      ${input.fileUrl || null},
      ${input.fileSize || 0},
      ${input.sourceId || null},
      ${input.sourceType || null},
      ${input.options ? JSON.stringify(input.options) : null},
      'completed',
      ${now},
      ${expiresAt}
    )
  `);

  return {
    id,
    userId: input.userId,
    exportType: input.exportType,
    format: input.format,
    fileName: input.fileName,
    fileUrl: input.fileUrl || null,
    fileSize: input.fileSize || 0,
    sourceId: input.sourceId || null,
    sourceType: input.sourceType || null,
    options: input.options || null,
    status: 'completed',
    errorMessage: null,
    createdAt: now,
    expiresAt,
  };
}

/**
 * 更新导出状态
 */
export async function updateExportStatus(
  id: string,
  status: ExportStatus,
  updates?: {
    fileUrl?: string;
    fileSize?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const db = await requireDb();

  await db.execute(sql`
    UPDATE export_history
    SET status = ${status},
        file_url = COALESCE(${updates?.fileUrl || null}, file_url),
        file_size = COALESCE(${updates?.fileSize || null}, file_size),
        error_message = ${updates?.errorMessage || null}
    WHERE id = ${id}
  `);
}

/**
 * 获取用户导出历史
 */
export async function getUserExportHistory(
  userId: string,
  options?: {
    exportType?: ExportType;
    limit?: number;
    offset?: number;
  }
): Promise<ExportHistoryRecord[]> {
  const db = await requireDb();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = sql`
    SELECT * FROM export_history
    WHERE user_id = ${userId}
  `;

  if (options?.exportType) {
    query = sql`${query} AND export_type = ${options.exportType}`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.execute(query);

  return (result.rows as any[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    exportType: row.export_type as ExportType,
    format: row.format as ExportFormat,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    sourceId: row.source_id,
    sourceType: row.source_type,
    options: row.options ? JSON.parse(row.options) : null,
    status: row.status as ExportStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * 获取单个导出记录
 */
export async function getExportById(id: string): Promise<ExportHistoryRecord | null> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT * FROM export_history WHERE id = ${id}
  `);

  const rows = result.rows as any[];
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    exportType: row.export_type as ExportType,
    format: row.format as ExportFormat,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    sourceId: row.source_id,
    sourceType: row.source_type,
    options: row.options ? JSON.parse(row.options) : null,
    status: row.status as ExportStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * 删除导出记录
 */
export async function deleteExportHistory(id: string, userId: string): Promise<boolean> {
  const db = await requireDb();
  const result = await db.execute(sql`
    DELETE FROM export_history
    WHERE id = ${id} AND user_id = ${userId}
  `);

  return (result as any).rowCount > 0;
}

/**
 * 清理过期的导出记录
 */
export async function cleanupExpiredExports(): Promise<number> {
  const db = await requireDb();
  const now = Date.now();

  const result = await db.execute(sql`
    DELETE FROM export_history
    WHERE expires_at IS NOT NULL AND expires_at < ${now}
  `);

  return (result as any).rowCount;
}

/**
 * 获取导出统计
 */
export async function getExportStatistics(userId: string): Promise<{
  totalExports: number;
  byType: Record<ExportType, number>;
  byFormat: Record<ExportFormat, number>;
  totalSize: number;
  recentExports: number;
}> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(file_size) as total_size,
      SUM(CASE WHEN created_at > ${Date.now() - 7 * 24 * 60 * 60 * 1000} THEN 1 ELSE 0 END) as recent
    FROM export_history
    WHERE user_id = ${userId}
  `);

  const typeResult = await db.execute(sql`
    SELECT export_type, COUNT(*) as count
    FROM export_history
    WHERE user_id = ${userId}
    GROUP BY export_type
  `);

  const formatResult = await db.execute(sql`
    SELECT format, COUNT(*) as count
    FROM export_history
    WHERE user_id = ${userId}
    GROUP BY format
  `);

  const stats = (result.rows as any[])[0];
  const byType: Record<string, number> = {};
  const byFormat: Record<string, number> = {};

  (typeResult.rows as any[]).forEach(row => {
    byType[row.export_type] = row.count;
  });

  (formatResult.rows as any[]).forEach(row => {
    byFormat[row.format] = row.count;
  });

  return {
    totalExports: stats.total || 0,
    byType: byType as Record<ExportType, number>,
    byFormat: byFormat as Record<ExportFormat, number>,
    totalSize: stats.total_size || 0,
    recentExports: stats.recent || 0,
  };
}

/**
 * 检查文件是否可下载
 */
export function isDownloadable(record: ExportHistoryRecord): boolean {
  if (record.status !== 'completed') return false;
  if (!record.fileUrl) return false;
  if (record.expiresAt && record.expiresAt < Date.now()) return false;
  return true;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
