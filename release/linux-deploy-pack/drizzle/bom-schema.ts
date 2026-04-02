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
  pgTable, serial, integer, varchar, text, timestamp, decimal,
  index, unique, boolean, json,
} from 'drizzle-orm/pg-core';

// ============================================
// BOM主表 - 每个产品/组件一条主记录
// ============================================
export const bomMasters = pgTable('bom_masters', {
  id: serial().primaryKey(),
  // 产品/组件编码（与materials表的materialCode关联）
  productCode: varchar({ length: 50 }).notNull(),
  productName: varchar({ length: 200 }).notNull(),
  // BOM类型
  bomType: varchar({ length: 50 }).notNull().default('manufacturing'),
  // 当前有效版本号
  currentVersion: varchar({ length: 20 }).notNull().default('1.0'),
  // BOM状态
  status: varchar({ length: 50 }).notNull().default('draft'),
  // 所属BU
  buCode: varchar({ length: 50 }),
  // 产品分类
  productCategory: varchar({ length: 50 }),
  // BOM层级数
  maxLevel: integer().default(1),
  // 标准产出数量
  standardQty: decimal({ precision: 10, scale: 2 }).default('1.00'),
  standardUnit: varchar({ length: 20 }).default('台'),
  // 成本汇总
  totalMaterialCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalLaborCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalOverheadCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  // 天思ERP关联
  erpBomId: varchar({ length: 50 }),
  erpSyncStatus: varchar({ length: 50 }).default('not_synced'),
  erpLastSyncAt: timestamp({ mode: 'string' }),
  // 审批
  createdBy: integer(),
  approvedBy: integer(),
  approvedAt: timestamp({ mode: 'string' }),
  // 备注
  description: text(),
  notes: text(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('bom_masters_uk_product_version').on(table.productCode, table.currentVersion),
  index('bom_masters_idx_status').on(table.status),
  index('bom_masters_idx_type').on(table.bomType),
  index('bom_masters_idx_bu').on(table.buCode),
  index('bom_masters_idx_erp').on(table.erpBomId),
]);

// ============================================
// BOM明细行 - 父子层级组件关系
// ============================================
export const bomItems = pgTable('bom_items', {
  id: serial().primaryKey(),
  // 所属BOM主表
  bomMasterId: integer().notNull(),
  // 父组件ID（顶层为null）
  parentItemId: integer(),
  // 层级深度 (1=直接子组件, 2=二级子组件, ...)
  level: integer().notNull().default(1),
  // 序号（同级排序）
  sequence: integer().notNull().default(10),
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
  sourceType: varchar({ length: 50 }).notNull().default('purchase'),
  // 关联工序 (T1-T15)
  processCode: varchar({ length: 20 }),
  // 提前期（天）
  leadTimeDays: integer().default(0),
  // 替代物料
  substituteCode: varchar({ length: 50 }),
  substituteRatio: decimal({ precision: 5, scale: 2 }),
  // 成本
  unitCost: decimal({ precision: 10, scale: 2 }).default('0.00'),
  extendedCost: decimal({ precision: 12, scale: 2 }).default('0.00'),
  // 供应商
  preferredSupplierId: integer(),
  // 天思ERP关联
  erpItemId: varchar({ length: 50 }),
  // 备注
  remarks: text(),
  // 有效期
  effectiveFrom: timestamp({ mode: 'string' }),
  effectiveTo: timestamp({ mode: 'string' }),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('bom_items_idx_bom').on(table.bomMasterId),
  index('bom_items_idx_parent').on(table.parentItemId),
  index('bom_items_idx_material').on(table.materialCode),
  index('bom_items_idx_level').on(table.level),
  index('bom_items_idx_process').on(table.processCode),
  index('bom_items_idx_source').on(table.sourceType),
]);

// ============================================
// BOM版本管理 - 工程变更(ECN)追踪
// ============================================
export const bomVersions = pgTable('bom_versions', {
  id: serial().primaryKey(),
  bomMasterId: integer().notNull(),
  // 版本号
  version: varchar({ length: 20 }).notNull(),
  // 变更类型
  changeType: varchar({ length: 50 }).notNull(),
  // ECN编号
  ecnNumber: varchar({ length: 50 }),
  // 变更原因
  changeReason: text(),
  // 变更描述
  changeDescription: text(),
  // 变更明细 (JSON: [{action, itemId, field, oldValue, newValue}])
  changeDetails: json(),
  // 版本状态
  status: varchar({ length: 50 }).notNull().default('draft'),
  // 有效期
  effectiveDate: timestamp({ mode: 'string' }),
  expiryDate: timestamp({ mode: 'string' }),
  // 审批流
  requestedBy: integer(),
  reviewedBy: integer(),
  approvedBy: integer(),
  approvedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),
  // BOM快照 (JSON: 完整BOM结构备份)
  bomSnapshot: json(),
  // 时间戳
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('bom_versions_uk_bom_version').on(table.bomMasterId, table.version),
  index('bom_versions_idx_status').on(table.status),
  index('bom_versions_idx_ecn').on(table.ecnNumber),
  index('bom_versions_idx_effective').on(table.effectiveDate),
]);

// ============================================
// BOM成本汇总表 - 分层成本卷积
// ============================================
export const bomCostRollups = pgTable('bom_cost_rollups', {
  id: serial().primaryKey(),
  bomMasterId: integer().notNull(),
  version: varchar({ length: 20 }).notNull(),
  // 成本类型
  costType: varchar({ length: 50 }).notNull().default('standard'),
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
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('bom_cost_rollups_idx_bom').on(table.bomMasterId),
  index('bom_cost_rollups_idx_type').on(table.costType),
]);
