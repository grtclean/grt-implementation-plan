/**
 * 数据库助手函数
 * 提供统一的数据库连接处理和类型转换
 */

import { getDb } from '../db';
import { TRPCError } from '@trpc/server';

/**
 * 获取数据库实例，自动处理null检查
 * @throws TRPCError 如果数据库连接不可用
 */
export async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '数据库连接不可用',
    });
  }
  return db;
}

/**
 * 类型转换助手 - 将字符串转换为枚举类型
 */
export function toEnumValue<T extends Record<string, any>>(
  value: string | undefined,
  enumObj: T,
  defaultValue?: keyof T
): T[keyof T] | undefined {
  if (!value) return defaultValue ? enumObj[defaultValue] : undefined;
  
  const key = Object.keys(enumObj).find(
    k => String(enumObj[k]) === value
  );
  
  return key ? enumObj[key as keyof T] : (defaultValue ? enumObj[defaultValue] : undefined);
}

/**
 * 安全的数据库查询包装器
 */
export async function safeDbQuery<T>(
  queryFn: (db: any) => Promise<T>
): Promise<T> {
  try {
    const db = await requireDb();
    return await queryFn(db);
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '数据库查询失败',
      cause: error,
    });
  }
}

/**
 * 批量数据库操作包装器
 */
export async function batchDbOperation<T>(
  operations: Array<(db: any) => Promise<T>>
): Promise<T[]> {
  const db = await requireDb();
  return Promise.all(operations.map(op => op(db)));
}

/**
 * 数据库事务包装器
 */
export async function withDbTransaction<T>(
  transactionFn: (db: any) => Promise<T>
): Promise<T> {
  const db = await requireDb();
  
  // 注意：Drizzle ORM 的事务支持取决于数据库驱动
  // 这里提供基础实现，实际使用时可能需要调整
  try {
    return await transactionFn(db);
  } catch (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '数据库事务失败',
      cause: error,
    });
  }
}
