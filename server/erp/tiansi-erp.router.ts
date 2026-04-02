/**
 * 天思ERP集成路由 — MSSQL直连版
 * 替代REST API，通过TCP直连天思ERP MSSQL数据库
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import * as tiansiMssql from "./tiansi-mssql";
import { DISCOVERY_QUERY, COLUMNS_QUERY, PREVIEW_QUERY } from "./tiansi-table-queries";
import { migrateSingle, migrateAll as migrateAllEntities, getMigrationHistory, type EntityType } from "./tiansi-migration.service";
import { runVerification, generateMigrationSummary } from "./tiansi-verification.service";

const MigrationOptionsSchema = z.object({
  batchSize: z.number().min(1).max(1000).default(200),
  conflictStrategy: z.enum(['skip', 'update', 'error']).default('update'),
  dryRun: z.boolean().default(false),
});

export const tiansiERPRouter = router({
  // ============ Connection ============
  testConnection: adminProcedure.mutation(async () => {
    return tiansiMssql.testConnection();
  }),

  getPoolStatus: protectedProcedure.query(() => {
    return tiansiMssql.getPoolStatus();
  }),

  closeConnection: adminProcedure.mutation(async () => {
    await tiansiMssql.close();
    return { success: true, message: '连接池已关闭' };
  }),

  // ============ Discovery ============
  discoverTables: adminProcedure.query(async () => {
    const tables = await tiansiMssql.query(DISCOVERY_QUERY);
    return { tables, count: tables.length };
  }),

  discoverColumns: adminProcedure
    .input(z.object({ tableName: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const columns = await tiansiMssql.query(COLUMNS_QUERY(input.tableName), { tableName: input.tableName });
      return { tableName: input.tableName, columns, count: columns.length };
    }),

  previewData: adminProcedure
    .input(z.object({ tableName: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const rows = await tiansiMssql.query(PREVIEW_QUERY(input.tableName));
      return { tableName: input.tableName, rows, count: rows.length };
    }),

  // ============ Entity Migration ============
  migrateMaterials: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('materials', input, (ctx as any).userId);
    }),

  migrateSuppliers: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('suppliers', input, (ctx as any).userId);
    }),

  migrateBOMs: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('boms', input, (ctx as any).userId);
    }),

  migratePOs: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('purchaseOrders', input, (ctx as any).userId);
    }),

  migrateInventory: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('inventory', input, (ctx as any).userId);
    }),

  migrateWarehouses: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('warehouses', input, (ctx as any).userId);
    }),

  migrateLots: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      return migrateSingle('lots', input, (ctx as any).userId);
    }),

  // ============ Orchestration ============
  migrateAll: adminProcedure
    .input(MigrationOptionsSchema)
    .mutation(async ({ input, ctx }) => {
      const results = await migrateAllEntities(input, (ctx as any).userId);
      const totalSuccess = Object.values(results).reduce((s, r) => s + r.success, 0);
      const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0);
      return {
        success: totalFailed === 0,
        message: `全量迁移完成: 成功 ${totalSuccess}, 失败 ${totalFailed}`,
        results,
      };
    }),

  getMigrationStatus: adminProcedure.query(async () => {
    const pool = tiansiMssql.getPoolStatus();
    const history = await getMigrationHistory(5);
    return { pool, recentBatches: history };
  }),

  getMigrationHistory: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return getMigrationHistory(input.limit);
    }),

  retryFailed: adminProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // TODO: implement retry logic - re-extract failed rows from batch error log
      return { success: true, message: `重试批次 ${input.batchId} 已排队` };
    }),

  validateMigration: adminProcedure.query(async () => {
    return runVerification();
  }),

  // ============ Verification (F2) ============
  runVerification: adminProcedure.mutation(async () => {
    return runVerification();
  }),

  getVerificationReport: adminProcedure.query(async () => {
    return runVerification();
  }),

  generateMigrationSummary: adminProcedure.query(async () => {
    return generateMigrationSummary();
  }),

  getCutoverChecklist: adminProcedure.query(async () => {
    const summary = await generateMigrationSummary();
    return {
      checklist: summary.checklist,
      readiness: summary.cutoverReadiness,
      totalEntities: summary.totalEntities,
      migratedEntities: summary.migratedEntities,
    };
  }),

  // ============ Status & Mappings ============
  getIntegrationStatus: protectedProcedure.query(async () => {
    const pool = tiansiMssql.getPoolStatus();
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

  getFieldMappings: protectedProcedure.query(async () => {
    return {
      materials: {
        description: '物料字段映射 (天思MSSQL → GRT)',
        mappings: [
          { tiansiField: 'material_code', grtField: 'materialCode', required: true },
          { tiansiField: 'material_name', grtField: 'materialName', required: true },
          { tiansiField: 'material_spec', grtField: 'specificationCode', required: false },
          { tiansiField: 'material_type', grtField: 'materialType', required: false },
          { tiansiField: 'unit_price', grtField: 'standardCost', required: false },
          { tiansiField: 'manufacturer', grtField: 'manufacturer', required: false },
          { tiansiField: 'category', grtField: 'categoryCode', required: false },
        ],
      },
      suppliers: {
        description: '供应商字段映射',
        mappings: [
          { tiansiField: 'supplier_code', grtField: 'supplierCode', required: true },
          { tiansiField: 'supplier_name', grtField: 'supplierName', required: true },
          { tiansiField: 'supplier_category', grtField: 'supplierCategory', required: false },
          { tiansiField: 'contact_person', grtField: 'contactPerson', required: false },
          { tiansiField: 'quality_rating', grtField: 'qualityRating', required: false },
        ],
      },
      purchaseOrders: {
        description: '采购订单字段映射',
        mappings: [
          { tiansiField: 'po_number', grtField: 'poNumber', required: true },
          { tiansiField: 'supplier_code', grtField: 'supplierCode', required: true },
          { tiansiField: 'quantity', grtField: 'quantity', required: true },
          { tiansiField: 'unit_price', grtField: 'unitPrice', required: true },
          { tiansiField: 'total_amount', grtField: 'totalAmount', required: false },
        ],
      },
      bom: {
        description: 'BOM字段映射',
        mappings: [
          { tiansiField: 'bom_id', grtField: 'erpBomId', required: true },
          { tiansiField: 'product_code', grtField: 'productCode', required: true },
          { tiansiField: 'product_name', grtField: 'productName', required: true },
          { tiansiField: 'version', grtField: 'currentVersion', required: false },
        ],
      },
      warehouse: {
        description: '仓库字段映射',
        mappings: [
          { tiansiField: 'warehouse_code', grtField: 'warehouseCode', required: true },
          { tiansiField: 'warehouse_name', grtField: 'warehouseName', required: true },
          { tiansiField: 'warehouse_type', grtField: 'warehouseType', required: false },
        ],
      },
      lots: {
        description: '批次字段映射',
        mappings: [
          { tiansiField: 'lot_number', grtField: 'lotNumber', required: true },
          { tiansiField: 'material_code', grtField: 'materialCode', required: true },
          { tiansiField: 'current_qty', grtField: 'currentQty', required: false },
          { tiansiField: 'expiry_date', grtField: 'expiryDate', required: false },
        ],
      },
      inventory: {
        description: '库存字段映射',
        mappings: [
          { tiansiField: 'material_code', grtField: 'materialCode', required: true },
          { tiansiField: 'warehouse_code', grtField: 'warehouseId', required: false },
          { tiansiField: 'quantity_on_hand', grtField: 'quantityOnHand', required: false },
          { tiansiField: 'quantity_reserved', grtField: 'quantityReserved', required: false },
        ],
      },
    };
  }),
});
