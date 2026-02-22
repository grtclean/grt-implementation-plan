/**
 * GRT 5.0 物料管理系统数据库Schema
 *
 * 包含:
 * - 物料主数据
 * - 物料分类
 * - 物料规格
 * - 库存管理
 * - 供应商物料关系
 */

import { pgTable, serial, integer, varchar, text, timestamp, decimal, index, unique } from 'drizzle-orm/pg-core';

/**
 * 物料分类表
 * 存储物料的分类信息（大类、中类等）
 */
export const materialCategories = pgTable('material_categories', {
  id: serial().primaryKey(),
  categoryCode: varchar({ length: 10 }).notNull(),
  categoryName: varchar({ length: 100 }).notNull(),
  parentCategoryCode: varchar({ length: 10 }),
  description: text(),
  level: integer().notNull(), // 1=大类, 2=中类, 3=小类
  isActive: varchar({ length: 50 }).default('yes').notNull(),
  sortOrder: integer().default(0),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('material_categories_uk_category_code').on(table.categoryCode),
  index('material_categories_idx_parent_code').on(table.parentCategoryCode),
  index('material_categories_idx_level').on(table.level),
]);

/**
 * 物料规格表
 * 存储物料的规格信息（管径、功率、容量等）
 */
export const materialSpecifications = pgTable('material_specifications', {
  id: serial().primaryKey(),
  specCode: varchar({ length: 20 }).notNull(),
  specName: varchar({ length: 100 }).notNull(),
  specType: varchar({ length: 50 }).notNull(),
  specValue: varchar({ length: 100 }).notNull(),
  unit: varchar({ length: 20 }),
  description: text(),
  isActive: varchar({ length: 50 }).default('yes').notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('material_specifications_uk_spec_code').on(table.specCode),
  index('material_specifications_idx_spec_type').on(table.specType),
]);

/**
 * 物料主数据表
 * 存储所有物料的基本信息
 */
export const materials = pgTable('materials', {
  id: serial().primaryKey(),
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }).notNull(),
  categoryCode: varchar({ length: 10 }).notNull(),
  subcategoryCode: varchar({ length: 10 }),
  specificationCode: varchar({ length: 20 }),
  description: text(),

  // 物料属性
  materialType: varchar({ length: 50 }).notNull(),
  manufacturer: varchar({ length: 100 }),
  manufacturerCode: varchar({ length: 50 }),

  // 成本和价格
  standardCost: decimal({ precision: 12, scale: 2 }),
  lastPurchasePrice: decimal({ precision: 12, scale: 2 }),
  lastPurchaseDate: timestamp({ mode: 'string' }),

  // 库存信息
  minStockLevel: integer().default(0),
  maxStockLevel: integer().default(0),
  safetyStockLevel: integer().default(0),

  // 采购分类 & 自动补货
  procurementClassification: varchar({ length: 50 }).default('direct'), // direct/indirect/packaging/general
  reorderPoint: integer().default(0),
  reorderPrOwnerId: integer(),
  reorderPrOwnerName: varchar({ length: 100 }),

  // 状态
  status: varchar({ length: 50 }).default('active').notNull(),
  isApproved: varchar({ length: 50 }).default('no').notNull(),
  approvedBy: integer(),
  approvedAt: timestamp({ mode: 'string' }),

  // 版本管理
  version: integer().default(1),
  effectiveDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
  expiryDate: timestamp({ mode: 'string' }),

  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedBy: integer(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('materials_uk_material_code').on(table.materialCode),
  index('materials_idx_category_code').on(table.categoryCode),
  index('materials_idx_material_type').on(table.materialType),
  index('materials_idx_status').on(table.status),
]);

/**
 * 供应商物料关系表
 * 存储供应商提供的物料信息
 */
export const supplierMaterials = pgTable('supplier_materials', {
  id: serial().primaryKey(),
  supplierId: integer().notNull(),
  materialId: integer().notNull(),
  supplierMaterialCode: varchar({ length: 50 }).notNull(),
  supplierMaterialName: varchar({ length: 200 }),

  // 价格信息
  unitPrice: decimal({ precision: 12, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).default('CNY'),
  minimumOrderQuantity: integer().default(1),
  leadTimeDays: integer(),

  // 质量等级
  qualityGrade: varchar({ length: 50 }).default('A'),
  certifications: text(), // JSON array

  // 状态
  isPreferred: varchar({ length: 50 }).default('no'),
  isActive: varchar({ length: 50 }).default('yes').notNull(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('supplier_materials_uk_supplier_material').on(table.supplierId, table.materialId),
  index('supplier_materials_idx_supplier_id').on(table.supplierId),
  index('supplier_materials_idx_material_id').on(table.materialId),
]);

/**
 * 库存表
 * 实时跟踪物料库存
 */
export const inventory = pgTable('inventory', {
  id: serial().primaryKey(),
  materialId: integer().notNull(),
  warehouseId: integer(),
  locationCode: varchar({ length: 50 }), // 仓库位置编码

  // 库存数量
  quantityOnHand: integer().default(0),
  quantityReserved: integer().default(0),
  quantityAvailable: integer().default(0),
  quantityInTransit: integer().default(0),

  // 库存状态
  status: varchar({ length: 50 }).default('good').notNull(),
  lastCountDate: timestamp({ mode: 'string' }),

  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('inventory_uk_material_warehouse').on(table.materialId, table.warehouseId),
  index('inventory_idx_material_id').on(table.materialId),
  index('inventory_idx_warehouse_id').on(table.warehouseId),
]);

/**
 * 库存交易记录表
 * 记录所有库存变动
 */
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: serial().primaryKey(),
  materialId: integer().notNull(),
  transactionType: varchar({ length: 50 }).notNull(),
  quantity: integer().notNull(),
  warehouseFromId: integer(),
  warehouseToId: integer(),
  referenceDocumentType: varchar({ length: 50 }), // PO, SO, etc.
  referenceDocumentId: integer(),

  notes: text(),
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('inventory_transactions_idx_material_id').on(table.materialId),
  index('inventory_transactions_idx_transaction_type').on(table.transactionType),
  index('inventory_transactions_idx_created_at').on(table.createdAt),
]);

/**
 * 物料编码规则版本表
 * 管理物料编码规则的版本和有效期
 */
export const materialCodingRules = pgTable('material_coding_rules', {
  id: serial().primaryKey(),
  version: varchar({ length: 20 }).notNull(),
  description: text(),
  ruleDefinition: text().notNull(), // JSON格式的编码规则定义

  // 有效期
  effectiveDate: timestamp({ mode: 'string' }).notNull(),
  expiryDate: timestamp({ mode: 'string' }),
  isActive: varchar({ length: 50 }).default('yes').notNull(),

  // 变更记录
  changes: text(), // JSON array of changes
  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('material_coding_rules_uk_version').on(table.version),
  index('material_coding_rules_idx_effective_date').on(table.effectiveDate),
]);

/**
 * 物料变更历史表
 * 记录物料信息的所有变更
 */
export const materialChangeHistory = pgTable('material_change_history', {
  id: serial().primaryKey(),
  materialId: integer().notNull(),
  changeType: varchar({ length: 50 }).notNull(),
  fieldName: varchar({ length: 100 }),
  oldValue: text(),
  newValue: text(),

  reason: text(),
  changedBy: integer().notNull(),
  changedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('material_change_history_idx_material_id').on(table.materialId),
  index('material_change_history_idx_change_type').on(table.changeType),
  index('material_change_history_idx_changed_at').on(table.changedAt),
]);

/**
 * 物料导入记录表
 * 记录从天思ERP导入的物料数据
 */
export const materialImportRecords = pgTable('material_import_records', {
  id: serial().primaryKey(),
  importBatchId: varchar({ length: 50 }).notNull(),
  sourceSystem: varchar({ length: 50 }).notNull(), // 'tiansi_erp' etc.

  // 导入统计
  totalRecords: integer().notNull(),
  successRecords: integer().default(0),
  failedRecords: integer().default(0),

  // 导入详情
  importData: text(), // JSON格式的导入数据
  errorLog: text(), // JSON格式的错误日志

  // 状态
  status: varchar({ length: 50 }).default('pending').notNull(),

  importedBy: integer().notNull(),
  importedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  completedAt: timestamp({ mode: 'string' }),
}, (table) => [
  index('material_import_records_idx_import_batch_id').on(table.importBatchId),
  index('material_import_records_idx_source_system').on(table.sourceSystem),
  index('material_import_records_idx_status').on(table.status),
]);
