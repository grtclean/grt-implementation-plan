/**
 * 天思ERP集成模块
 * 
 * 支持天思ERP系统的数据同步和集成
 * 主要功能：
 * - 物料数据导入
 * - 采购订单同步
 * - 库存数据同步
 * - 发票数据同步
 */

import { z } from "zod";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("erp");

/**
 * 天思ERP连接配置
 */
export interface TiansiERPConfig {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  companyId: string;
  syncInterval: number; // 同步间隔（分钟）
  isEnabled: boolean;
}

/**
 * 天思ERP API响应
 */
export interface TiansiERPResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * 物料导入映射
 */
export const MATERIAL_FIELD_MAPPING = {
  // 天思ERP字段 -> GRT字段
  'material_code': 'materialCode',
  'material_name': 'materialName',
  'material_spec': 'specificationCode',
  'material_type': 'materialType',
  'unit_price': 'standardCost',
  'manufacturer': 'manufacturer',
  'manufacturer_code': 'manufacturerCode',
  'min_stock': 'minStockLevel',
  'max_stock': 'maxStockLevel',
  'category': 'categoryCode',
} as const;

/**
 * 采购订单映射
 */
export const PO_FIELD_MAPPING = {
  'po_number': 'poNumber',
  'po_date': 'poDate',
  'supplier_code': 'supplierCode',
  'supplier_name': 'supplierName',
  'material_code': 'materialCode',
  'quantity': 'quantity',
  'unit_price': 'unitPrice',
  'total_amount': 'totalAmount',
  'delivery_date': 'expectedDeliveryDate',
  'po_status': 'status',
} as const;

/**
 * 库存数据映射
 */
export const INVENTORY_FIELD_MAPPING = {
  'material_code': 'materialCode',
  'warehouse_code': 'warehouseId',
  'quantity_on_hand': 'quantityOnHand',
  'quantity_reserved': 'quantityReserved',
  'quantity_available': 'quantityAvailable',
  'last_count_date': 'lastCountDate',
} as const;

/**
 * BOM主表映射
 */
export const BOM_FIELD_MAPPING = {
  'bom_id': 'erpBomId',
  'product_code': 'productCode',
  'product_name': 'productName',
  'bom_type': 'bomType',
  'version': 'currentVersion',
  'status': 'status',
  'standard_qty': 'standardQty',
  'standard_unit': 'standardUnit',
} as const;

/**
 * BOM明细行映射
 */
export const BOM_ITEM_FIELD_MAPPING = {
  'item_id': 'erpItemId',
  'material_code': 'materialCode',
  'material_name': 'materialName',
  'material_spec': 'materialSpec',
  'quantity': 'quantity',
  'unit': 'unit',
  'scrap_rate': 'scrapRate',
  'source_type': 'sourceType',
  'process_code': 'processCode',
  'lead_time': 'leadTimeDays',
  'unit_cost': 'unitCost',
} as const;

/**
 * 仓库映射
 */
export const WAREHOUSE_FIELD_MAPPING = {
  'warehouse_code': 'warehouseCode',
  'warehouse_name': 'warehouseName',
  'warehouse_type': 'warehouseType',
  'address': 'address',
  'manager_name': 'managerName',
  'contact_phone': 'contactPhone',
} as const;

/**
 * 批次映射
 */
export const LOT_FIELD_MAPPING = {
  'lot_number': 'lotNumber',
  'material_code': 'materialCode',
  'material_name': 'materialName',
  'initial_qty': 'initialQty',
  'current_qty': 'currentQty',
  'unit': 'unit',
  'supplier_lot': 'supplierLotNumber',
  'supplier_name': 'supplierName',
  'warehouse_code': 'warehouseCode',
  'production_date': 'productionDate',
  'expiry_date': 'expiryDate',
} as const;

/**
 * 天思ERP集成服务
 */
export class TiansiERPIntegrationService {
  private config: TiansiERPConfig;
  private syncTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: TiansiERPConfig) {
    this.config = config;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/api/system/health');
      return response.code === 0;
    } catch (error) {
      log.error({ err: error }, "天思ERP连接测试失败");
      return false;
    }
  }

  /**
   * 获取物料列表
   */
  async getMaterials(params?: {
    category?: string;
    materialType?: string;
    limit?: number;
    offset?: number;
  }): Promise<TiansiERPResponse<any[]>> {
    return this.makeRequest('GET', '/api/materials', params);
  }

  /**
   * 导入物料
   */
  async importMaterials(materials: any[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ index: number; error: string }>,
    };

    for (let i = 0; i < materials.length; i++) {
      try {
        const material = materials[i];
        const mappedMaterial = this.mapMaterialFields(material);
        
        // 验证必填字段
        if (!mappedMaterial.materialCode || !mappedMaterial.materialName) {
          throw new Error('缺少必填字段: materialCode 或 materialName');
        }

        // 这里应该调用GRT API创建物料
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return results;
  }

  /**
   * 获取采购订单
   */
  async getPurchaseOrders(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<TiansiERPResponse<any[]>> {
    return this.makeRequest('GET', '/api/purchase-orders', params);
  }

  /**
   * 同步采购订单
   */
  async syncPurchaseOrders(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const response = await this.getPurchaseOrders({
        status: 'pending',
        limit: 100,
      });

      if (response.code !== 0) {
        throw new Error(`API错误: ${response.message}`);
      }

      for (const po of response.data || []) {
        try {
          const mappedPO = this.mapPOFields(po);
          // 这里应该调用GRT API创建采购订单
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push(error instanceof Error ? error.message : '未知错误');
        }
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '未知错误');
    }

    return results;
  }

  /**
   * 获取库存数据
   */
  async getInventory(params?: {
    warehouseCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<TiansiERPResponse<any[]>> {
    return this.makeRequest('GET', '/api/inventory', params);
  }

  /**
   * 同步库存数据
   */
  async syncInventory(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      const response = await this.getInventory({ limit: 500 });

      if (response.code !== 0) {
        throw new Error(`API错误: ${response.message}`);
      }

      for (const inventory of response.data || []) {
        try {
          const mappedInventory = this.mapInventoryFields(inventory);
          // 这里应该调用GRT API更新库存
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push(error instanceof Error ? error.message : '未知错误');
        }
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '未知错误');
    }

    return results;
  }

  // ============================================
  // BOM同步方法
  // ============================================

  /**
   * 获取ERP中的BOM列表
   */
  async getBOMs(params?: {
    productCode?: string;
    bomType?: string;
    limit?: number;
    offset?: number;
  }): Promise<TiansiERPResponse<any[]>> {
    return this.makeRequest('GET', '/api/bom/list', params);
  }

  /**
   * 获取ERP中单个BOM的完整结构(含明细行)
   */
  async getBOMDetail(erpBomId: string): Promise<TiansiERPResponse<any>> {
    return this.makeRequest('GET', `/api/bom/${erpBomId}`);
  }

  /**
   * 同步BOM数据
   */
  async syncBOMs(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const results = { synced: 0, failed: 0, errors: [] as string[] };

    try {
      const response = await this.getBOMs({ limit: 200 });
      if (response.code !== 0) {
        throw new Error(`API错误: ${response.message}`);
      }

      for (const bomData of response.data || []) {
        try {
          const mappedBOM = this.mapFields(bomData, BOM_FIELD_MAPPING);
          // 获取BOM明细
          if (bomData.bom_id) {
            const detailResp = await this.getBOMDetail(bomData.bom_id);
            if (detailResp.code === 0 && detailResp.data?.items) {
              mappedBOM.items = detailResp.data.items.map((item: any) =>
                this.mapFields(item, BOM_ITEM_FIELD_MAPPING)
              );
            }
          }
          // 这里应该调用GRT BOM router创建或更新BOM
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push(error instanceof Error ? error.message : '未知错误');
        }
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '未知错误');
    }

    return results;
  }

  // ============================================
  // 仓库同步方法
  // ============================================

  /**
   * 获取ERP中的仓库列表
   */
  async getWarehouses(params?: {
    limit?: number;
    offset?: number;
  }): Promise<TiansiERPResponse<any[]>> {
    return this.makeRequest('GET', '/api/warehouses', params);
  }

  /**
   * 同步仓库数据
   */
  async syncWarehouses(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const results = { synced: 0, failed: 0, errors: [] as string[] };

    try {
      const response = await this.getWarehouses({ limit: 100 });
      if (response.code !== 0) {
        throw new Error(`API错误: ${response.message}`);
      }

      for (const whData of response.data || []) {
        try {
          const mapped = this.mapFields(whData, WAREHOUSE_FIELD_MAPPING);
          if (!mapped.warehouseCode) throw new Error('缺少仓库编码');
          // 这里应该调用GRT Warehouse router创建或更新仓库
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push(error instanceof Error ? error.message : '未知错误');
        }
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '未知错误');
    }

    return results;
  }

  /**
   * 获取ERP中的批次数据
   */
  async getLots(params?: {
    materialCode?: string;
    warehouseCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<TiansiERPResponse<any[]>> {
    return this.makeRequest('GET', '/api/inventory/lots', params);
  }

  /**
   * 同步批次数据
   */
  async syncLots(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const results = { synced: 0, failed: 0, errors: [] as string[] };

    try {
      const response = await this.getLots({ limit: 500 });
      if (response.code !== 0) {
        throw new Error(`API错误: ${response.message}`);
      }

      for (const lotData of response.data || []) {
        try {
          const mapped = this.mapFields(lotData, LOT_FIELD_MAPPING);
          if (!mapped.lotNumber || !mapped.materialCode) {
            throw new Error('缺少必填字段: lotNumber 或 materialCode');
          }
          // 这里应该调用GRT Warehouse router创建或更新批次
          results.synced++;
        } catch (error) {
          results.failed++;
          results.errors.push(error instanceof Error ? error.message : '未知错误');
        }
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '未知错误');
    }

    return results;
  }

  /**
   * 全量同步：物料+BOM+仓库+采购+库存+批次
   */
  async syncAll(): Promise<{
    materials: { synced: number; failed: number };
    boms: { synced: number; failed: number };
    warehouses: { synced: number; failed: number };
    orders: { synced: number; failed: number };
    inventory: { synced: number; failed: number };
    lots: { synced: number; failed: number };
    totalErrors: string[];
  }> {
    const totalErrors: string[] = [];

    const [matResult, bomResult, whResult, poResult, invResult, lotResult] =
      await Promise.allSettled([
        this.importMaterials((await this.getMaterials({ limit: 500 })).data || []),
        this.syncBOMs(),
        this.syncWarehouses(),
        this.syncPurchaseOrders(),
        this.syncInventory(),
        this.syncLots(),
      ]);

    const extract = (r: PromiseSettledResult<any>) => {
      if (r.status === 'fulfilled') return r.value;
      totalErrors.push(r.reason?.message || '未知错误');
      return { synced: 0, failed: 0, success: 0, errors: [] };
    };

    const mat = extract(matResult);
    const bom = extract(bomResult);
    const wh = extract(whResult);
    const po = extract(poResult);
    const inv = extract(invResult);
    const lot = extract(lotResult);

    return {
      materials: { synced: mat.success || mat.synced || 0, failed: mat.failed || 0 },
      boms: { synced: bom.synced || 0, failed: bom.failed || 0 },
      warehouses: { synced: wh.synced || 0, failed: wh.failed || 0 },
      orders: { synced: po.synced || 0, failed: po.failed || 0 },
      inventory: { synced: inv.synced || 0, failed: inv.failed || 0 },
      lots: { synced: lot.synced || 0, failed: lot.failed || 0 },
      totalErrors,
    };
  }

  /**
   * 获取同步状态概览
   */
  getSyncStatus(): {
    isEnabled: boolean;
    activeSyncTasks: string[];
    config: Partial<TiansiERPConfig>;
  } {
    return {
      isEnabled: this.config.isEnabled,
      activeSyncTasks: Array.from(this.syncTasks.keys()),
      config: {
        apiUrl: this.config.apiUrl,
        companyId: this.config.companyId,
        syncInterval: this.config.syncInterval,
      },
    };
  }

  /**
   * 启动定时同步
   */
  startSync(syncType: 'materials' | 'orders' | 'inventory' | 'bom' | 'warehouse' | 'lots' | 'all'): void {
    if (!this.config.isEnabled) {
      log.warn("天思ERP集成未启用");
      return;
    }

    const interval = this.config.syncInterval * 60 * 1000;

    if (syncType === 'materials' || syncType === 'all') {
      this.syncTasks.set('materials', setInterval(async () => {
        try {
          const materials = await this.getMaterials({ limit: 100 });
          if (materials.code === 0) {
            await this.importMaterials(materials.data || []);
          }
        } catch (error) {
          log.error({ err: error }, "物料同步失败");
        }
      }, interval));
    }

    if (syncType === 'orders' || syncType === 'all') {
      this.syncTasks.set('orders', setInterval(async () => {
        try {
          await this.syncPurchaseOrders();
        } catch (error) {
          log.error({ err: error }, "采购订单同步失败");
        }
      }, interval));
    }

    if (syncType === 'inventory' || syncType === 'all') {
      this.syncTasks.set('inventory', setInterval(async () => {
        try {
          await this.syncInventory();
        } catch (error) {
          log.error({ err: error }, "库存同步失败");
        }
      }, interval));
    }

    if (syncType === 'bom' || syncType === 'all') {
      this.syncTasks.set('bom', setInterval(async () => {
        try {
          await this.syncBOMs();
        } catch (error) {
          log.error({ err: error }, "BOM同步失败");
        }
      }, interval));
    }

    if (syncType === 'warehouse' || syncType === 'all') {
      this.syncTasks.set('warehouse', setInterval(async () => {
        try {
          await this.syncWarehouses();
        } catch (error) {
          log.error({ err: error }, "仓库同步失败");
        }
      }, interval));
    }

    if (syncType === 'lots' || syncType === 'all') {
      this.syncTasks.set('lots', setInterval(async () => {
        try {
          await this.syncLots();
        } catch (error) {
          log.error({ err: error }, "批次同步失败");
        }
      }, interval));
    }
  }

  /**
   * 停止定时同步
   */
  stopSync(syncType?: 'materials' | 'orders' | 'inventory' | 'bom' | 'warehouse' | 'lots' | 'all'): void {
    if (!syncType || syncType === 'all') {
      this.syncTasks.forEach(task => clearInterval(task));
      this.syncTasks.clear();
    } else {
      const task = this.syncTasks.get(syncType);
      if (task) {
        clearInterval(task);
        this.syncTasks.delete(syncType);
      }
    }
  }

  /**
   * 通用字段映射
   */
  private mapFields(source: any, mapping: Record<string, string>): any {
    const target: any = {};
    Object.entries(mapping).forEach(([sourceKey, targetKey]) => {
      if (sourceKey in source) {
        target[targetKey] = source[sourceKey];
      }
    });
    return target;
  }

  private mapMaterialFields(source: any): any {
    return this.mapFields(source, MATERIAL_FIELD_MAPPING);
  }

  private mapPOFields(source: any): any {
    return this.mapFields(source, PO_FIELD_MAPPING);
  }

  private mapInventoryFields(source: any): any {
    return this.mapFields(source, INVENTORY_FIELD_MAPPING);
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<TiansiERPResponse> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-API-Secret': this.config.apiSecret,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      log.error({ err: error, endpoint }, "天思ERP API请求失败");
      throw error;
    }
  }
}

/**
 * 创建天思ERP集成服务实例
 */
export function createTiansiERPIntegration(config: TiansiERPConfig): TiansiERPIntegrationService {
  return new TiansiERPIntegrationService(config);
}
