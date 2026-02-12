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

import { mysqlTable, int, varchar, text, timestamp, decimal, mysqlEnum, index, unique } from 'drizzle-orm/mysql-core';

/**
 * 物料分类表
 * 存储物料的分类信息（大类、中类等）
 */
export const materialCategories = mysqlTable('material_categories', {
  id: int().autoincrement().notNull(),
  categoryCode: varchar({ length: 10 }).notNull(),
  categoryName: varchar({ length: 100 }).notNull(),
  parentCategoryCode: varchar({ length: 10 }),
  description: text(),
  level: int().notNull(), // 1=大类, 2=中类, 3=小类
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  sortOrder: int().default(0),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_category_code').on(table.categoryCode),
  index('idx_parent_code').on(table.parentCategoryCode),
  index('idx_level').on(table.level),
]);

/**
 * 物料规格表
 * 存储物料的规格信息（管径、功率、容量等）
 */
export const materialSpecifications = mysqlTable('material_specifications', {
  id: int().autoincrement().notNull(),
  specCode: varchar({ length: 20 }).notNull(),
  specName: varchar({ length: 100 }).notNull(),
  specType: mysqlEnum(['diameter', 'power', 'capacity', 'material', 'type', 'other']).notNull(),
  specValue: varchar({ length: 100 }).notNull(),
  unit: varchar({ length: 20 }),
  description: text(),
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_spec_code').on(table.specCode),
  index('idx_spec_type').on(table.specType),
]);

/**
 * 物料主数据表
 * 存储所有物料的基本信息
 */
export const materials = mysqlTable('materials', {
  id: int().autoincrement().notNull(),
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }).notNull(),
  categoryCode: varchar({ length: 10 }).notNull(),
  subcategoryCode: varchar({ length: 10 }),
  specificationCode: varchar({ length: 20 }),
  description: text(),
  
  // 物料属性
  materialType: mysqlEnum(['equipment', 'component', 'part', 'consumable', 'chemical', 'other']).notNull(),
  manufacturer: varchar({ length: 100 }),
  manufacturerCode: varchar({ length: 50 }),
  
  // 成本和价格
  standardCost: decimal({ precision: 12, scale: 2 }),
  lastPurchasePrice: decimal({ precision: 12, scale: 2 }),
  lastPurchaseDate: timestamp({ mode: 'string' }),
  
  // 库存信息
  minStockLevel: int().default(0),
  maxStockLevel: int().default(0),
  safetyStockLevel: int().default(0),
  
  // 状态
  status: mysqlEnum(['active', 'inactive', 'obsolete', 'discontinued']).default('active').notNull(),
  isApproved: mysqlEnum(['yes', 'no']).default('no').notNull(),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  
  // 版本管理
  version: int().default(1),
  effectiveDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  expiryDate: timestamp({ mode: 'string' }),
  
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedBy: int(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_material_code').on(table.materialCode),
  index('idx_category_code').on(table.categoryCode),
  index('idx_material_type').on(table.materialType),
  index('idx_status').on(table.status),
]);

/**
 * 供应商物料关系表
 * 存储供应商提供的物料信息
 */
export const supplierMaterials = mysqlTable('supplier_materials', {
  id: int().autoincrement().notNull(),
  supplierId: int().notNull(),
  materialId: int().notNull(),
  supplierMaterialCode: varchar({ length: 50 }).notNull(),
  supplierMaterialName: varchar({ length: 200 }),
  
  // 价格信息
  unitPrice: decimal({ precision: 12, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).default('CNY'),
  minimumOrderQuantity: int().default(1),
  leadTimeDays: int(),
  
  // 质量等级
  qualityGrade: mysqlEnum(['A', 'B', 'C', 'other']).default('A'),
  certifications: text(), // JSON array
  
  // 状态
  isPreferred: mysqlEnum(['yes', 'no']).default('no'),
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_supplier_material').on(table.supplierId, table.materialId),
  index('idx_supplier_id').on(table.supplierId),
  index('idx_material_id').on(table.materialId),
]);

/**
 * 库存表
 * 实时跟踪物料库存
 */
export const inventory = mysqlTable('inventory', {
  id: int().autoincrement().notNull(),
  materialId: int().notNull(),
  warehouseId: int(),
  locationCode: varchar({ length: 50 }), // 仓库位置编码
  
  // 库存数量
  quantityOnHand: int().default(0),
  quantityReserved: int().default(0),
  quantityAvailable: int().default(0),
  quantityInTransit: int().default(0),
  
  // 库存状态
  status: mysqlEnum(['good', 'damaged', 'expired', 'quarantine']).default('good').notNull(),
  lastCountDate: timestamp({ mode: 'string' }),
  
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_material_warehouse').on(table.materialId, table.warehouseId),
  index('idx_material_id').on(table.materialId),
  index('idx_warehouse_id').on(table.warehouseId),
]);

/**
 * 库存交易记录表
 * 记录所有库存变动
 */
export const inventoryTransactions = mysqlTable('inventory_transactions', {
  id: int().autoincrement().notNull(),
  materialId: int().notNull(),
  transactionType: mysqlEnum(['purchase', 'sale', 'transfer', 'adjustment', 'return', 'scrap']).notNull(),
  quantity: int().notNull(),
  warehouseFromId: int(),
  warehouseToId: int(),
  referenceDocumentType: varchar({ length: 50 }), // PO, SO, etc.
  referenceDocumentId: int(),
  
  notes: text(),
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_material_id').on(table.materialId),
  index('idx_transaction_type').on(table.transactionType),
  index('idx_created_at').on(table.createdAt),
]);

/**
 * 物料编码规则版本表
 * 管理物料编码规则的版本和有效期
 */
export const materialCodingRules = mysqlTable('material_coding_rules', {
  id: int().autoincrement().notNull(),
  version: varchar({ length: 20 }).notNull(),
  description: text(),
  ruleDefinition: text().notNull(), // JSON格式的编码规则定义
  
  // 有效期
  effectiveDate: timestamp({ mode: 'string' }).notNull(),
  expiryDate: timestamp({ mode: 'string' }),
  isActive: mysqlEnum(['yes', 'no']).default('yes').notNull(),
  
  // 变更记录
  changes: text(), // JSON array of changes
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_version').on(table.version),
  index('idx_effective_date').on(table.effectiveDate),
]);

/**
 * 物料变更历史表
 * 记录物料信息的所有变更
 */
export const materialChangeHistory = mysqlTable('material_change_history', {
  id: int().autoincrement().notNull(),
  materialId: int().notNull(),
  changeType: mysqlEnum(['create', 'update', 'approve', 'deactivate', 'version']).notNull(),
  fieldName: varchar({ length: 100 }),
  oldValue: text(),
  newValue: text(),
  
  reason: text(),
  changedBy: int().notNull(),
  changedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_material_id').on(table.materialId),
  index('idx_change_type').on(table.changeType),
  index('idx_changed_at').on(table.changedAt),
]);

/**
 * 物料导入记录表
 * 记录从天思ERP导入的物料数据
 */
export const materialImportRecords = mysqlTable('material_import_records', {
  id: int().autoincrement().notNull(),
  importBatchId: varchar({ length: 50 }).notNull(),
  sourceSystem: varchar({ length: 50 }).notNull(), // 'tiansi_erp' etc.
  
  // 导入统计
  totalRecords: int().notNull(),
  successRecords: int().default(0),
  failedRecords: int().default(0),
  
  // 导入详情
  importData: text(), // JSON格式的导入数据
  errorLog: text(), // JSON格式的错误日志
  
  // 状态
  status: mysqlEnum(['pending', 'processing', 'success', 'partial_success', 'failed']).default('pending').notNull(),
  
  importedBy: int().notNull(),
  importedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  completedAt: timestamp({ mode: 'string' }),
}, (table) => [
  index('idx_import_batch_id').on(table.importBatchId),
  index('idx_source_system').on(table.sourceSystem),
  index('idx_status').on(table.status),
]);
