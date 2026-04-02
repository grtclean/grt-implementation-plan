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

import { pgTable, serial, integer, varchar, text, timestamp, decimal, index, unique } from 'drizzle-orm/pg-core';

/**
 * 供应商表
 * 存储供应商基本信息
 */
export const suppliers = pgTable('suppliers', {
  id: serial().primaryKey(),
  supplierCode: varchar({ length: 50 }).notNull(),
  supplierName: varchar({ length: 200 }).notNull(),
  supplierCategory: varchar({ length: 50 }).notNull(),

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
  qualityRating: varchar({ length: 50 }).default('C'),
  deliveryRating: varchar({ length: 50 }).default('C'),
  serviceRating: varchar({ length: 50 }).default('C'),
  overallRating: decimal({ precision: 3, scale: 2 }).default('3.00'),

  // 支付条款
  paymentTerms: varchar({ length: 100 }),
  creditLimit: decimal({ precision: 12, scale: 2 }),

  // 状态
  status: varchar({ length: 50 }).default('active').notNull(),
  isPreferred: varchar({ length: 50 }).default('no'),

  // 资格管理
  qualificationStatus: varchar({ length: 50 }).default('qualified'), // pending_qualification/qualified/conditional/suspended/blacklisted
  qualificationExpiry: varchar({ length: 20 }), // date string YYYY-MM-DD
  portalLoginEmail: varchar({ length: 100 }),

  // ERP同步
  erpSupplierCode: varchar({ length: 50 }),
  erpSyncStatus: varchar({ length: 50 }).default('not_synced'),

  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedBy: integer(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('suppliers_uk_supplier_code').on(table.supplierCode),
  index('suppliers_idx_supplier_category').on(table.supplierCategory),
  index('suppliers_idx_status').on(table.status),
]);

/**
 * 采购申请表
 * 存储采购需求申请
 */
export const purchaseRequests = pgTable('purchase_requests', {
  id: serial().primaryKey(),
  requestCode: varchar({ length: 50 }).notNull(),
  requestDate: timestamp({ mode: 'string' }).defaultNow().notNull(),

  // 申请信息
  department: varchar({ length: 100 }).notNull(),
  requestedBy: integer().notNull(),
  requiredDate: timestamp({ mode: 'string' }).notNull(),

  // 采购物料
  materialId: integer().notNull(),
  quantity: integer().notNull(),
  estimatedUnitPrice: decimal({ precision: 12, scale: 2 }),
  estimatedTotalAmount: decimal({ precision: 12, scale: 2 }),

  // 备注
  purpose: text(),
  notes: text(),
  attachments: text(), // JSON array

  // 项目关联
  projectId: integer(),
  projectCode: varchar({ length: 50 }),

  // 状态
  status: varchar({ length: 50 }).default('draft').notNull(),
  approvedBy: integer(),
  approvedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('purchase_requests_uk_request_code').on(table.requestCode),
  index('purchase_requests_idx_status').on(table.status),
  index('purchase_requests_idx_requested_by').on(table.requestedBy),
  index('purchase_requests_idx_material_id').on(table.materialId),
]);

/**
 * 采购订单表
 * 存储向供应商下达的采购订单
 */
export const purchaseOrders = pgTable('purchase_orders', {
  id: serial().primaryKey(),
  poNumber: varchar({ length: 50 }).notNull(),
  poDate: timestamp({ mode: 'string' }).defaultNow().notNull(),

  // 供应商信息
  supplierId: integer().notNull(),
  supplierCode: varchar({ length: 50 }).notNull(),
  supplierName: varchar({ length: 200 }).notNull(),

  // 采购物料
  materialId: integer().notNull(),
  materialCode: varchar({ length: 50 }).notNull(),
  materialName: varchar({ length: 200 }).notNull(),
  quantity: integer().notNull(),
  unitPrice: decimal({ precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal({ precision: 12, scale: 2 }).notNull(),

  // 交付信息
  deliveryAddress: text(),
  expectedDeliveryDate: timestamp({ mode: 'string' }).notNull(),
  actualDeliveryDate: timestamp({ mode: 'string' }),

  // 支付信息
  paymentTerms: varchar({ length: 100 }),
  paymentStatus: varchar({ length: 50 }).default('unpaid').notNull(),

  // 采购申请关联
  purchaseRequestId: integer(),

  // ERP同步
  erpPoNumber: varchar({ length: 50 }),

  // 状态
  status: varchar({ length: 50 }).default('draft').notNull(),

  // 备注
  notes: text(),

  // 项目关联
  projectId: integer(),
  projectCode: varchar({ length: 50 }),

  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedBy: integer(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('purchase_orders_uk_po_number').on(table.poNumber),
  index('purchase_orders_idx_supplier_id').on(table.supplierId),
  index('purchase_orders_idx_material_id').on(table.materialId),
  index('purchase_orders_idx_status').on(table.status),
  index('purchase_orders_idx_po_date').on(table.poDate),
]);

/**
 * 采购收货表
 * 记录采购订单的收货情况
 */
export const purchaseReceipts = pgTable('purchase_receipts', {
  id: serial().primaryKey(),
  receiptNumber: varchar({ length: 50 }).notNull(),
  receiptDate: timestamp({ mode: 'string' }).defaultNow().notNull(),

  // 关联订单
  purchaseOrderId: integer().notNull(),
  poNumber: varchar({ length: 50 }).notNull(),

  // 收货信息
  receivedQuantity: integer().notNull(),
  receivedBy: integer().notNull(),
  warehouseId: integer(),
  locationCode: varchar({ length: 50 }),

  // 质量检查
  qualityStatus: varchar({ length: 50 }).default('passed').notNull(),
  defectiveQuantity: integer().default(0),
  qualityNotes: text(),
  inspectedBy: integer(),
  inspectedAt: timestamp({ mode: 'string' }),

  // 备注
  notes: text(),
  attachments: text(), // JSON array

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('purchase_receipts_uk_receipt_number').on(table.receiptNumber),
  index('purchase_receipts_idx_purchase_order_id').on(table.purchaseOrderId),
  index('purchase_receipts_idx_received_by').on(table.receivedBy),
]);

/**
 * 采购发票表
 * 记录供应商发票信息
 */
export const purchaseInvoices = pgTable('purchase_invoices', {
  id: serial().primaryKey(),
  invoiceNumber: varchar({ length: 50 }).notNull(),
  invoiceDate: timestamp({ mode: 'string' }).notNull(),

  // 关联订单
  purchaseOrderId: integer().notNull(),
  poNumber: varchar({ length: 50 }).notNull(),

  // 供应商信息
  supplierId: integer().notNull(),
  supplierName: varchar({ length: 200 }).notNull(),

  // 发票金额
  invoiceAmount: decimal({ precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalAmount: decimal({ precision: 12, scale: 2 }).notNull(),

  // 支付信息
  paymentStatus: varchar({ length: 50 }).default('unpaid').notNull(),
  dueDate: timestamp({ mode: 'string' }),
  paidAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  paidDate: timestamp({ mode: 'string' }),

  // 备注
  notes: text(),
  attachments: text(), // JSON array

  createdBy: integer().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('purchase_invoices_uk_invoice_number').on(table.invoiceNumber),
  index('purchase_invoices_idx_purchase_order_id').on(table.purchaseOrderId),
  index('purchase_invoices_idx_supplier_id').on(table.supplierId),
  index('purchase_invoices_idx_payment_status').on(table.paymentStatus),
]);

/**
 * 采购统计表
 * 存储采购相关的统计数据
 */
export const purchaseStatistics = pgTable('purchase_statistics', {
  id: serial().primaryKey(),
  statisticDate: timestamp({ mode: 'string' }).defaultNow().notNull(),

  // 订单统计
  totalPOAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  totalPOCount: integer().default(0),
  averagePOAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),

  // 供应商统计
  activeSupplierCount: integer().default(0),
  preferredSupplierCount: integer().default(0),

  // 交付统计
  onTimeDeliveryRate: decimal({ precision: 5, scale: 2 }).default('0.00'),
  qualityPassRate: decimal({ precision: 5, scale: 2 }).default('0.00'),

  // 支付统计
  unpaidAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),
  overdueAmount: decimal({ precision: 12, scale: 2 }).default('0.00'),

  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('purchase_statistics_idx_statistic_date').on(table.statisticDate),
]);
