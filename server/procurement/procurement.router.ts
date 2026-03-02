/**
 * GRT 5.0 采购管理路由
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, and, count, sql, sum } from "drizzle-orm";
import {
  suppliers,
  purchaseRequests,
  purchaseOrders,
  purchaseReceipts,
  purchaseInvoices,
} from "../../drizzle/procurement-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("procurement");
import { materials } from "../../drizzle/material-schema";

// 验证Schema
const PurchaseRequestSchema = z.object({
  materialId: z.number(),
  quantity: z.number().min(1),
  requiredDate: z.string(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

const PurchaseOrderSchema = z.object({
  supplierId: z.number(),
  materialId: z.number(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  expectedDeliveryDate: z.string(),
  purchaseRequestId: z.number().optional(),
  notes: z.string().optional(),
});

const SupplierSchema = z.object({
  supplierName: z.string().min(1),
  supplierCategory: z.enum(['material', 'equipment', 'service', 'other']),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const procurementRouter = router({
  /**
   * 创建采购申请
   */
  createPurchaseRequest: protectedProcedure
    .input(PurchaseRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const requestCode = `PR-${Date.now()}`;

      const result = await db.insert(purchaseRequests).values({
        requestCode,
        department: 'default',
        requestedBy: ctx.user?.id ?? 0,
        requiredDate: input.requiredDate,
        materialId: input.materialId,
        quantity: input.quantity,
        purpose: input.purpose ?? null,
        notes: input.notes ?? null,
        status: 'draft',
      });

      const insertId = result[0].insertId;
      const rows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, insertId));
      return rows[0];
    }),

  /**
   * 获取采购申请列表
   */
  getPurchaseRequests: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      department: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();

        const conditions = [];
        if (input.status) {
          conditions.push(eq(purchaseRequests.status, input.status as "draft" | "submitted" | "approved" | "rejected" | "cancelled"));
        }
        if (input.department) {
          conditions.push(eq(purchaseRequests.department, input.department));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const totalResult = await db
          .select({ value: count() })
          .from(purchaseRequests)
          .where(whereClause);
        const total = totalResult[0].value;

        const offset = (input.page - 1) * input.pageSize;
        const items = await db
          .select()
          .from(purchaseRequests)
          .where(whereClause)
          .orderBy(desc(purchaseRequests.id))
          .limit(input.pageSize)
          .offset(offset);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch (e) {
        log.error({ err: e }, "getPurchaseRequests DB error");
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }
    }),

  /**
   * 批准采购申请
   */
  approvePurchaseRequest: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.id));
      if (!existingRows[0]) throw new Error('Purchase request not found');

      await db.update(purchaseRequests).set({
        status: 'approved',
        approvedBy: ctx.user?.id,
        approvedAt: new Date().toISOString(),
      }).where(eq(purchaseRequests.id, input.id));

      const rows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.id));
      return {
        id: rows[0].id,
        status: rows[0].status,
        approvedBy: rows[0].approvedBy,
        approvedAt: rows[0].approvedAt,
      };
    }),

  /**
   * 拒绝采购申请
   */
  rejectPurchaseRequest: adminProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.id));
      if (!existingRows[0]) throw new Error('Purchase request not found');

      await db.update(purchaseRequests).set({
        status: 'rejected',
        rejectionReason: input.reason,
        approvedBy: ctx.user?.id,
        approvedAt: new Date().toISOString(),
      }).where(eq(purchaseRequests.id, input.id));

      const rows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.id));
      return {
        id: rows[0].id,
        status: rows[0].status,
        rejectionReason: rows[0].rejectionReason,
        approvedBy: rows[0].approvedBy,
        approvedAt: rows[0].approvedAt,
      };
    }),

  /**
   * 创建采购订单
   */
  createPurchaseOrder: adminProcedure
    .input(PurchaseOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const poNumber = `PO-${Date.now()}`;
      const totalAmount = input.quantity * input.unitPrice;

      // Look up supplier info
      const supplierRows = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId));
      if (!supplierRows[0]) throw new Error('Supplier not found');
      const supplier = supplierRows[0];

      // Look up material info
      const materialRows = await db.select().from(materials).where(eq(materials.id, input.materialId));
      if (!materialRows[0]) throw new Error('Material not found');
      const material = materialRows[0];

      const result = await db.insert(purchaseOrders).values({
        poNumber,
        supplierId: input.supplierId,
        supplierCode: supplier.supplierCode,
        supplierName: supplier.supplierName,
        materialId: input.materialId,
        materialCode: material.materialCode,
        materialName: material.materialName,
        quantity: input.quantity,
        unitPrice: String(input.unitPrice),
        totalAmount: String(totalAmount),
        expectedDeliveryDate: input.expectedDeliveryDate,
        purchaseRequestId: input.purchaseRequestId ?? null,
        notes: input.notes ?? null,
        status: 'draft',
        paymentStatus: 'unpaid',
        createdBy: ctx.user?.id ?? 0,
      });

      const insertId = result[0].insertId;
      const rows = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, insertId));
      return rows[0];
    }),

  /**
   * 获取采购订单列表
   */
  getPurchaseOrders: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      supplierId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();

        const conditions = [];
        if (input.status) {
          conditions.push(eq(purchaseOrders.status, input.status as "draft" | "sent" | "confirmed" | "partially_received" | "received" | "cancelled"));
        }
        if (input.supplierId) {
          conditions.push(eq(purchaseOrders.supplierId, input.supplierId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const totalResult = await db
          .select({ value: count() })
          .from(purchaseOrders)
          .where(whereClause);
        const total = totalResult[0].value;

        const offset = (input.page - 1) * input.pageSize;
        const items = await db
          .select()
          .from(purchaseOrders)
          .where(whereClause)
          .orderBy(desc(purchaseOrders.id))
          .limit(input.pageSize)
          .offset(offset);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch (e) {
        log.error({ err: e }, "getPurchaseOrders DB error");
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }
    }),

  /**
   * 发送采购订单给供应商
   */
  sendPurchaseOrder: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!existingRows[0]) throw new Error('Purchase order not found');

      await db.update(purchaseOrders).set({
        status: 'sent',
      }).where(eq(purchaseOrders.id, input.id));

      return {
        id: input.id,
        status: 'sent',
        sentAt: new Date(),
        message: '采购订单已发送给供应商',
      };
    }),

  /**
   * 记录采购收货
   */
  recordReceipt: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number(),
      receivedQuantity: z.number().min(1),
      qualityStatus: z.enum(['passed', 'failed', 'partial']),
      warehouseId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const receiptNumber = `REC-${Date.now()}`;

      // Look up the PO to get the poNumber
      const poRows = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId));
      if (!poRows[0]) throw new Error('Purchase order not found');
      const po = poRows[0];

      const result = await db.insert(purchaseReceipts).values({
        receiptNumber,
        purchaseOrderId: input.purchaseOrderId,
        poNumber: po.poNumber,
        receivedQuantity: input.receivedQuantity,
        receivedBy: ctx.user?.id ?? 0,
        warehouseId: input.warehouseId ?? null,
        qualityStatus: input.qualityStatus,
        notes: input.notes ?? null,
      });

      // Update PO status based on received quantity
      const allReceipts = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.purchaseOrderId, input.purchaseOrderId))
        .limit(1000);

      let totalReceived = 0;
      for (const receipt of allReceipts) {
        totalReceived += receipt.receivedQuantity;
      }

      const newStatus = totalReceived >= po.quantity ? 'received' : 'partially_received';
      await db.update(purchaseOrders).set({
        status: newStatus as "received" | "partially_received",
        actualDeliveryDate: totalReceived >= po.quantity ? new Date().toISOString() : null,
      }).where(eq(purchaseOrders.id, input.purchaseOrderId));

      const insertId = result[0].insertId;
      const rows = await db.select().from(purchaseReceipts).where(eq(purchaseReceipts.id, insertId));
      return rows[0];
    }),

  /**
   * 获取收货记录
   */
  getReceipts: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions = [];
      if (input.purchaseOrderId) {
        conditions.push(eq(purchaseReceipts.purchaseOrderId, input.purchaseOrderId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ value: count() })
        .from(purchaseReceipts)
        .where(whereClause);
      const total = totalResult[0].value;

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(purchaseReceipts)
        .where(whereClause)
        .orderBy(desc(purchaseReceipts.id))
        .limit(input.pageSize)
        .offset(offset);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * 创建供应商
   */
  createSupplier: adminProcedure
    .input(SupplierSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const supplierCode = `SUP-${Date.now()}`;

      const result = await db.insert(suppliers).values({
        supplierCode,
        supplierName: input.supplierName,
        supplierCategory: input.supplierCategory,
        contactPerson: input.contactPerson ?? null,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ?? null,
        address: input.address ?? null,
        paymentTerms: input.paymentTerms ?? null,
        status: 'active',
        qualityRating: 'C',
        deliveryRating: 'C',
        serviceRating: 'C',
        isPreferred: 'no',
        createdBy: ctx.user?.id ?? 0,
      });

      const insertId = result[0].insertId;
      const rows = await db.select().from(suppliers).where(eq(suppliers.id, insertId));
      return rows[0];
    }),

  /**
   * 获取供应商列表
   */
  getSuppliers: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      status: z.string().optional(),
      isPreferred: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();

        const conditions = [];
        if (input.category) {
          conditions.push(eq(suppliers.supplierCategory, input.category as "material" | "equipment" | "service" | "other"));
        }
        if (input.status) {
          conditions.push(eq(suppliers.status, input.status as "active" | "inactive" | "suspended" | "blacklisted"));
        }
        if (input.isPreferred !== undefined) {
          conditions.push(eq(suppliers.isPreferred, input.isPreferred ? 'yes' : 'no'));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const totalResult = await db
          .select({ value: count() })
          .from(suppliers)
          .where(whereClause);
        const total = totalResult[0].value;

        const offset = (input.page - 1) * input.pageSize;
        const items = await db
          .select()
          .from(suppliers)
          .where(whereClause)
          .orderBy(desc(suppliers.id))
          .limit(input.pageSize)
          .offset(offset);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch (e) {
        log.error({ err: e }, "getSuppliers DB error");
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }
    }),

  /**
   * 更新供应商评级
   */
  updateSupplierRating: adminProcedure
    .input(z.object({
      supplierId: z.number(),
      qualityRating: z.enum(['A', 'B', 'C', 'D']).optional(),
      deliveryRating: z.enum(['A', 'B', 'C', 'D']).optional(),
      serviceRating: z.enum(['A', 'B', 'C', 'D']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId));
      if (!existingRows[0]) throw new Error('Supplier not found');

      const updateValues: Record<string, unknown> = {};
      if (input.qualityRating !== undefined) updateValues.qualityRating = input.qualityRating;
      if (input.deliveryRating !== undefined) updateValues.deliveryRating = input.deliveryRating;
      if (input.serviceRating !== undefined) updateValues.serviceRating = input.serviceRating;

      await db.update(suppliers).set(updateValues).where(eq(suppliers.id, input.supplierId));

      const rows = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId));
      return rows[0];
    }),

  /**
   * 获取采购统计
   */
  getProcurementStats: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();

      // Total PO count and amount
      const poCountResult = await db.select({ value: count() }).from(purchaseOrders);
      const totalPOCount = poCountResult[0].value;

      const poAmountResult = await db.execute(
        sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders`
      );
      const poAmountRows = poAmountResult[0] as Array<{ total: string }>;
      const totalPOAmount = Number(poAmountRows[0]?.total ?? 0);

      const averagePOAmount = totalPOCount > 0 ? totalPOAmount / totalPOCount : 0;

      // Active supplier count
      const activeSupplierResult = await db.select({ value: count() }).from(suppliers).where(eq(suppliers.status, 'active'));
      const activeSupplierCount = activeSupplierResult[0].value;

      // On-time delivery rate
      const deliveredResult = await db.execute(
        sql`SELECT
              COUNT(*) as total_delivered,
              SUM(CASE WHEN actual_delivery_date <= expected_delivery_date THEN 1 ELSE 0 END) as on_time
            FROM purchase_orders
            WHERE status = 'received' AND actual_delivery_date IS NOT NULL`
      );
      const deliveredRows = deliveredResult[0] as Array<{ total_delivered: number; on_time: number }>;
      const totalDelivered = Number(deliveredRows[0]?.total_delivered ?? 0);
      const onTimeCount = Number(deliveredRows[0]?.on_time ?? 0);
      const onTimeDeliveryRate = totalDelivered > 0 ? Math.round((onTimeCount / totalDelivered) * 10000) / 100 : 0;

      // Quality pass rate
      const qualityResult = await db.execute(
        sql`SELECT
              COUNT(*) as total_receipts,
              SUM(CASE WHEN quality_status = 'passed' THEN 1 ELSE 0 END) as passed
            FROM purchase_receipts`
      );
      const qualityRows = qualityResult[0] as Array<{ total_receipts: number; passed: number }>;
      const totalReceipts = Number(qualityRows[0]?.total_receipts ?? 0);
      const passedCount = Number(qualityRows[0]?.passed ?? 0);
      const qualityPassRate = totalReceipts > 0 ? Math.round((passedCount / totalReceipts) * 10000) / 100 : 0;

      // Unpaid amount
      const unpaidResult = await db.execute(
        sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders WHERE payment_status = 'unpaid'`
      );
      const unpaidRows = unpaidResult[0] as Array<{ total: string }>;
      const unpaidAmount = Number(unpaidRows[0]?.total ?? 0);

      // Overdue amount (invoices past due date and not fully paid)
      const overdueResult = await db.execute(
        sql`SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
            FROM purchase_invoices
            WHERE payment_status != 'paid' AND due_date < NOW()`
      );
      const overdueRows = overdueResult[0] as Array<{ total: string }>;
      const overdueAmount = Number(overdueRows[0]?.total ?? 0);

      return {
        totalPOAmount,
        totalPOCount,
        averagePOAmount: Math.round(averagePOAmount * 100) / 100,
        activeSupplierCount,
        onTimeDeliveryRate,
        qualityPassRate,
        unpaidAmount,
        overdueAmount,
      };
    } catch (e) {
      log.error({ err: e }, "getProcurementStats DB error");
      return { totalPOAmount: 0, totalPOCount: 0, averagePOAmount: 0, activeSupplierCount: 0, onTimeDeliveryRate: 0, qualityPassRate: 0, unpaidAmount: 0, overdueAmount: 0 };
    }
  }),

  /**
   * 获取采购分析
   */
  getProcurementAnalysis: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      groupBy: z.enum(['supplier', 'material', 'category']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Whitelist: groupColumn is always from this validated switch/case,
      // never from raw user input — safe for sql.raw()
      const ALLOWED_GROUP_COLUMNS: Record<string, string> = {
        supplier_name: 'supplierName',
        material_name: 'materialName',
      };
      let groupColumn: string;
      let groupLabel: string;
      switch (input.groupBy) {
        case 'supplier':
          groupColumn = 'supplier_name';
          groupLabel = 'supplierName';
          break;
        case 'material':
          groupColumn = 'material_name';
          groupLabel = 'materialName';
          break;
        default:
          groupColumn = 'supplier_name';
          groupLabel = 'supplierName';
          break;
      }
      // Defense-in-depth: reject if column is not in whitelist
      if (!(groupColumn in ALLOWED_GROUP_COLUMNS)) {
        throw new Error(`Invalid group column: ${groupColumn}`);
      }

      const analysisResult = await db.execute(
        sql`SELECT
              ${sql.raw(groupColumn)} as group_key,
              COUNT(*) as order_count,
              COALESCE(SUM(total_amount), 0) as total_amount
            FROM purchase_orders
            WHERE po_date >= ${input.startDate} AND po_date <= ${input.endDate}
            GROUP BY ${sql.raw(groupColumn)}
            ORDER BY total_amount DESC`
      );

      const dataRows = analysisResult[0] as Array<{ group_key: string; order_count: number; total_amount: string }>;
      const data = dataRows.map(row => ({
        [groupLabel]: row.group_key,
        orderCount: Number(row.order_count),
        totalAmount: Number(row.total_amount),
      }));

      // Summary
      const summaryResult = await db.execute(
        sql`SELECT
              COUNT(*) as total_count,
              COALESCE(SUM(total_amount), 0) as total_amount
            FROM purchase_orders
            WHERE po_date >= ${input.startDate} AND po_date <= ${input.endDate}`
      );
      const summaryRows = summaryResult[0] as Array<{ total_count: number; total_amount: string }>;
      const totalCount = Number(summaryRows[0]?.total_count ?? 0);
      const totalAmount = Number(summaryRows[0]?.total_amount ?? 0);

      return {
        data,
        summary: {
          totalAmount,
          totalCount,
          averageAmount: totalCount > 0 ? Math.round((totalAmount / totalCount) * 100) / 100 : 0,
        },
      };
    }),

  /**
   * 生成采购报表
   */
  generateProcurementReport: protectedProcedure
    .input(z.object({
      reportType: z.enum(['summary', 'detail', 'supplier', 'material']),
      startDate: z.string(),
      endDate: z.string(),
      format: z.enum(['csv', 'excel', 'pdf']).default('excel'),
    }))
    .query(async ({ input }) => {
      return {
        downloadUrl: '/api/procurement/report',
        fileName: `procurement-report-${new Date().toISOString()}.xlsx`,
        format: input.format,
      };
    }),

  /**
   * 获取采购发票
   */
  getInvoices: protectedProcedure
    .input(z.object({
      paymentStatus: z.string().optional(),
      supplierId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions = [];
      if (input.paymentStatus) {
        conditions.push(eq(purchaseInvoices.paymentStatus, input.paymentStatus as "unpaid" | "partial" | "paid"));
      }
      if (input.supplierId) {
        conditions.push(eq(purchaseInvoices.supplierId, input.supplierId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ value: count() })
        .from(purchaseInvoices)
        .where(whereClause);
      const total = totalResult[0].value;

      const offset = (input.page - 1) * input.pageSize;
      const items = await db
        .select()
        .from(purchaseInvoices)
        .where(whereClause)
        .orderBy(desc(purchaseInvoices.id))
        .limit(input.pageSize)
        .offset(offset);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * 记录发票支付
   */
  recordInvoicePayment: adminProcedure
    .input(z.object({
      invoiceId: z.number(),
      paidAmount: z.number().min(0),
      paymentDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const existingRows = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, input.invoiceId));
      if (!existingRows[0]) throw new Error('Invoice not found');

      const invoice = existingRows[0];
      const previousPaid = parseFloat(String(invoice.paidAmount)) || 0;
      const newTotalPaid = previousPaid + input.paidAmount;
      const invoiceTotal = parseFloat(String(invoice.totalAmount)) || 0;
      const newPaymentStatus = newTotalPaid >= invoiceTotal ? 'paid' : 'partial';

      await db.update(purchaseInvoices).set({
        paidAmount: String(newTotalPaid),
        paidDate: input.paymentDate,
        paymentStatus: newPaymentStatus as "paid" | "partial",
      }).where(eq(purchaseInvoices.id, input.invoiceId));

      // Also update the related PO payment status
      await db.update(purchaseOrders).set({
        paymentStatus: newPaymentStatus as "paid" | "partial",
      }).where(eq(purchaseOrders.id, invoice.purchaseOrderId));

      const rows = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, input.invoiceId));
      return {
        invoiceId: rows[0].id,
        paidAmount: rows[0].paidAmount,
        paymentDate: rows[0].paidDate,
        paymentStatus: rows[0].paymentStatus,
        updatedAt: rows[0].updatedAt,
      };
    }),
});
