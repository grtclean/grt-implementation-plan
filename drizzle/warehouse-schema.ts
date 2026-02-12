/**
 * GRT 5.0 仓库管理数据库Schema
 *
 * 包含:
 * - 仓库定义
 * - 库位管理 (仓-区-架-层-位)
 * - 入库/出库/调拨单据
 * - 库存盘点
 *
 * 支持多仓库多库位精确管理，与天思ERP仓库数据同步
 */

import {
  mysqlTable, int, varchar, text, timestamp, decimal,
  mysqlEnum, index, unique, boolean, json,
} from 'drizzle-orm/mysql-core';

// ============================================
// 仓库主表
// ============================================
export const warehouses = mysqlTable('warehouses', {
  id: int().autoincrement().notNull(),
  warehouseCode: varchar({ length: 20 }).notNull(),
  warehouseName: varchar({ length: 100 }).notNull(),
  // 仓库类型
  warehouseType: mysqlEnum(['raw_material', 'semi_finished', 'finished_goods', 'spare_parts', 'tools', 'quarantine', 'returns']).notNull(),
  // 所属BU
  buCode: mysqlEnum(['BU1', 'BU2', 'BU3', 'BU4', 'BU5']),
  // 地址/位置
  address: varchar({ length: 300 }),
  building: varchar({ length: 50 }),
  floor: varchar({ length: 10 }),
  // 容量
  totalArea: decimal({ precision: 10, scale: 2 }), // 平方米
  totalCapacity: int(), // 最大库位数
  // 负责人
  managerId: int(),
  managerName: varchar({ length: 50 }),
  contactPhone: varchar({ length: 20 }),
  // 天思ERP关联
  erpWarehouseCode: varchar({ length: 50 }),
  erpSyncStatus: mysqlEnum(['not_synced', 'synced', 'sync_error']).default('not_synced'),
  // 状态
  isActive: boolean().default(true),
  // 备注
  description: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_warehouse_code').on(table.warehouseCode),
  index('idx_wh_type').on(table.warehouseType),
  index('idx_wh_bu').on(table.buCode),
  index('idx_wh_erp').on(table.erpWarehouseCode),
]);

// ============================================
// 库位表 - 仓-区-架-层-位 层级
// ============================================
export const warehouseLocations = mysqlTable('warehouse_locations', {
  id: int().autoincrement().notNull(),
  warehouseId: int().notNull(),
  // 库位编码 (格式: WH01-A-01-03-05 = 仓库-区-架-层-位)
  locationCode: varchar({ length: 30 }).notNull(),
  // 层级信息
  zone: varchar({ length: 10 }).notNull(),        // 区域 (A, B, C...)
  aisle: varchar({ length: 10 }),                  // 通道/货架号
  shelf: varchar({ length: 10 }),                  // 层
  bin: varchar({ length: 10 }),                    // 格位
  // 库位类型
  locationType: mysqlEnum(['storage', 'picking', 'staging', 'receiving', 'shipping', 'quality_hold']).notNull().default('storage'),
  // 容量限制
  maxWeight: decimal({ precision: 10, scale: 2 }), // 最大承重(kg)
  maxVolume: decimal({ precision: 10, scale: 2 }), // 最大体积(m³)
  maxItems: int(),                                 // 最大物料种类数
  // 当前状态
  isOccupied: boolean().default(false),
  currentMaterialCode: varchar({ length: 50 }),
  currentQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  // 温湿度要求
  tempRequirement: mysqlEnum(['normal', 'cold', 'frozen', 'heated']).default('normal'),
  // 状态
  isActive: boolean().default(true),
  isLocked: boolean().default(false),   // 锁定（盘点/调拨中）
  lockReason: varchar({ length: 200 }),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_location_code').on(table.locationCode),
  index('idx_loc_warehouse').on(table.warehouseId),
  index('idx_loc_zone').on(table.zone),
  index('idx_loc_type').on(table.locationType),
  index('idx_loc_material').on(table.currentMaterialCode),
]);

// ============================================
// 入库单
// ============================================
export const warehouseReceipts = mysqlTable('warehouse_receipts', {
  id: int().autoincrement().notNull(),
  // 入库单号
  receiptCode: varchar({ length: 30 }).notNull(),
  // 入库类型
  receiptType: mysqlEnum(['purchase', 'production', 'return', 'transfer_in', 'adjustment', 'initial']).notNull(),
  // 关联单据
  sourceDocType: varchar({ length: 20 }),  // PO, WorkOrder, TransferOrder
  sourceDocId: int(),
  sourceDocCode: varchar({ length: 30 }),
  // 仓库/库位
  warehouseId: int().notNull(),
  locationId: int(),
  // 状态
  status: mysqlEnum(['draft', 'pending_qc', 'qc_passed', 'qc_failed', 'shelved', 'cancelled']).notNull().default('draft'),
  // 操作人
  receivedBy: int(),
  receivedByName: varchar({ length: 50 }),
  receivedAt: timestamp({ mode: 'string' }),
  // 质检
  qcResult: mysqlEnum(['pending', 'passed', 'failed', 'partial']),
  qcBy: int(),
  qcAt: timestamp({ mode: 'string' }),
  qcNotes: text(),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_receipt_code').on(table.receiptCode),
  index('idx_receipt_type').on(table.receiptType),
  index('idx_receipt_status').on(table.status),
  index('idx_receipt_source').on(table.sourceDocType, table.sourceDocId),
  index('idx_receipt_warehouse').on(table.warehouseId),
]);

// ============================================
// 入库单明细行
// ============================================
export const warehouseReceiptItems = mysqlTable('warehouse_receipt_items', {
  id: int().autoincrement().notNull(),
  receiptId: int().notNull(),
  // 物料信息
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }),
  // 数量
  expectedQty: decimal({ precision: 10, scale: 2 }).notNull(),
  receivedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  rejectedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  unit: varchar({ length: 20 }).notNull().default('个'),
  // 批次信息
  lotNumber: varchar({ length: 50 }),
  serialNumbers: json(),  // 序列号列表
  // 上架库位
  locationId: int(),
  locationCode: varchar({ length: 30 }),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_ri_receipt').on(table.receiptId),
  index('idx_ri_material').on(table.materialCode),
  index('idx_ri_lot').on(table.lotNumber),
]);

// ============================================
// 出库单（发料单）
// ============================================
export const warehouseIssues = mysqlTable('warehouse_issues', {
  id: int().autoincrement().notNull(),
  // 出库单号
  issueCode: varchar({ length: 30 }).notNull(),
  // 出库类型
  issueType: mysqlEnum(['production', 'sales', 'transfer_out', 'scrap', 'sample', 'adjustment']).notNull(),
  // 关联单据
  sourceDocType: varchar({ length: 20 }),
  sourceDocId: int(),
  sourceDocCode: varchar({ length: 30 }),
  // 关联工序
  processCode: varchar({ length: 20 }),
  // 仓库
  warehouseId: int().notNull(),
  // 申请部门/项目
  requestDept: varchar({ length: 50 }),
  projectCode: varchar({ length: 50 }),
  // 状态
  status: mysqlEnum(['draft', 'approved', 'picking', 'issued', 'partial', 'cancelled']).notNull().default('draft'),
  // 操作人
  issuedBy: int(),
  issuedByName: varchar({ length: 50 }),
  issuedAt: timestamp({ mode: 'string' }),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_issue_code').on(table.issueCode),
  index('idx_issue_type').on(table.issueType),
  index('idx_issue_status').on(table.status),
  index('idx_issue_warehouse').on(table.warehouseId),
  index('idx_issue_project').on(table.projectCode),
]);

// ============================================
// 出库单明细行
// ============================================
export const warehouseIssueItems = mysqlTable('warehouse_issue_items', {
  id: int().autoincrement().notNull(),
  issueId: int().notNull(),
  // 物料
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }),
  // 数量
  requestedQty: decimal({ precision: 10, scale: 2 }).notNull(),
  issuedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  unit: varchar({ length: 20 }).notNull().default('个'),
  // 拣货库位
  locationId: int(),
  locationCode: varchar({ length: 30 }),
  // 批次
  lotNumber: varchar({ length: 50 }),
  serialNumbers: json(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_ii_issue').on(table.issueId),
  index('idx_ii_material').on(table.materialCode),
]);

// ============================================
// 库存盘点
// ============================================
export const stockCounts = mysqlTable('stock_counts', {
  id: int().autoincrement().notNull(),
  // 盘点单号
  countCode: varchar({ length: 30 }).notNull(),
  // 盘点类型
  countType: mysqlEnum(['full', 'cycle', 'spot', 'annual']).notNull(),
  // 盘点范围
  warehouseId: int().notNull(),
  zone: varchar({ length: 10 }),
  // 状态
  status: mysqlEnum(['planned', 'in_progress', 'counting', 'reconciling', 'approved', 'completed']).notNull().default('planned'),
  // 计划日期
  plannedDate: timestamp({ mode: 'string' }),
  startedAt: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  // 盘点人
  countedBy: int(),
  verifiedBy: int(),
  approvedBy: int(),
  // 结果汇总
  totalItems: int().default(0),
  matchedItems: int().default(0),
  discrepancyItems: int().default(0),
  // 差异金额
  totalDiscrepancyValue: decimal({ precision: 12, scale: 2 }).default('0.00'),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_count_code').on(table.countCode),
  index('idx_count_warehouse').on(table.warehouseId),
  index('idx_count_status').on(table.status),
  index('idx_count_type').on(table.countType),
]);
