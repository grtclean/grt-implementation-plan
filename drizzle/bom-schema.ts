/**
 * GRT 5.0 BOM (Bill of Materials) 管理数据库Schema
 *
 * 包含:
 * - BOM主表 (产品/组件定义)
 * - BOM明细行 (父子层级关系)
 * - BOM版本管理 (ECN工程变更)
 * - BOM成本汇总
 *
 * 支持多层级BOM结构: 成品 → 组件 → 子组件 → 零件 → 原材料
 * 与天思ERP双向同步
 */

import {
  mysqlTable, int, varchar, text, timestamp, decimal,
  mysqlEnum, index, unique, boolean, json,
} from 'drizzle-orm/mysql-core';

// ============================================
// BOM主表 - 每个产品/组件一条主记录
// ============================================
export const bomMasters = mysqlTable('bom_masters', {
  id: int().autoincrement().notNull(),
  // 产品/组件编码（与materials表的materialCode关联）
  productCode: varchar({ length: 50 }).notNull(),
  productName: varchar({ length: 200 }).notNull(),
  // BOM类型
  bomType: mysqlEnum(['manufacturing', 'engineering', 'sales', 'template']).notNull().default('manufacturing'),
  // 当前有效版本号
  currentVersion: varchar({ length: 20 }).notNull().default('1.0'),
  // BOM状态
  status: mysqlEnum(['draft', 'pending_review', 'approved', 'active', 'superseded', 'obsolete']).notNull().default('draft'),
  // 所属BU
  buCode: mysqlEnum(['BU1', 'BU2', 'BU3', 'BU4', 'BU5']),
  // 产品分类
  productCategory: varchar({ length: 50 }),
  // BOM层级数
  maxLevel: int().default(1),
  // 标准产出数量
  standardQty: decimal({ precision: 10, scale: 2 }).default('1.00'),
  standardUnit: varchar({ length: 20 }).default('台'),
  // 成本汇总
  totalMaterialCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalLaborCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalOverheadCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  // 天思ERP关联
  erpBomId: varchar({ length: 50 }),
  erpSyncStatus: mysqlEnum(['not_synced', 'synced', 'sync_error', 'pending']).default('not_synced'),
  erpLastSyncAt: timestamp({ mode: 'string' }),
  // 审批
  createdBy: int(),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  // 备注
  description: text(),
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_product_version').on(table.productCode, table.currentVersion),
  index('idx_bom_status').on(table.status),
  index('idx_bom_type').on(table.bomType),
  index('idx_bom_bu').on(table.buCode),
  index('idx_bom_erp').on(table.erpBomId),
]);

// ============================================
// BOM明细行 - 父子层级组件关系
// ============================================
export const bomItems = mysqlTable('bom_items', {
  id: int().autoincrement().notNull(),
  // 所属BOM主表
  bomMasterId: int().notNull(),
  // 父组件ID（顶层为null）
  parentItemId: int(),
  // 层级深度 (1=直接子组件, 2=二级子组件, ...)
  level: int().notNull().default(1),
  // 序号（同级排序）
  sequence: int().notNull().default(10),
  // 组件物料信息
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }).notNull(),
  materialSpec: varchar({ length: 200 }),
  // 用量
  quantity: decimal({ precision: 10, scale: 4 }).notNull(),
  unit: varchar({ length: 20 }).notNull().default('个'),
  // 损耗率 (百分比)
  scrapRate: decimal({ precision: 5, scale: 2 }).default('0.00'),
  // 净需求 = quantity * (1 + scrapRate/100)
  // 是否关键物料
  isCritical: boolean().default(false),
  // 是否外购件 vs 自制件
  sourceType: mysqlEnum(['purchase', 'manufacture', 'outsource', 'phantom']).notNull().default('purchase'),
  // 关联工序 (T1-T15)
  processCode: varchar({ length: 20 }),
  // 提前期（天）
  leadTimeDays: int().default(0),
  // 替代物料
  substituteCode: varchar({ length: 50 }),
  substituteRatio: decimal({ precision: 5, scale: 2 }),
  // 成本
  unitCost: decimal({ precision: 10, scale: 2 }).default('0.00'),
  extendedCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  // 供应商
  preferredSupplierId: int(),
  // 天思ERP关联
  erpItemId: varchar({ length: 50 }),
  // 备注
  remarks: text(),
  // 有效期
  effectiveFrom: timestamp({ mode: 'string' }),
  effectiveTo: timestamp({ mode: 'string' }),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('idx_item_bom').on(table.bomMasterId),
  index('idx_item_parent').on(table.parentItemId),
  index('idx_item_material').on(table.materialCode),
  index('idx_item_level').on(table.level),
  index('idx_item_process').on(table.processCode),
  index('idx_item_source').on(table.sourceType),
]);

// ============================================
// BOM版本管理 - 工程变更(ECN)追踪
// ============================================
export const bomVersions = mysqlTable('bom_versions', {
  id: int().autoincrement().notNull(),
  bomMasterId: int().notNull(),
  // 版本号
  version: varchar({ length: 20 }).notNull(),
  // 变更类型
  changeType: mysqlEnum(['new', 'revision', 'ecn', 'cost_update', 'obsolete']).notNull(),
  // ECN编号
  ecnNumber: varchar({ length: 50 }),
  // 变更原因
  changeReason: text(),
  // 变更描述
  changeDescription: text(),
  // 变更明细 (JSON: [{action, itemId, field, oldValue, newValue}])
  changeDetails: json(),
  // 版本状态
  status: mysqlEnum(['draft', 'pending_approval', 'approved', 'rejected', 'active', 'superseded']).notNull().default('draft'),
  // 有效期
  effectiveDate: timestamp({ mode: 'string' }),
  expiryDate: timestamp({ mode: 'string' }),
  // 审批流
  requestedBy: int(),
  reviewedBy: int(),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),
  // BOM快照 (JSON: 完整BOM结构备份)
  bomSnapshot: json(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_bom_version').on(table.bomMasterId, table.version),
  index('idx_version_status').on(table.status),
  index('idx_version_ecn').on(table.ecnNumber),
  index('idx_version_effective').on(table.effectiveDate),
]);

// ============================================
// BOM成本汇总表 - 分层成本卷积
// ============================================
export const bomCostRollups = mysqlTable('bom_cost_rollups', {
  id: int().autoincrement().notNull(),
  bomMasterId: int().notNull(),
  version: varchar({ length: 20 }).notNull(),
  // 成本类型
  costType: mysqlEnum(['standard', 'actual', 'estimated', 'budget']).notNull().default('standard'),
  // 计算时间
  calculatedAt: timestamp({ mode: 'string' }).notNull(),
  // 汇总金额
  materialCost: decimal({ precision: 12, scale: 2 }).notNull().default('0.00'),
  purchaseCost: decimal({ precision: 12, scale: 2 }).notNull().default('0.00'),
  laborCost: decimal({ precision: 12, scale: 2 }).notNull().default('0.00'),
  overheadCost: decimal({ precision: 12, scale: 2 }).notNull().default('0.00'),
  outsourceCost: decimal({ precision: 12, scale: 2 }).notNull().default('0.00'),
  totalCost: decimal({ precision: 12, scale: 2 }).notNull().default('0.00'),
  // 成本明细 (JSON: 按层级/物料的明细)
  costBreakdown: json(),
  // 币种
  currency: varchar({ length: 3 }).default('CNY'),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_rollup_bom').on(table.bomMasterId),
  index('idx_rollup_type').on(table.costType),
]);
