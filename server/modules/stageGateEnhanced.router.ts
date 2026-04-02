/**
 * 门径管理增强功能 - tRPC路由
 * 功能：项目导入向导、ERP对接接口
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { jsonValue } from "@shared/validators";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  ProjectImportService,
  ERPIntegrationManager,
} from "../services/stage-gate-enhanced.service";
import type { ImportResult } from "../services/stage-gate-enhanced.service";

/** Raw row from import_history table */
interface ImportHistoryRow {
  id: number;
  user_id: number | null;
  import_type: string;
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  status: string;
  created_at: string;
  user_name?: string;
}

/** Raw row from erp_configurations table */
interface ErpConfigRow {
  erp_type: string;
  config: string;
  updated_at: string;
}

/** Raw row from erp_sync_history table */
interface ErpSyncHistoryRow {
  id: number;
  erp_type: string;
  sync_type: string;
  result: string;
  user_id: number | null;
  user_name?: string;
  created_at: string;
}

/** ERP sync result shape — matches fullSync return type */
interface ErpSyncResult {
  projects?: import("../services/stage-gate-enhanced.service").ERPSyncResult;
  customers?: import("../services/stage-gate-enhanced.service").ERPSyncResult;
  orders?: import("../services/stage-gate-enhanced.service").ERPSyncResult;
}

/** ERP last sync row */
interface ErpLastSyncRow {
  erp_type: string;
  last_sync: string | null;
}

// 全局ERP管理器实例
const erpManager = new ERPIntegrationManager();

export const stageGateEnhancedRouter = router({
  // ==================== 项目导入向导 ====================

  // 获取字段映射建议
  suggestFieldMapping: requirePermission('project:stage-gate:manage')
    .input(
      z.object({
        headers: z.array(z.string()),
        sampleData: z.array(z.record(z.string(), jsonValue)),
      })
    )
    .mutation(async ({ input }) => {
      const { headers, sampleData } = input;
      const suggestions = await ProjectImportService.suggestFieldMapping(
        headers,
        sampleData
      );
      return suggestions;
    }),

  // 验证导入数据
  validateImportData: requirePermission('project:stage-gate:manage')
    .input(
      z.object({
        data: z.array(z.record(z.string(), jsonValue)),
        mapping: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const { data, mapping } = input;
      const result = ProjectImportService.validateImportData(data as Record<string, unknown>[], mapping);
      return result;
    }),

  // 执行项目导入
  executeImport: protectedProcedure
    .input(
      z.object({
        data: z.array(z.record(z.string(), jsonValue)),
        mapping: z.record(z.string(), z.string()),
        options: z
          .object({
            skipDuplicates: z.boolean().default(true),
            updateExisting: z.boolean().default(false),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, mapping, options } = input;
      const result = await ProjectImportService.executeImport(data as Record<string, unknown>[], mapping as Record<string, string>, {
        ...options,
        userId: ctx.user?.id,
      });

      // 记录导入历史
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO import_history
        (user_id, import_type, total_rows, imported, updated, skipped, failed, status)
        VALUES (${ctx.user?.id ?? null}, 'project', ${result.totalProcessed}, ${result.imported}, ${result.updated}, ${result.skipped}, ${result.failed}, ${result.success ? "success" : "partial"})
      `);

      return result;
    }),

  // 获取导入历史
  getImportHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const result = await db.execute(sql`
        SELECT ih.*, u.name as user_name
        FROM import_history ih
        LEFT JOIN user u ON ih.user_id = u.id
        ORDER BY ih.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      return {
        items: result.rows as unknown as ImportHistoryRow[],
        page,
        pageSize,
      };
    }),

  // 获取导入模板
  getImportTemplate: protectedProcedure.query(async () => {
    return {
      fields: [
        { name: "project_code", label: "项目编号", required: true, example: "PRJ-2024-001" },
        { name: "project_name", label: "项目名称", required: true, example: "XX公司自动化项目" },
        { name: "customer_name", label: "客户名称", required: true, example: "XX科技有限公司" },
        { name: "customer_code", label: "客户编号", required: false, example: "CUST-001" },
        { name: "contract_amount", label: "合同金额", required: false, example: "1000000" },
        { name: "currency", label: "币种", required: false, example: "CNY" },
        { name: "start_date", label: "开始日期", required: false, example: "2024-01-01" },
        { name: "target_date", label: "目标完成日期", required: false, example: "2024-12-31" },
        { name: "current_stage", label: "当前阶段", required: false, example: "M3" },
        { name: "project_manager", label: "项目经理", required: false, example: "杨勇" },
        { name: "sales_rep", label: "销售负责人", required: false, example: "戴晓燕" },
        { name: "product_type", label: "产品类型", required: false, example: "自动化设备" },
        { name: "industry", label: "行业", required: false, example: "制造业" },
        { name: "region", label: "区域", required: false, example: "华东" },
        { name: "priority", label: "优先级", required: false, example: "高" },
        { name: "description", label: "项目描述", required: false, example: "项目详细描述" },
      ],
      downloadUrl: "/templates/project-import-template.xlsx",
    };
  }),

  // ==================== ERP对接 ====================

  // 配置ERP连接
  configureERP: adminProcedure
    .input(
      z.object({
        type: z.enum(["sap", "oracle", "kingdee"]),
        config: z.object({
          host: z.string(),
          port: z.number(),
          username: z.string().optional(),
          password: z.string().optional(),
          database: z.string().optional(),
          apiKey: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { type, config } = input;

      // 保存配置到数据库
      const configJson = JSON.stringify(config);
      await db.execute(sql`
        INSERT INTO erp_configurations (erp_type, config, created_by, updated_at)
        VALUES (${type}, ${configJson}, ${ctx.user?.id ?? null}, NOW())
        ON DUPLICATE KEY UPDATE config = VALUES(config), updated_at = NOW()
      `);

      // 注册适配器
      erpManager.registerAdapter(type, config);

      return { success: true, message: `${type.toUpperCase()} ERP配置已保存` };
    }),

  // 测试ERP连接
  testERPConnection: adminProcedure
    .input(
      z.object({
        type: z.enum(["sap", "oracle", "kingdee"]),
      })
    )
    .mutation(async ({ input }) => {
      const { type } = input;

      // 先加载配置
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT config FROM erp_configurations WHERE erp_type = ${type} LIMIT 1
      `);
      const rows = result.rows as unknown as ErpConfigRow[];

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `未找到${type.toUpperCase()} ERP配置`,
        });
      }

      const config = JSON.parse(rows[0].config) as import("../services/stage-gate-enhanced.service").ERPConfig;
      erpManager.registerAdapter(type, config);

      const connected = await erpManager.testConnection(type);
      return {
        success: connected,
        message: connected ? "连接成功" : "连接失败",
      };
    }),

  // 执行ERP同步
  syncFromERP: adminProcedure
    .input(
      z.object({
        type: z.enum(["sap", "oracle", "kingdee"]),
        syncType: z.enum(["projects", "customers", "orders", "all"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { type, syncType } = input;

      // 加载配置
      const configResult = await db.execute(sql`
        SELECT config FROM erp_configurations WHERE erp_type = ${type} LIMIT 1
      `);
      const rows = configResult.rows as unknown as ErpConfigRow[];

      if (rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `未找到${type.toUpperCase()} ERP配置`,
        });
      }

      const config = JSON.parse(rows[0].config) as import("../services/stage-gate-enhanced.service").ERPConfig;
      erpManager.registerAdapter(type, config);

      let result: ErpSyncResult;

      if (syncType === "all") {
        result = await erpManager.fullSync(type);
      } else {
        const adapter = erpManager.getAdapter(type);
        if (!adapter) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "适配器未初始化" });
        }

        switch (syncType) {
          case "projects":
            result = { projects: await adapter.syncProjects() };
            break;
          case "customers":
            result = { customers: await adapter.syncCustomers() };
            break;
          case "orders":
            result = { orders: await adapter.syncOrders() };
            break;
        }
      }

      // 记录同步历史
      const resultJson = JSON.stringify(result);
      await db.execute(sql`
        INSERT INTO erp_sync_history (erp_type, sync_type, result, user_id)
        VALUES (${type}, ${syncType}, ${resultJson}, ${ctx.user?.id ?? null})
      `);

      return result;
    }),

  // 获取ERP同步历史
  getERPSyncHistory: protectedProcedure
    .input(
      z.object({
        type: z.enum(["sap", "oracle", "kingdee"]).optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { type, limit } = input;

      const whereClause = type
        ? sql`WHERE esh.erp_type = ${type}`
        : sql`WHERE 1=1`;

      const result = await db.execute(sql`
        SELECT esh.*, u.name as user_name
        FROM erp_sync_history esh
        LEFT JOIN user u ON esh.user_id = u.id
        ${whereClause}
        ORDER BY esh.created_at DESC LIMIT ${limit}
      `);

      return (result.rows as unknown as ErpSyncHistoryRow[]).map((row) => ({
        ...row,
        result: JSON.parse(row.result || "{}") as Record<string, unknown>,
      }));
    }),

  // 获取ERP配置状态
  getERPStatus: protectedProcedure.query(async () => {
    const db = await requireDb();

    const configsResult = await db.execute(sql`
      SELECT erp_type, updated_at FROM erp_configurations LIMIT 100
    `);
    const configs = configsResult.rows as unknown as ErpConfigRow[];

    const lastSyncResult = await db.execute(sql`
      SELECT erp_type, MAX(created_at) as last_sync
      FROM erp_sync_history
      GROUP BY erp_type
      LIMIT 100
    `);
    const lastSync = lastSyncResult.rows as unknown as ErpLastSyncRow[];

    const status: Record<string, unknown> = {};
    const erpTypes = ["sap", "oracle", "kingdee"];

    for (const type of erpTypes) {
      const config = configs.find((c) => c.erp_type === type);
      const sync = lastSync.find((s) => s.erp_type === type);

      status[type] = {
        configured: !!config,
        configuredAt: config?.updated_at || null,
        lastSync: sync?.last_sync || null,
      };
    }

    return status;
  }),

  // 推送交付信息到ERP
  pushDeliveryToERP: requirePermission('project:stage-gate:manage')
    .input(
      z.object({
        projectId: z.number(),
        erpType: z.enum(["sap", "oracle", "kingdee"]),
      })
    )
    .mutation(async ({ input }) => {
      const { projectId, erpType } = input;

      const adapter = erpManager.getAdapter(erpType);
      if (!adapter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${erpType.toUpperCase()} ERP未配置`,
        });
      }

      const success = await adapter.pushDelivery(projectId);
      return {
        success,
        message: success ? "交付信息已推送" : "推送失败",
      };
    }),
});
