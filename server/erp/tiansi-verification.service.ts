/**
 * 天思ERP迁移数据完整性验证
 * - 行数对比 (天思 vs GRT)
 * - 金额校验和
 * - 引用完整性
 * - 空值审计
 * - 重复检测
 */

import { createChildLogger } from '../lib/logger';
import * as tiansi from './tiansi-mssql';
import { COUNT_ENTITY, SUM_FIELD } from './tiansi-table-queries';

const log = createChildLogger('tiansi-verification');

export interface VerificationCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'not_run';
  details: string;
  tiansiValue?: number | string;
  grtValue?: number | string;
}

export interface VerificationReport {
  runAt: string;
  durationMs: number;
  overallStatus: 'passed' | 'failed' | 'partial';
  checks: VerificationCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Run full verification suite
 */
export async function runVerification(): Promise<VerificationReport> {
  const start = Date.now();
  const checks: VerificationCheck[] = [];

  log.info('开始迁移验证...');

  // 1. Row count comparison
  const entityTables = [
    { tiansi: 'materials', grt: 'materials', name: '物料' },
    { tiansi: 'suppliers', grt: 'suppliers', name: '供应商' },
    { tiansi: 'purchase_orders', grt: 'purchase_orders', name: '采购订单' },
    { tiansi: 'warehouses', grt: 'warehouses', name: '仓库' },
    { tiansi: 'inventory', grt: 'inventory', name: '库存' },
    { tiansi: 'bom_master', grt: 'bom_master', name: 'BOM' },
    { tiansi: 'inventory_lots', grt: 'inventory_lots', name: '批次' },
  ];

  for (const table of entityTables) {
    try {
      const tiansiCount = await tiansi.queryCount(COUNT_ENTITY(table.tiansi));
      // GRT count would use Drizzle ORM in production
      const grtCount = 0; // placeholder
      checks.push({
        name: `行数对比: ${table.name}`,
        status: tiansiCount === grtCount ? 'passed' : grtCount === 0 ? 'warning' : 'failed',
        details: `天思: ${tiansiCount} 行, GRT: ${grtCount} 行`,
        tiansiValue: tiansiCount,
        grtValue: grtCount,
      });
    } catch (err: any) {
      checks.push({
        name: `行数对比: ${table.name}`,
        status: 'failed',
        details: `查询失败: ${err.message}`,
      });
    }
  }

  // 2. Amount checksums
  const amountChecks = [
    { table: 'purchase_orders', field: 'total_amount', name: '采购订单金额' },
    { table: 'inventory', field: 'quantity_on_hand', name: '库存在手数量' },
  ];

  for (const check of amountChecks) {
    try {
      const tiansiSum = await tiansi.queryCount(SUM_FIELD(check.table, check.field));
      checks.push({
        name: `校验和: ${check.name}`,
        status: 'warning',
        details: `天思合计: ${tiansiSum}, GRT合计: 待计算`,
        tiansiValue: tiansiSum,
      });
    } catch (err: any) {
      checks.push({
        name: `校验和: ${check.name}`,
        status: 'failed',
        details: `查询失败: ${err.message}`,
      });
    }
  }

  // 3. Referential integrity (placeholder)
  checks.push({
    name: '引用完整性: BOM物料码',
    status: 'not_run',
    details: '检查BOM明细行的material_code是否都在materials表中',
  });

  // 4. Null audit (placeholder)
  checks.push({
    name: '空值审计',
    status: 'not_run',
    details: '检查必填字段（编码、名称）的空值率',
  });

  // 5. Duplicate detection (placeholder)
  checks.push({
    name: '重复检测',
    status: 'not_run',
    details: '检查唯一约束字段的重复记录',
  });

  const durationMs = Date.now() - start;
  const passed = checks.filter(c => c.status === 'passed').length;
  const failed = checks.filter(c => c.status === 'failed').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  const report: VerificationReport = {
    runAt: new Date().toISOString(),
    durationMs,
    overallStatus: failed > 0 ? 'failed' : warnings > 0 ? 'partial' : 'passed',
    checks,
    summary: { total: checks.length, passed, failed, warnings },
  };

  log.info({ summary: report.summary, durationMs }, '验证完成');
  return report;
}

/**
 * Generate migration summary report
 */
export async function generateMigrationSummary(): Promise<{
  totalEntities: number;
  migratedEntities: number;
  cutoverReadiness: string;
  checklist: Array<{ item: string; status: string }>;
}> {
  return {
    totalEntities: 7,
    migratedEntities: 0,
    cutoverReadiness: 'not_ready',
    checklist: [
      { item: 'MSSQL连接验证', status: 'pending' },
      { item: '表结构发现', status: 'pending' },
      { item: '物料迁移', status: 'pending' },
      { item: '供应商迁移', status: 'pending' },
      { item: 'BOM迁移', status: 'pending' },
      { item: '采购订单迁移', status: 'pending' },
      { item: '库存迁移', status: 'pending' },
      { item: '批次迁移', status: 'pending' },
      { item: '行数对比验证', status: 'pending' },
      { item: '金额校验和', status: 'pending' },
      { item: '引用完整性', status: 'pending' },
      { item: '用户验收测试', status: 'pending' },
    ],
  };
}
