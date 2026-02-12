/**
 * GRT 5.0 库存批次追踪数据库Schema
 *
 * 包含:
 * - 批次/批号管理
 * - 批次分配记录
 * - 序列号追踪
 * - 保质期管理
 *
 * 支持正向/反向追溯，与天思ERP批次数据同步
 */

import {
  mysqlTable, int, varchar, text, timestamp, decimal,
  mysqlEnum, index, unique, boolean, json,
} from 'drizzle-orm/mysql-core';

// ============================================
// 批次主表 - 每批入库物料一条记录
// ============================================
export const inventoryLots = mysqlTable('inventory_lots', {
  id: int().autoincrement().notNull(),
  // 批次号（系统生成或手动输入）
  lotNumber: varchar({ length: 50 }).notNull(),
  // 物料信息
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }),
  // 批次数量
  initialQty: decimal({ precision: 10, scale: 2 }).notNull(),
  currentQty: decimal({ precision: 10, scale: 2 }).notNull(),
  reservedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  unit: varchar({ length: 20 }).notNull().default('个'),
  // 来源信息
  sourceType: mysqlEnum(['purchase', 'production', 'transfer', 'return', 'initial']).notNull(),
  sourcePOCode: varchar({ length: 30 }),     // 采购单号
  sourceWorkOrder: varchar({ length: 30 }),  // 生产工单号
  // 供应商批次
  supplierLotNumber: varchar({ length: 50 }),
  supplierId: int(),
  supplierName: varchar({ length: 200 }),
  // 仓库/库位
  warehouseId: int(),
  locationId: int(),
  locationCode: varchar({ length: 30 }),
  // 日期管理
  productionDate: timestamp({ mode: 'string' }),   // 生产日期
  receivedDate: timestamp({ mode: 'string' }),      // 入库日期
  expiryDate: timestamp({ mode: 'string' }),        // 过期日期
  warrantyDate: timestamp({ mode: 'string' }),      // 保修到期日
  // 质检信息
  qcStatus: mysqlEnum(['pending', 'passed', 'failed', 'conditional']).default('pending'),
  qcReportId: int(),
  qcCertificateNumber: varchar({ length: 50 }),
  // 批次状态
  status: mysqlEnum(['available', 'reserved', 'quarantine', 'expired', 'consumed', 'scrapped']).notNull().default('available'),
  // 成本
  unitCost: decimal({ precision: 10, scale: 2 }),
  totalCost: decimal({ precision: 12, scale: 2 }),
  // 天思ERP关联
  erpLotId: varchar({ length: 50 }),
  erpSyncStatus: mysqlEnum(['not_synced', 'synced', 'sync_error']).default('not_synced'),
  // 追溯属性 (JSON: 材质证明、检测报告等)
  traceAttributes: json(),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_lot_number').on(table.lotNumber),
  index('idx_lot_material').on(table.materialCode),
  index('idx_lot_warehouse').on(table.warehouseId),
  index('idx_lot_status').on(table.status),
  index('idx_lot_qc').on(table.qcStatus),
  index('idx_lot_expiry').on(table.expiryDate),
  index('idx_lot_supplier').on(table.supplierId),
  index('idx_lot_source').on(table.sourceType, table.sourcePOCode),
  index('idx_lot_erp').on(table.erpLotId),
]);

// ============================================
// 批次分配记录 - 追踪物料去向
// ============================================
export const lotAllocations = mysqlTable('lot_allocations', {
  id: int().autoincrement().notNull(),
  lotId: int().notNull(),
  lotNumber: varchar({ length: 50 }).notNull(),
  // 分配目的
  allocationType: mysqlEnum(['production', 'project', 'sales_order', 'sample', 'rework', 'scrap']).notNull(),
  // 关联单据
  targetDocType: varchar({ length: 20 }),        // WorkOrder, SalesOrder, Project
  targetDocId: int(),
  targetDocCode: varchar({ length: 30 }),
  // 关联工序
  processInstanceId: int(),
  processCode: varchar({ length: 20 }),
  // 分配数量
  allocatedQty: decimal({ precision: 10, scale: 2 }).notNull(),
  usedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  returnedQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  scrapQty: decimal({ precision: 10, scale: 2 }).default('0.00'),
  // 状态
  status: mysqlEnum(['allocated', 'in_use', 'completed', 'returned', 'cancelled']).notNull().default('allocated'),
  // 操作人
  allocatedBy: int(),
  allocatedByName: varchar({ length: 50 }),
  allocatedAt: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  // 备注
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('idx_alloc_lot').on(table.lotId),
  index('idx_alloc_type').on(table.allocationType),
  index('idx_alloc_target').on(table.targetDocType, table.targetDocId),
  index('idx_alloc_process').on(table.processInstanceId),
  index('idx_alloc_status').on(table.status),
]);

// ============================================
// 序列号追踪表 - 逐个追踪高价值物料
// ============================================
export const serialNumbers = mysqlTable('serial_numbers', {
  id: int().autoincrement().notNull(),
  // 序列号
  serialNumber: varchar({ length: 100 }).notNull(),
  // 物料信息
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }),
  // 关联批次
  lotId: int(),
  lotNumber: varchar({ length: 50 }),
  // 当前位置
  warehouseId: int(),
  locationId: int(),
  // 当前状态
  status: mysqlEnum(['in_stock', 'allocated', 'in_production', 'installed', 'shipped', 'returned', 'scrapped']).notNull().default('in_stock'),
  // 当前持有者/项目
  currentProjectCode: varchar({ length: 50 }),
  currentProcessCode: varchar({ length: 20 }),
  currentHolderId: int(),
  // 来源
  purchaseOrderCode: varchar({ length: 30 }),
  supplierId: int(),
  // 日期
  receivedDate: timestamp({ mode: 'string' }),
  warrantyExpiry: timestamp({ mode: 'string' }),
  // 生命周期事件 (JSON: [{date, event, user, notes}])
  lifecycleEvents: json(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_serial_number').on(table.serialNumber),
  index('idx_sn_material').on(table.materialCode),
  index('idx_sn_lot').on(table.lotId),
  index('idx_sn_status').on(table.status),
  index('idx_sn_project').on(table.currentProjectCode),
  index('idx_sn_warehouse').on(table.warehouseId),
]);

// ============================================
// 保质期预警配置
// ============================================
export const expiryAlertRules = mysqlTable('expiry_alert_rules', {
  id: int().autoincrement().notNull(),
  // 规则名称
  ruleName: varchar({ length: 100 }).notNull(),
  // 适用物料范围
  materialCode: varchar({ length: 50 }),          // null=所有物料
  materialCategory: varchar({ length: 50 }),      // null=所有分类
  // 预警天数
  warningDays: int().notNull().default(30),       // 提前30天预警
  criticalDays: int().notNull().default(7),       // 提前7天紧急预警
  // 通知方式
  notifyRoles: json(),     // 通知角色列表
  notifyUsers: json(),     // 通知用户列表
  notifyChannel: mysqlEnum(['system', 'email', 'teams', 'dingtalk', 'all']).default('system'),
  // 自动动作
  autoQuarantine: boolean().default(false),  // 过期自动隔离
  // 状态
  isActive: boolean().default(true),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('idx_expiry_material').on(table.materialCode),
  index('idx_expiry_category').on(table.materialCategory),
]);
