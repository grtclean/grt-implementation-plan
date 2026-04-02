/**
 * 天思ERP MSSQL直连服务
 * 替代原有REST API，通过TCP直连MSSQL数据库
 *
 * 连接信息: 10.2.1.230:1433, DB_GRT, sa/Admin1234
 * GBK→UTF-8编码自动处理
 */

import * as sql from 'mssql';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger('tiansi-mssql');

// Connection configuration from env
const TIANSI_CONFIG: sql.config = {
  server: process.env.TIANSI_MSSQL_HOST || '10.2.1.230',
  port: parseInt(process.env.TIANSI_MSSQL_PORT || '1433', 10),
  database: process.env.TIANSI_MSSQL_DATABASE || 'DB_GRT',
  user: process.env.TIANSI_MSSQL_USER || 'sa',
  password: process.env.TIANSI_MSSQL_PASSWORD || 'Admin1234',
  pool: {
    max: parseInt(process.env.TIANSI_MSSQL_POOL_SIZE || '10', 10),
    min: 2,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // internal network
    trustServerCertificate: true,
    requestTimeout: 30000,
    connectTimeout: 15000,
    // Bind to LAN interface to bypass VPN/proxy TUN interceptors
    localAddress: process.env.TIANSI_LOCAL_ADDRESS || undefined,
  } as any,
};

// Singleton pool
let pool: sql.ConnectionPool | null = null;

/**
 * Get or create the MSSQL connection pool
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    log.info({ server: TIANSI_CONFIG.server, database: TIANSI_CONFIG.database }, '正在连接天思MSSQL...');
    pool = new sql.ConnectionPool(TIANSI_CONFIG);
    await pool.connect();
    log.info('天思MSSQL连接池已建立');

    pool.on('error', (err) => {
      log.error({ err }, '天思MSSQL连接池错误');
      pool = null;
    });

    return pool;
  } catch (err) {
    log.error({ err }, '天思MSSQL连接失败');
    pool = null;
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
    log.info({ elapsed, version }, '天思MSSQL连接测试成功');
    return {
      success: true,
      message: `连接成功 (${elapsed}ms)`,
      responseTime: elapsed,
      serverVersion: version,
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    log.error({ err, elapsed }, '天思MSSQL连接测试失败');
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

  log.debug({ sql: sqlText.substring(0, 200), params }, '执行天思查询');
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
    log.info('天思MSSQL连接池已关闭');
  }
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
