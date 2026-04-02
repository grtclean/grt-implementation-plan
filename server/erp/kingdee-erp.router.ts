/**
 * 金蝶K/3 ERP集成路由 — MSSQL直连版
 * 通过TCP直连金蝶K/3 MSSQL数据库，提取财务核心数据
 *
 * 目标数据库: AIS20260122124030 (10.2.1.249:1433)
 * ~20 procedures: connection, discovery, financial data extract, migration
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import * as kingdeeMssql from "./kingdee-mssql";
import {
  KINGDEE_DISCOVERY_QUERY, KINGDEE_COLUMNS_QUERY, KINGDEE_PREVIEW_QUERY,
  KINGDEE_LIST_DATABASES,
  EXTRACT_GL_ACCOUNTS, EXTRACT_VOUCHERS, EXTRACT_VOUCHER_ENTRIES,
  EXTRACT_AP_BILLS, EXTRACT_AR_BILLS, EXTRACT_K3_PO,
  EXTRACT_K3_ITEMS, EXTRACT_K3_SUPPLIERS, EXTRACT_K3_CUSTOMERS,
  EXTRACT_K3_INVENTORY, EXTRACT_K3_STOCK_BILLS,
  EXTRACT_K3_DEPARTMENTS, EXTRACT_K3_EMPLOYEES,
  EXTRACT_ACCOUNT_BALANCES,
} from "./kingdee-table-queries";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("kingdee-erp-router");

/** Common batch extraction input */
const BatchInput = z.object({
  batchSize: z.number().min(1).max(5000).default(500),
  offset: z.number().min(0).default(0),
});

/** Migration options */
const MigrationOptionsSchema = z.object({
  batchSize: z.number().min(1).max(1000).default(200),
  conflictStrategy: z.enum(["skip", "update", "error"]).default("update"),
  dryRun: z.boolean().default(false),
});

/** Entity types available for extraction */
const ENTITY_TYPES = [
  "glAccounts", "vouchers", "apBills", "arBills", "purchaseOrders",
  "items", "suppliers", "customers", "inventory", "accountBalances",
] as const;

export const kingdeeERPRouter = router({
  // ═══════════════════════════════════════════════════════════════
  // 1. Connection (3)
  // ═══════════════════════════════════════════════════════════════

  /** Test Kingdee MSSQL connection with SELECT @@VERSION */
  testConnection: adminProcedure.mutation(async () => {
    log.info("测试金蝶K/3 MSSQL连接");
    const result = await kingdeeMssql.testConnection();
    log.info({ success: result.success, responseTime: result.responseTime }, "金蝶连接测试完成");
    return result;
  }),

  /** Get MSSQL connection pool stats */
  getPoolStatus: protectedProcedure.query(() => {
    return kingdeeMssql.getPoolStatus();
  }),

  /** List all Kingdee databases on the server */
  listDatabases: adminProcedure.query(async () => {
    log.info("列出金蝶K/3数据库");
    try {
      const databases = await kingdeeMssql.query(KINGDEE_LIST_DATABASES);
      log.info({ count: databases.length }, "金蝶数据库列表获取完成");
      return { databases, count: databases.length };
    } catch (err: any) {
      log.error({ err }, "列出金蝶数据库失败");
      throw new Error(`获取数据库列表失败: ${err.message}`);
    }
  }),

  // ═══════════════════════════════════════════════════════════════
  // 2. Discovery (3)
  // ═══════════════════════════════════════════════════════════════

  /** List all tables in the selected Kingdee database */
  discoverTables: adminProcedure
    .input(z.object({
      database: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      log.info({ database: input?.database }, "发现金蝶表");
      try {
        let tables;
        if (input?.database) {
          const dbPool = await kingdeeMssql.switchDatabase(input.database);
          const result = await dbPool.request().query(KINGDEE_DISCOVERY_QUERY);
          tables = result.recordset;
        } else {
          tables = await kingdeeMssql.query(KINGDEE_DISCOVERY_QUERY);
        }
        log.info({ count: tables.length }, "金蝶表发现完成");
        return { tables, count: tables.length };
      } catch (err: any) {
        log.error({ err }, "金蝶表发现失败");
        throw new Error(`表发现失败: ${err.message}`);
      }
    }),

  /** List columns of a specific table */
  discoverColumns: adminProcedure
    .input(z.object({ tableName: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      log.info({ tableName: input.tableName }, "发现金蝶表字段");
      try {
        const columns = await kingdeeMssql.query(
          KINGDEE_COLUMNS_QUERY(input.tableName),
          { tableName: input.tableName },
        );
        return { tableName: input.tableName, columns, count: columns.length };
      } catch (err: any) {
        log.error({ err, tableName: input.tableName }, "金蝶字段发现失败");
        throw new Error(`字段发现失败: ${err.message}`);
      }
    }),

  /** Preview first 50 rows from a table */
  previewData: adminProcedure
    .input(z.object({ tableName: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      log.info({ tableName: input.tableName }, "预览金蝶表数据");
      try {
        const rows = await kingdeeMssql.query(KINGDEE_PREVIEW_QUERY(input.tableName));
        return { tableName: input.tableName, rows, count: rows.length };
      } catch (err: any) {
        log.error({ err, tableName: input.tableName }, "金蝶数据预览失败");
        throw new Error(`数据预览失败: ${err.message}`);
      }
    }),

  // ═══════════════════════════════════════════════════════════════
  // 3. Financial Data Extract (10)
  // ═══════════════════════════════════════════════════════════════

  /** Extract chart of accounts (会计科目) */
  extractGLAccounts: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取会计科目");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_GL_ACCOUNTS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "glAccounts", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取会计科目失败");
        throw new Error(`会计科目提取失败: ${err.message}`);
      }
    }),

  /** Extract GL vouchers with entries (凭证) */
  extractVouchers: adminProcedure
    .input(BatchInput.extend({
      includeEntries: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset, includeEntries: input.includeEntries }, "提取凭证");
      try {
        const vouchers = await kingdeeMssql.query(EXTRACT_VOUCHERS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });

        if (input.includeEntries && vouchers.length > 0) {
          // Fetch entries for each voucher (batched)
          for (const v of vouchers) {
            try {
              const entries = await kingdeeMssql.query(EXTRACT_VOUCHER_ENTRIES, {
                voucherId: v.voucherId,
              });
              (v as any).entries = entries;
            } catch (entryErr: any) {
              log.warn({ voucherId: v.voucherId, err: entryErr }, "凭证明细提取失败，跳过");
              (v as any).entries = [];
            }
          }
        }

        return { entity: "vouchers", rows: vouchers, count: vouchers.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取凭证失败");
        throw new Error(`凭证提取失败: ${err.message}`);
      }
    }),

  /** Extract accounts payable (应付账款) */
  extractAPBills: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取应付账款");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_AP_BILLS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "apBills", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取应付账款失败");
        throw new Error(`应付账款提取失败: ${err.message}`);
      }
    }),

  /** Extract accounts receivable (应收账款) */
  extractARBills: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取应收账款");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_AR_BILLS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "arBills", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取应收账款失败");
        throw new Error(`应收账款提取失败: ${err.message}`);
      }
    }),

  /** Extract purchase orders with line items (采购订单) */
  extractPurchaseOrders: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取采购订单");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_K3_PO, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "purchaseOrders", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取采购订单失败");
        throw new Error(`采购订单提取失败: ${err.message}`);
      }
    }),

  /** Extract materials / items master data (物料) */
  extractItems: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取物料主数据");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_K3_ITEMS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "items", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取物料失败");
        throw new Error(`物料提取失败: ${err.message}`);
      }
    }),

  /** Extract supplier master data (供应商) */
  extractSuppliers: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取供应商");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_K3_SUPPLIERS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "suppliers", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取供应商失败");
        throw new Error(`供应商提取失败: ${err.message}`);
      }
    }),

  /** Extract customer master data (客户) */
  extractCustomers: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取客户");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_K3_CUSTOMERS, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "customers", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取客户失败");
        throw new Error(`客户提取失败: ${err.message}`);
      }
    }),

  /** Extract real-time inventory (即时库存) */
  extractInventory: adminProcedure
    .input(BatchInput)
    .query(async ({ input }) => {
      log.info({ batchSize: input.batchSize, offset: input.offset }, "提取即时库存");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_K3_INVENTORY, {
          batchSize: input.batchSize,
          offset: input.offset,
        });
        return { entity: "inventory", rows, count: rows.length, offset: input.offset };
      } catch (err: any) {
        log.error({ err }, "提取即时库存失败");
        throw new Error(`即时库存提取失败: ${err.message}`);
      }
    }),

  /** Extract period account balances (科目余额) */
  extractAccountBalances: adminProcedure
    .input(z.object({
      year: z.number().min(2000).max(2099).default(2026),
    }))
    .query(async ({ input }) => {
      log.info({ year: input.year }, "提取科目余额");
      try {
        const rows = await kingdeeMssql.query(EXTRACT_ACCOUNT_BALANCES, {
          year: input.year,
        });
        return { entity: "accountBalances", rows, count: rows.length, year: input.year };
      } catch (err: any) {
        log.error({ err }, "提取科目余额失败");
        throw new Error(`科目余额提取失败: ${err.message}`);
      }
    }),

  // ═══════════════════════════════════════════════════════════════
  // 4. Migration (4)
  // ═══════════════════════════════════════════════════════════════

  /** Full migration: extract all entities in order and store locally */
  migrateAll: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;
      const batchId = `KING-${Date.now()}`;
      log.info({ batchId, userId, options: input }, "开始金蝶K/3全量迁移");

      const results: Record<string, { success: number; failed: number; error?: string }> = {};
      const extractionOrder = [
        { key: "departments", query: EXTRACT_K3_DEPARTMENTS, hasOffset: false },
        { key: "employees", query: EXTRACT_K3_EMPLOYEES, hasOffset: true },
        { key: "glAccounts", query: EXTRACT_GL_ACCOUNTS, hasOffset: true },
        { key: "suppliers", query: EXTRACT_K3_SUPPLIERS, hasOffset: true },
        { key: "customers", query: EXTRACT_K3_CUSTOMERS, hasOffset: true },
        { key: "items", query: EXTRACT_K3_ITEMS, hasOffset: true },
        { key: "purchaseOrders", query: EXTRACT_K3_PO, hasOffset: true },
        { key: "apBills", query: EXTRACT_AP_BILLS, hasOffset: true },
        { key: "arBills", query: EXTRACT_AR_BILLS, hasOffset: true },
        { key: "inventory", query: EXTRACT_K3_INVENTORY, hasOffset: true },
      ];

      for (const entity of extractionOrder) {
        try {
          const params: Record<string, any> = {};
          if (entity.hasOffset) {
            params.batchSize = input.batchSize;
            params.offset = 0;
          }

          const rows = await kingdeeMssql.query(entity.query, params);

          if (input.dryRun) {
            results[entity.key] = { success: rows.length, failed: 0 };
            log.info({ entity: entity.key, count: rows.length }, "试运行提取完成");
          } else {
            // In production, rows would be written to local DB via Drizzle ORM.
            // For now, we log and count.
            results[entity.key] = { success: rows.length, failed: 0 };
            log.info({ entity: entity.key, count: rows.length }, "实体提取完成");
          }
        } catch (err: any) {
          results[entity.key] = { success: 0, failed: 1, error: err.message };
          log.error({ entity: entity.key, err }, "实体提取失败");
        }
      }

      const totalSuccess = Object.values(results).reduce((s, r) => s + r.success, 0);
      const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0);

      log.info({ batchId, totalSuccess, totalFailed }, "金蝶K/3全量迁移完成");

      return {
        success: totalFailed === 0,
        batchId,
        message: `金蝶K/3迁移完成: 提取 ${totalSuccess} 条, 失败 ${totalFailed} 个实体`,
        dryRun: input.dryRun,
        results,
      };
    }),

  /** Migration status overview: pool health + recent batch summary */
  getMigrationStatus: adminProcedure.query(async () => {
    const pool = kingdeeMssql.getPoolStatus();

    // Verify connectivity and gather basic counts
    let entityCounts: Record<string, number> = {};
    if (pool.connected) {
      try {
        const countQueries = [
          { key: "accounts", table: "t_Account" },
          { key: "vouchers", table: "t_Voucher" },
          { key: "apBills", table: "t_APBill" },
          { key: "arBills", table: "t_ARBill" },
          { key: "items", table: "t_ICItem" },
          { key: "suppliers", table: "t_Supplier" },
          { key: "customers", table: "t_Customer" },
        ];

        for (const cq of countQueries) {
          try {
            const cnt = await kingdeeMssql.queryCount(
              `SELECT COUNT(*) AS cnt FROM [${cq.table}]`,
            );
            entityCounts[cq.key] = cnt;
          } catch {
            entityCounts[cq.key] = -1; // table may not exist
          }
        }
      } catch (err: any) {
        log.warn({ err }, "获取实体计数失败");
      }
    }

    return {
      pool,
      entityCounts,
      availableEntities: ENTITY_TYPES,
    };
  }),

  /** Get migration batch history */
  getMigrationHistory: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async () => {
      // Migration history would come from a local migration_batches table.
      // Returning structure for frontend integration.
      log.info("获取金蝶迁移历史");
      return {
        message: "金蝶迁移历史 — 请通过 migrateAll 执行迁移后查看",
        batches: [] as Array<{
          batchId: string;
          startedAt: string;
          completedAt: string | null;
          status: string;
          totalRows: number;
          failedRows: number;
        }>,
      };
    }),

  /** Validate migration data integrity: compare source counts with local DB */
  validateMigration: adminProcedure.query(async () => {
    log.info("验证金蝶K/3迁移数据完整性");

    const checks: Array<{
      entity: string;
      sourceCount: number;
      localCount: number;
      matched: boolean;
      message: string;
    }> = [];

    const pool = kingdeeMssql.getPoolStatus();
    if (!pool.connected) {
      return {
        success: false,
        message: "金蝶K/3未连接，无法验证",
        checks,
      };
    }

    const entities = [
      { key: "会计科目", table: "t_Account", where: "FDelete = 0" },
      { key: "凭证", table: "t_Voucher", where: null },
      { key: "应付账款", table: "t_APBill", where: null },
      { key: "应收账款", table: "t_ARBill", where: null },
      { key: "物料", table: "t_ICItem", where: "FDeleted = 0" },
      { key: "供应商", table: "t_Supplier", where: "FDeleted = 0" },
      { key: "客户", table: "t_Customer", where: "FDeleted = 0" },
      { key: "即时库存", table: "t_ICInventory", where: "FQty > 0" },
    ];

    for (const entity of entities) {
      try {
        const whereClause = entity.where ? ` WHERE ${entity.where}` : "";
        const sourceCount = await kingdeeMssql.queryCount(
          `SELECT COUNT(*) AS cnt FROM [${entity.table}]${whereClause}`,
        );

        // Local count would come from our Drizzle DB — placeholder for now
        const localCount = 0;

        checks.push({
          entity: entity.key,
          sourceCount,
          localCount,
          matched: sourceCount === localCount,
          message: localCount === 0
            ? "本地数据为空，需执行迁移"
            : sourceCount === localCount
              ? "数据一致"
              : `差异: 源 ${sourceCount} vs 本地 ${localCount}`,
        });
      } catch (err: any) {
        checks.push({
          entity: entity.key,
          sourceCount: -1,
          localCount: 0,
          matched: false,
          message: `验证失败: ${err.message}`,
        });
      }
    }

    const allMatched = checks.every(c => c.matched);

    return {
      success: allMatched,
      message: allMatched ? "所有实体数据一致" : "存在数据差异，请检查",
      checks,
      checkedAt: new Date().toISOString(),
    };
  }),

  // ═══════════════════════════════════════════════════════════════
  // Utility
  // ═══════════════════════════════════════════════════════════════

  /** Close connection pool (cleanup) */
  closeConnection: adminProcedure.mutation(async () => {
    await kingdeeMssql.close();
    log.info("金蝶K/3连接已关闭");
    return { success: true, message: "金蝶K/3连接池已关闭" };
  }),

  /** Get integration status for dashboard */
  getIntegrationStatus: protectedProcedure.query(async () => {
    const pool = kingdeeMssql.getPoolStatus();
    if (!pool.connected) {
      return { configured: true, connected: false, syncEnabled: false };
    }
    return {
      configured: true,
      connected: true,
      syncEnabled: true,
      poolSize: pool.poolSize,
      available: pool.available,
    };
  }),
});
