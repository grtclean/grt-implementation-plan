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
  pgTable, serial, integer, varchar, text, timestamp, decimal,
  index, unique, boolean, json,
} from 'drizzle-orm/pg-core';

// ============================================
// 仓库主表
// ============================================
export const warehouses = pgTable('warehouses', {
  id: serial().primaryKey(),
  warehouseCode: varchar({ length: 20 }).notNull(),
  warehouseName: varchar({ length: 100 }).notNull(),
  // 仓库类型
  warehouseType: varchar({ length: 50 }).notNull(),
  // 所属BU
  buCode: varchar({ length: 50 }),
  // 地址/位置
  address: varchar({ length: 300 }),
  building: varchar({ length: 50 }),
  floor: varchar({ length: 10 }),
  // 容量
  totalArea: decimal({ precision: 10, scale: 2 }), // 平方米
  totalCapacity: integer(), // 最大库位数
  // 负责人
  managerId: integer(),
  managerName: varchar({ length: 50 }),
  contactPhone: varchar({ length: 20 }),
  // 天思ERP关联
  erpWarehouseCode: varchar({ length: 50 }),
  erpSyncStatus: varchar({ length: 50 }).default('not_synced'),
  // 状态
  isActive: boolean().default(true),
  // 备注
  description: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('warehouses_uk_warehouse_code').on(table.warehouseCode),
  index('warehouses_idx_wh_type').on(table.warehouseType),
  index('warehouses_idx_wh_bu').on(table.buCode),
  index('warehouses_idx_wh_erp').on(table.erpWarehouseCode),
]);

// ============================================
// 库位表 - 仓-区-架-层-位 层级
// ============================================
export const warehouseLocations = pgTable('warehouse_locations', {
  id: serial().primaryKey(),
  warehouseId: integer().notNull(),
  // 库位编码 (格式: WH01-A-01-03-05 = 仓库-区-架-层-位)
  locationCode: varchar({ length: 30 }).notNull(),
  // 层级信息
  zone: varchar({ length: 10 }).notNull(),        // 区域 (A, B, C...)
  aisle: varchar({ length: 10 }),                  // 通道/货架号
  shelf: varchar({ length: 10 }),                  // 层
  bin: varchar({ length: 10 }),                    // 格位
  // 库位类型
  locationType: varchar({ length: 50 }).notNull().default('storage'),
  // 容量限制
  maxWeight: decimal({ precision: 10, scale: 2 }), // 最大承重(kg)
  maxVolume: decimal({ precision: 10, scale: 2 }), // 最大体积(m³)
  maxItems: integer(),                                 // 最大物料种类数
  // 当前状态
  isOccupied: boolean().default(false),
  currentMaterialCode: varchar({ length: 50 }),
  currentQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  // 温湿度要求
  tempRequirement: varchar({ length: 50 }).default('normal'),
  // 状态
  isActive: boolean().default(true),
  isLocked: boolean().default(false),   // 锁定（盘点/调拨中）
  lockReason: varchar({ length: 200 }),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('warehouse_locations_uk_location_code').on(table.locationCode),
  index('warehouse_locations_idx_warehouse').on(table.warehouseId),
  index('warehouse_locations_idx_zone').on(table.zone),
  index('warehouse_locations_idx_type').on(table.locationType),
  index('warehouse_locations_idx_material').on(table.currentMaterialCode),
]);

// ============================================
// 入库单
// ============================================
export const warehouseReceipts = pgTable('warehouse_receipts', {
  id: serial().primaryKey(),
  // 入库单号
  receiptCode: varchar({ length: 30 }).notNull(),
  // 入库类型
  receiptType: varchar({ length: 50 }).notNull(),
  // 关联单据
  sourceDocType: varchar({ length: 20 }),  // PO, WorkOrder, TransferOrder
  sourceDocId: integer(),
  sourceDocCode: varchar({ length: 30 }),
  // 仓库/库位
  warehouseId: integer().notNull(),
  locationId: integer(),
  // 状态
  status: varchar({ length: 50 }).notNull().default('draft'),
  // 操作人
  receivedBy: integer(),
  receivedByName: varchar({ length: 50 }),
  receivedAt: timestamp({ mode: 'string' }),
  // 质检
  qcResult: varchar({ length: 50 }),
  qcBy: integer(),
  qcAt: timestamp({ mode: 'string' }),
  qcNotes: text(),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('warehouse_receipts_uk_receipt_code').on(table.receiptCode),
  index('warehouse_receipts_idx_type').on(table.receiptType),
  index('warehouse_receipts_idx_status').on(table.status),
  index('warehouse_receipts_idx_source').on(table.sourceDocType, table.sourceDocId),
  index('warehouse_receipts_idx_warehouse').on(table.warehouseId),
]);

// ============================================
// 入库单明细行
// ============================================
export const warehouseReceiptItems = pgTable('warehouse_receipt_items', {
  id: serial().primaryKey(),
  receiptId: integer().notNull(),
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
  locationId: integer(),
  locationCode: varchar({ length: 30 }),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('warehouse_receipt_items_idx_receipt').on(table.receiptId),
  index('warehouse_receipt_items_idx_material').on(table.materialCode),
  index('warehouse_receipt_items_idx_lot').on(table.lotNumber),
]);

// ============================================
// 出库单（发料单）
// ============================================
export const warehouseIssues = pgTable('warehouse_issues', {
  id: serial().primaryKey(),
  // 出库单号
  issueCode: varchar({ length: 30 }).notNull(),
  // 出库类型
  issueType: varchar({ length: 50 }).notNull(),
  // 关联单据
  sourceDocType: varchar({ length: 20 }),
  sourceDocId: integer(),
  sourceDocCode: varchar({ length: 30 }),
  // 关联工序
  processCode: varchar({ length: 20 }),
  // 仓库
  warehouseId: integer().notNull(),
  // 申请部门/项目
  requestDept: varchar({ length: 50 }),
  projectCode: varchar({ length: 50 }),
  // 状态
  status: varchar({ length: 50 }).notNull().default('draft'),
  // 操作人
  issuedBy: integer(),
  issuedByName: varchar({ length: 50 }),
  issuedAt: timestamp({ mode: 'string' }),
  approvedBy: integer(),
  approvedAt: timestamp({ mode: 'string' }),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('warehouse_issues_uk_issue_code').on(table.issueCode),
  index('warehouse_issues_idx_type').on(table.issueType),
  index('warehouse_issues_idx_status').on(table.status),
  index('warehouse_issues_idx_warehouse').on(table.warehouseId),
  index('warehouse_issues_idx_project').on(table.projectCode),
]);

// ============================================
// 出库单明细行
// ============================================
export const warehouseIssueItems = pgTable('warehouse_issue_items', {
  id: serial().primaryKey(),
  issueId: integer().notNull(),
  // 物料
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }),
  // 数量
  requestedQty: decimal({ precision: 10, scale: 2 }).notNull(),
  issuedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  unit: varchar({ length: 20 }).notNull().default('个'),
  // 拣货库位
  locationId: integer(),
  locationCode: varchar({ length: 30 }),
  // 批次
  lotNumber: varchar({ length: 50 }),
  serialNumbers: json(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('warehouse_issue_items_idx_issue').on(table.issueId),
  index('warehouse_issue_items_idx_material').on(table.materialCode),
]);

// ============================================
// 库存盘点
// ============================================
export const stockCounts = pgTable('stock_counts', {
  id: serial().primaryKey(),
  // 盘点单号
  countCode: varchar({ length: 30 }).notNull(),
  // 盘点类型
  countType: varchar({ length: 50 }).notNull(),
  // 盘点范围
  warehouseId: integer().notNull(),
  zone: varchar({ length: 10 }),
  // 状态
  status: varchar({ length: 50 }).notNull().default('planned'),
  // 计划日期
  plannedDate: timestamp({ mode: 'string' }),
  startedAt: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  // 盘点人
  countedBy: integer(),
  verifiedBy: integer(),
  approvedBy: integer(),
  // 结果汇总
  totalItems: integer().default(0),
  matchedItems: integer().default(0),
  discrepancyItems: integer().default(0),
  // 差异金额
  totalDiscrepancyValue: decimal({ precision: 12, scale: 2 }).default('0.00'),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('stock_counts_uk_count_code').on(table.countCode),
  index('stock_counts_idx_warehouse').on(table.warehouseId),
  index('stock_counts_idx_status').on(table.status),
  index('stock_counts_idx_type').on(table.countType),
]);
