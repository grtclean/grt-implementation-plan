/**
 * 金蝶K/3 MSSQL直连服务
 * 通过TCP直连MSSQL数据库
 *
 * 连接信息: 10.2.1.249:1433, AIS20260122124030, sa/Admin@123
 * 数据库列表:
 *   - AIS20260122124030 (主数据库)
 *   - AIS20260122124030Log (日志库)
 *   - AIS20260224082439 (副数据库)
 *   - K3DBConfiger20261221225689 (配置库)
 */

import * as sql from 'mssql';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger('kingdee-mssql');

// Connection configuration from env
const KINGDEE_CONFIG: sql.config = {
  server: process.env.KINGDEE_MSSQL_HOST || '10.2.1.249',
  port: parseInt(process.env.KINGDEE_MSSQL_PORT || '1433', 10),
  database: process.env.KINGDEE_MSSQL_DATABASE || 'AIS20260122124030',
  user: process.env.KINGDEE_MSSQL_USER || 'sa',
  password: process.env.KINGDEE_MSSQL_PASSWORD || 'Admin@123',
  pool: {
    max: parseInt(process.env.KINGDEE_MSSQL_POOL_SIZE || '10', 10),
    min: 2,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // internal network
    trustServerCertificate: true,
    requestTimeout: 30000,
    connectTimeout: 15000,
  },
};

// Singleton pool
let pool: sql.ConnectionPool | null = null;

// Secondary pools for switchDatabase
const dbPools: Map<string, sql.ConnectionPool> = new Map();

/**
 * Get or create the MSSQL connection pool
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    log.info({ server: KINGDEE_CONFIG.server, database: KINGDEE_CONFIG.database }, '正在连接金蝶K/3 MSSQL...');
    pool = new sql.ConnectionPool(KINGDEE_CONFIG);
    await pool.connect();
    log.info('金蝶K/3 MSSQL连接池已建立');

    pool.on('error', (err) => {
      log.error({ err }, '金蝶K/3 MSSQL连接池错误');
      pool = null;
    });

    return pool;
  } catch (err) {
    log.error({ err }, '金蝶K/3 MSSQL连接失败');
    pool = null;
    throw err;
  }
}

/**
 * Switch to a different Kingdee database by creating a new pool
 * Supported databases:
 *   - AIS20260122124030 (main)
 *   - AIS20260122124030Log (log)
 *   - AIS20260224082439 (secondary)
 *   - K3DBConfiger20261221225689 (config)
 */
export async function switchDatabase(dbName: string): Promise<sql.ConnectionPool> {
  // Return existing pool if already connected
  const existing = dbPools.get(dbName);
  if (existing && existing.connected) {
    return existing;
  }

  try {
    log.info({ server: KINGDEE_CONFIG.server, database: dbName }, '正在连接金蝶K/3 MSSQL (切换数据库)...');
    const config: sql.config = {
      ...KINGDEE_CONFIG,
      database: dbName,
    };
    const dbPool = new sql.ConnectionPool(config);
    await dbPool.connect();
    log.info({ database: dbName }, '金蝶K/3 MSSQL连接池已建立 (切换数据库)');

    dbPool.on('error', (err) => {
      log.error({ err, database: dbName }, '金蝶K/3 MSSQL连接池错误 (切换数据库)');
      dbPools.delete(dbName);
    });

    dbPools.set(dbName, dbPool);
    return dbPool;
  } catch (err) {
    log.error({ err, database: dbName }, '金蝶K/3 MSSQL连接失败 (切换数据库)');
    dbPools.delete(dbName);
    throw err;
  }
}

/**
 * Test MSSQL connection with SELECT 1
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  responseTime: number;
  serverVersion?: string;
}> {
  const start = Date.now();
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT @@VERSION AS version, GETDATE() AS serverTime');
    const elapsed = Date.now() - start;
    const version = result.recordset[0]?.version?.substring(0, 80) || 'unknown';
    log.info({ elapsed, version }, '金蝶K/3 MSSQL连接测试成功');
    return {
      success: true,
      message: `连接成功 (${elapsed}ms)`,
      responseTime: elapsed,
      serverVersion: version,
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    log.error({ err, elapsed }, '金蝶K/3 MSSQL连接测试失败');
    return {
      success: false,
      message: err.message || '连接失败',
      responseTime: elapsed,
    };
  }
}

/**
 * Execute a parameterized query
 */
export async function query<T = any>(
  sqlText: string,
  params?: Record<string, any>
): Promise<T[]> {
  const p = await getPool();
  const request = p.request();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }

  log.debug({ sql: sqlText.substring(0, 200), params }, '执行金蝶查询');
  const result = await request.query(sqlText);
  return result.recordset as T[];
}

/**
 * Execute a query and return count
 */
export async function queryCount(sqlText: string, params?: Record<string, any>): Promise<number> {
  const rows = await query<{ cnt: number }>(sqlText, params);
  return rows[0]?.cnt || 0;
}

/**
 * Close the connection pool
 */
export async function close(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    log.info('金蝶K/3 MSSQL连接池已关闭');
  }

  // Also close all secondary pools
  for (const [dbName, dbPool] of dbPools.entries()) {
    try {
      await dbPool.close();
      log.info({ database: dbName }, '金蝶K/3 MSSQL连接池已关闭 (切换数据库)');
    } catch (err) {
      log.error({ err, database: dbName }, '关闭金蝶K/3连接池失败');
    }
  }
  dbPools.clear();
}

/**
 * Get pool health status
 */
export function getPoolStatus(): {
  connected: boolean;
  poolSize: number;
  available: number;
  pending: number;
} {
  if (!pool || !pool.connected) {
    return { connected: false, poolSize: 0, available: 0, pending: 0 };
  }
  return {
    connected: true,
    poolSize: (pool.pool as any)?.size || 0,
    available: (pool.pool as any)?.available || 0,
    pending: (pool.pool as any)?.pending || 0,
  };
}
