/**
 * GRT 5.0 采购管理系统数据库Schema
 * 
 * 包含:
 * - 供应商管理
 * - 采购申请
 * - 采购订单
 * - 采购收货
 * - 采购发票
 */

import { mysqlTable, int, varchar, text, timestamp, decimal, mysqlEnum, index, unique } from 'drizzle-orm/mysql-core';

/**
 * 供应商表
 * 存储供应商基本信息
 */
export const suppliers = mysqlTable('suppliers', {
  id: int().autoincrement().notNull(),
  supplierCode: varchar({ length: 50 }).notNull(),
  supplierName: varchar({ length: 200 }).notNull(),
  supplierCategory: mysqlEnum(['material', 'equipment', 'service', 'other']).notNull(),
  
  // 联系信息
  contactPerson: varchar({ length: 100 }),
  contactPhone: varchar({ length: 20 }),
  contactEmail: varchar({ length: 100 }),
  
  // 地址信息
  country: varchar({ length: 50 }),
  province: varchar({ length: 50 }),
  city: varchar({ length: 50 }),
  address: text(),
  postalCode: varchar({ length: 20 }),
  
  // 资质信息
  registrationNumber: varchar({ length: 100 }),
  taxId: varchar({ length: 100 }),
  businessLicense: varchar({ length: 200 }),
  
  // 评级
  qualityRating: mysqlEnum(['A', 'B', 'C', 'D']).default('C'),
  deliveryRating: mysqlEnum(['A', 'B', 'C', 'D']).default('C'),
  serviceRating: mysqlEnum(['A', 'B', 'C', 'D']).default('C'),
  overallRating: decimal({ precision: 3, scale: 2 }).default('3.00'),
  
  // 支付条款
  paymentTerms: varchar({ length: 100 }),
  creditLimit: decimal({ precision: 12, scale: 2 }),
  
  // 状态
  status: mysqlEnum(['active', 'inactive', 'suspended', 'blacklisted']).default('active').notNull(),
  isPreferred: mysqlEnum(['yes', 'no']).default('no'),
  
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedBy: int(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_supplier_code').on(table.supplierCode),
  index('idx_supplier_category').on(table.supplierCategory),
  index('idx_status').on(table.status),
]);

/**
 * 采购申请表
 * 存储采购需求申请
 */
export const purchaseRequests = mysqlTable('purchase_requests', {
  id: int().autoincrement().notNull(),
  requestCode: varchar({ length: 50 }).notNull(),
  requestDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  
  // 申请信息
  department: varchar({ length: 100 }).notNull(),
  requestedBy: int().notNull(),
  requiredDate: timestamp({ mode: 'string' }).notNull(),
  
  // 采购物料
  materialId: int().notNull(),
  quantity: int().notNull(),
  estimatedUnitPrice: decimal({ precision: 12, scale: 2 }),
  estimatedTotalAmount: decimal({ precision: 12, scale: 2 }),
  
  // 备注
  purpose: text(),
  notes: text(),
  attachments: text(), // JSON array
  
  // 状态
  status: mysqlEnum(['draft', 'submitted', 'approved', 'rejected', 'cancelled']).default('draft').notNull(),
  approvedBy: int(),
  approvedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_request_code').on(table.requestCode),
  index('idx_status').on(table.status),
  index('idx_requested_by').on(table.requestedBy),
  index('idx_material_id').on(table.materialId),
]);

/**
 * 采购订单表
 * 存储向供应商下达的采购订单
 */
export const purchaseOrders = mysqlTable('purchase_orders', {
  id: int().autoincrement().notNull(),
  poNumber: varchar({ length: 50 }).notNull(),
  poDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  
  // 供应商信息
  supplierId: int().notNull(),
  supplierCode: varchar({ length: 50 }).notNull(),
  supplierName: varchar({ length: 200 }).notNull(),
  
  // 采购物料
  materialId: int().notNull(),
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }).notNull(),
  quantity: int().notNull(),
  unitPrice: decimal({ precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal({ precision: 12, scale: 2 }).notNull(),
  
  // 交付信息
  deliveryAddress: text(),
  expectedDeliveryDate: timestamp({ mode: 'string' }).notNull(),
  actualDeliveryDate: timestamp({ mode: 'string' }),
  
  // 支付信息
  paymentTerms: varchar({ length: 100 }),
  paymentStatus: mysqlEnum(['unpaid', 'partial', 'paid']).default('unpaid').notNull(),
  
  // 采购申请关联
  purchaseRequestId: int(),
  
  // 状态
  status: mysqlEnum(['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled']).default('draft').notNull(),
  
  // 备注
  notes: text(),
  
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedBy: int(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_po_number').on(table.poNumber),
  index('idx_supplier_id').on(table.supplierId),
  index('idx_material_id').on(table.materialId),
  index('idx_status').on(table.status),
  index('idx_po_date').on(table.poDate),
]);

/**
 * 采购收货表
 * 记录采购订单的收货情况
 */
export const purchaseReceipts = mysqlTable('purchase_receipts', {
  id: int().autoincrement().notNull(),
  receiptNumber: varchar({ length: 50 }).notNull(),
  receiptDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  
  // 关联订单
  purchaseOrderId: int().notNull(),
  poNumber: varchar({ length: 50 }).notNull(),
  
  // 收货信息
  receivedQuantity: int().notNull(),
  receivedBy: int().notNull(),
  warehouseId: int(),
  locationCode: varchar({ length: 50 }),
  
  // 质量检查
  qualityStatus: mysqlEnum(['passed', 'failed', 'partial']).default('passed').notNull(),
  defectiveQuantity: int().default(0),
  qualityNotes: text(),
  inspectedBy: int(),
  inspectedAt: timestamp({ mode: 'string' }),
  
  // 备注
  notes: text(),
  attachments: text(), // JSON array
  
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_receipt_number').on(table.receiptNumber),
  index('idx_purchase_order_id').on(table.purchaseOrderId),
  index('idx_received_by').on(table.receivedBy),
]);

/**
 * 采购发票表
 * 记录供应商发票信息
 */
export const purchaseInvoices = mysqlTable('purchase_invoices', {
  id: int().autoincrement().notNull(),
  invoiceNumber: varchar({ length: 50 }).notNull(),
  invoiceDate: timestamp({ mode: 'string' }).notNull(),
  
  // 关联订单
  purchaseOrderId: int().notNull(),
  poNumber: varchar({ length: 50 }).notNull(),
  
  // 供应商信息
  supplierId: int().notNull(),
  supplierName: varchar({ length: 200 }).notNull(),
  
  // 发票金额
  invoiceAmount: decimal({ precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalAmount: decimal({ precision: 12, scale: 2 }).notNull(),
  
  // 支付信息
  paymentStatus: mysqlEnum(['unpaid', 'partial', 'paid']).default('unpaid').notNull(),
  dueDate: timestamp({ mode: 'string' }),
  paidAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  paidDate: timestamp({ mode: 'string' }),
  
  // 备注
  notes: text(),
  attachments: text(), // JSON array
  
  createdBy: int().notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  unique('uk_invoice_number').on(table.invoiceNumber),
  index('idx_purchase_order_id').on(table.purchaseOrderId),
  index('idx_supplier_id').on(table.supplierId),
  index('idx_payment_status').on(table.paymentStatus),
]);

/**
 * 采购统计表
 * 存储采购相关的统计数据
 */
export const purchaseStatistics = mysqlTable('purchase_statistics', {
  id: int().autoincrement().notNull(),
  statisticDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  
  // 订单统计
  totalPOAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalPOCount: int().default(0),
  averagePOAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  
  // 供应商统计
  activeSupplierCount: int().default(0),
  preferredSupplierCount: int().default(0),
  
  // 交付统计
  onTimeDeliveryRate: decimal({ precision: 5, scale: 2 }).default('0.00'),
  qualityPassRate: decimal({ precision: 5, scale: 2 }).default('0.00'),
  
  // 支付统计
  unpaidAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  overdueAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index('idx_statistic_date').on(table.statisticDate),
]);
