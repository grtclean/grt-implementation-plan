/**
 * 天思ERP集成路由
 */

import { z } from "zod";
import {router, adminProcedure, protectedProcedure, requirePermission} from "../_core/trpc";
import { createTiansiERPIntegration } from "./tiansi-erp-integration";

// 天思ERP配置Schema
const TiansiERPConfigSchema = z.object({
  apiUrl: z.string().url(),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  companyId: z.string().min(1),
  syncInterval: z.number().min(5).max(1440), // 5分钟到24小时
  isEnabled: z.boolean().default(true),
});

// 全局ERP集成实例
let erpIntegration: ReturnType<typeof createTiansiERPIntegration> | null = null;

export const tiansiERPRouter = router({
  /**
   * 配置天思ERP连接
   */
  configureConnection: adminProcedure
    .input(TiansiERPConfigSchema)
    .mutation(async ({ input }) => {
      try {
        erpIntegration = createTiansiERPIntegration(input);
        
        // 测试连接
        const isConnected = await erpIntegration.testConnection();
        
        if (!isConnected) {
          return {
            success: false,
            message: '连接失败，请检查API配置',
          };
        }

        return {
          success: true,
          message: '天思ERP连接配置成功',
          config: {
            apiUrl: input.apiUrl,
            companyId: input.companyId,
            syncInterval: input.syncInterval,
            isEnabled: input.isEnabled,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '配置失败',
        };
      }
    }),

  /**
   * 测试连接
   */
  testConnection: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return {
        success: false,
        message: '天思ERP集成未配置',
      };
    }

    try {
      const isConnected = await erpIntegration.testConnection();
      return {
        success: isConnected,
        message: isConnected ? '连接成功' : '连接失败',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      };
    }
  }),

  /**
   * 导入物料
   */
  importMaterials: adminProcedure
    .input(z.object({
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      if (!erpIntegration) {
        return {
          success: false,
          message: '天思ERP集成未配置',
        };
      }

      try {
        const response = await erpIntegration.getMaterials({
          limit: input.limit,
          offset: input.offset,
        });

        if (response.code !== 0) {
          return {
            success: false,
            message: response.message,
          };
        }

        const result = await erpIntegration.importMaterials(response.data || []);

        return {
          success: result.failed === 0,
          message: `导入完成: 成功 ${result.success} 条，失败 ${result.failed} 条`,
          result,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '导入失败',
        };
      }
    }),

  /**
   * 同步采购订单
   */
  syncPurchaseOrders: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return {
        success: false,
        message: '天思ERP集成未配置',
      };
    }

    try {
      const result = await erpIntegration.syncPurchaseOrders();
      return {
        success: result.failed === 0,
        message: `同步完成: 成功 ${result.synced} 条，失败 ${result.failed} 条`,
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '同步失败',
      };
    }
  }),

  /**
   * 同步库存
   */
  syncInventory: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return {
        success: false,
        message: '天思ERP集成未配置',
      };
    }

    try {
      const result = await erpIntegration.syncInventory();
      return {
        success: result.failed === 0,
        message: `同步完成: 成功 ${result.synced} 条，失败 ${result.failed} 条`,
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '同步失败',
      };
    }
  }),

  /**
   * 同步BOM数据
   */
  syncBOMs: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return { success: false, message: '天思ERP集成未配置' };
    }
    try {
      const result = await erpIntegration.syncBOMs();
      return {
        success: result.failed === 0,
        message: `BOM同步完成: 成功 ${result.synced} 条，失败 ${result.failed} 条`,
        result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '同步失败' };
    }
  }),

  /**
   * 同步仓库数据
   */
  syncWarehouses: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return { success: false, message: '天思ERP集成未配置' };
    }
    try {
      const result = await erpIntegration.syncWarehouses();
      return {
        success: result.failed === 0,
        message: `仓库同步完成: 成功 ${result.synced} 条，失败 ${result.failed} 条`,
        result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '同步失败' };
    }
  }),

  /**
   * 同步批次数据
   */
  syncLots: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return { success: false, message: '天思ERP集成未配置' };
    }
    try {
      const result = await erpIntegration.syncLots();
      return {
        success: result.failed === 0,
        message: `批次同步完成: 成功 ${result.synced} 条，失败 ${result.failed} 条`,
        result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '同步失败' };
    }
  }),

  /**
   * 全量同步 (物料+BOM+仓库+采购+库存+批次)
   */
  syncAll: adminProcedure.mutation(async () => {
    if (!erpIntegration) {
      return { success: false, message: '天思ERP集成未配置' };
    }
    try {
      const result = await erpIntegration.syncAll();
      const totalSynced = result.materials.synced + result.boms.synced + result.warehouses.synced +
        result.orders.synced + result.inventory.synced + result.lots.synced;
      const totalFailed = result.materials.failed + result.boms.failed + result.warehouses.failed +
        result.orders.failed + result.inventory.failed + result.lots.failed;
      return {
        success: totalFailed === 0,
        message: `全量同步完成: 成功 ${totalSynced} 条，失败 ${totalFailed} 条`,
        result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '全量同步失败' };
    }
  }),

  /**
   * 启动定时同步
   */
  startAutoSync: adminProcedure
    .input(z.object({
      syncType: z.enum(['materials', 'orders', 'inventory', 'bom', 'warehouse', 'lots', 'all']).default('all'),
    }))
    .mutation(async ({ input }) => {
      if (!erpIntegration) {
        return {
          success: false,
          message: '天思ERP集成未配置',
        };
      }

      try {
        erpIntegration.startSync(input.syncType);
        return {
          success: true,
          message: `已启动 ${input.syncType} 定时同步`,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '启动失败',
        };
      }
    }),

  /**
   * 停止定时同步
   */
  stopAutoSync: adminProcedure
    .input(z.object({
      syncType: z.enum(['materials', 'orders', 'inventory', 'bom', 'warehouse', 'lots', 'all']).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!erpIntegration) {
        return {
          success: false,
          message: '天思ERP集成未配置',
        };
      }

      try {
        erpIntegration.stopSync(input.syncType);
        return {
          success: true,
          message: `已停止 ${input.syncType || 'all'} 定时同步`,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '停止失败',
        };
      }
    }),

  /**
   * 获取集成状态
   */
  getIntegrationStatus: protectedProcedure.query(async () => {
    if (!erpIntegration) {
      return {
        configured: false,
        connected: false,
        syncEnabled: false,
      };
    }

    try {
      const isConnected = await erpIntegration.testConnection();
      return {
        configured: true,
        connected: isConnected,
        syncEnabled: true,
        lastSyncTime: new Date(),
      };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        syncEnabled: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }),

  /**
   * 获取集成日志
   */
  getIntegrationLogs: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async () => {
      return {
        logs: [],
        total: 0,
      };
    }),

  /**
   * 获取字段映射配置
   */
  getFieldMappings: protectedProcedure.query(async () => {
    return {
      materials: {
        description: '物料字段映射',
        mappings: [
          { tiansiField: 'material_code', grtField: 'materialCode' },
          { tiansiField: 'material_name', grtField: 'materialName' },
          { tiansiField: 'material_spec', grtField: 'specificationCode' },
          { tiansiField: 'unit_price', grtField: 'standardCost' },
        ],
      },
      purchaseOrders: {
        description: '采购订单字段映射',
        mappings: [
          { tiansiField: 'po_number', grtField: 'poNumber' },
          { tiansiField: 'supplier_code', grtField: 'supplierCode' },
          { tiansiField: 'quantity', grtField: 'quantity' },
          { tiansiField: 'unit_price', grtField: 'unitPrice' },
        ],
      },
      inventory: {
        description: '库存字段映射',
        mappings: [
          { tiansiField: 'material_code', grtField: 'materialCode' },
          { tiansiField: 'quantity_on_hand', grtField: 'quantityOnHand' },
          { tiansiField: 'quantity_reserved', grtField: 'quantityReserved' },
        ],
      },
      bom: {
        description: 'BOM字段映射',
        mappings: [
          { tiansiField: 'bom_id', grtField: 'erpBomId' },
          { tiansiField: 'product_code', grtField: 'productCode' },
          { tiansiField: 'product_name', grtField: 'productName' },
          { tiansiField: 'version', grtField: 'currentVersion' },
        ],
      },
      bomItems: {
        description: 'BOM明细行字段映射',
        mappings: [
          { tiansiField: 'material_code', grtField: 'materialCode' },
          { tiansiField: 'quantity', grtField: 'quantity' },
          { tiansiField: 'scrap_rate', grtField: 'scrapRate' },
          { tiansiField: 'unit_cost', grtField: 'unitCost' },
        ],
      },
      warehouse: {
        description: '仓库字段映射',
        mappings: [
          { tiansiField: 'warehouse_code', grtField: 'warehouseCode' },
          { tiansiField: 'warehouse_name', grtField: 'warehouseName' },
          { tiansiField: 'warehouse_type', grtField: 'warehouseType' },
        ],
      },
      lots: {
        description: '批次字段映射',
        mappings: [
          { tiansiField: 'lot_number', grtField: 'lotNumber' },
          { tiansiField: 'material_code', grtField: 'materialCode' },
          { tiansiField: 'current_qty', grtField: 'currentQty' },
          { tiansiField: 'expiry_date', grtField: 'expiryDate' },
        ],
      },
    };
  }),
});
