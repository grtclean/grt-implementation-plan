/**
 * P2P (Procure-to-Pay) Lifecycle Router
 *
 * 9 sub-routers, ~56 procedures covering:
 *   framework agreements, RFQ/bidding, delivery registration,
 *   supplier reports, payment workflows (8-step),
 *   small-value procurement, supplier qualifications,
 *   quality loss agreements, quality loss incidents
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  frameworkAgreements,
  rfqEvents,
  rfqSupplierQuotes,
  deliveryRegistrations,
  paymentWorkflows,
  smallValueProcurements,
  supplierReportSubmissions,
  supplierQualifications,
  qualityLossAgreements,
  qualityLossIncidents,
} from "../../drizzle/p2p-lifecycle-schema";
import { purchaseOrders, purchaseInvoices, suppliers } from "../../drizzle/procurement-schema";
import { eq, desc, and, sql, count, gte, lte, sum } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

function generateCode(prefix: string) {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `${prefix}-${dateStr}-${rand}`;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ═══════════════════════════════════════════════════════════════
// 1. Framework Agreements (年度框架协议)
// ═══════════════════════════════════════════════════════════════
const frameworkAgreementRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(frameworkAgreements).orderBy(desc(frameworkAgreements.createdAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.status) items = items.filter(i => i.status === input.status);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(frameworkAgreements).where(eq(frameworkAgreements.id, toNum(input.id)));
    if (!item) throw new Error("框架协议不存在");
    return item;
  }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      supplierName: z.string().optional(),
      title: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
      pricingItems: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional(),
      totalBudget: z.string().optional(),
      paymentTerms: z.string().optional(),
      currency: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.insert(frameworkAgreements).values({
        agreementCode: generateCode("FA"),
        ...input,
      }).returning();
      return item;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      title: z.string().optional(),
      pricingItems: z.array(z.record(z.string(), z.unknown())).optional(),
      totalBudget: z.string().optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [item] = await db.update(frameworkAgreements)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(frameworkAgreements.id, toNum(id)))
        .returning();
      return item;
    }),

  activate: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(frameworkAgreements)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(frameworkAgreements.id, toNum(input.id)))
      .returning();
    return item;
  }),

  expire: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(frameworkAgreements)
      .set({ status: "expired", updatedAt: new Date().toISOString() })
      .where(eq(frameworkAgreements.id, toNum(input.id)))
      .returning();
    return item;
  }),
});

// ═══════════════════════════════════════════════════════════════
// 2. RFQ (询价竞标)
// ═══════════════════════════════════════════════════════════════
const rfqRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      materialCode: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(rfqEvents).orderBy(desc(rfqEvents.createdAt));
      if (input?.status) items = items.filter(i => i.status === input.status);
      if (input?.materialCode) items = items.filter(i => i.materialCode === input.materialCode);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(rfqEvents).where(eq(rfqEvents.id, toNum(input.id)));
    if (!item) throw new Error("询价事件不存在");
    return item;
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      materialCode: z.string().optional(),
      materialName: z.string().optional(),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      biddingType: z.enum(["sealed", "open", "reverse", "negotiated"]).optional(),
      deadline: z.string().optional(),
      evaluationCriteria: z.array(z.record(z.string(), z.unknown())).optional(),
      invitedSupplierIds: z.array(z.number()).optional(),
      frameworkAgreementId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.insert(rfqEvents).values({
        rfqCode: generateCode("RFQ"),
        ...input,
      }).returning();
      return item;
    }),

  publish: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(rfqEvents)
      .set({ status: "published", updatedAt: new Date().toISOString() })
      .where(eq(rfqEvents.id, toNum(input.id)))
      .returning();
    return item;
  }),

  close: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(rfqEvents)
      .set({ status: "closed", updatedAt: new Date().toISOString() })
      .where(eq(rfqEvents.id, toNum(input.id)))
      .returning();
    return item;
  }),

  getQuotes: protectedProcedure
    .input(z.object({ rfqEventId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const quotes = await db.select().from(rfqSupplierQuotes)
        .where(eq(rfqSupplierQuotes.rfqEventId, toNum(input.rfqEventId)))
        .orderBy(rfqSupplierQuotes.rank);
      return quotes;
    }),

  submitQuote: protectedProcedure
    .input(z.object({
      rfqEventId: z.number(),
      supplierId: z.number(),
      supplierName: z.string().optional(),
      unitPrice: z.string().optional(),
      totalPrice: z.string().optional(),
      deliveryDays: z.number().optional(),
      warrantyMonths: z.number().optional(),
      paymentTerms: z.string().optional(),
      technicalNotes: z.string().optional(),
      attachmentUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [quote] = await db.insert(rfqSupplierQuotes).values(input).returning();
      return quote;
    }),

  evaluateQuotes: protectedProcedure
    .input(z.object({
      rfqEventId: z.number(),
      scores: z.array(z.object({
        quoteId: z.number(),
        priceScore: z.string(),
        qualityScore: z.string(),
        deliveryScore: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const results = [];
      for (const s of input.scores) {
        const total = (Number(s.priceScore) + Number(s.qualityScore) + Number(s.deliveryScore)) / 3;
        const [updated] = await db.update(rfqSupplierQuotes)
          .set({
            priceScore: s.priceScore,
            qualityScore: s.qualityScore,
            deliveryScore: s.deliveryScore,
            totalScore: total.toFixed(2),
            status: "under_review",
            evaluatedAt: now,
          })
          .where(eq(rfqSupplierQuotes.id, s.quoteId))
          .returning();
        results.push(updated);
      }
      // Assign ranks
      results.sort((a, b) => Number(b.totalScore) - Number(a.totalScore));
      for (let i = 0; i < results.length; i++) {
        await db.update(rfqSupplierQuotes)
          .set({ rank: i + 1 })
          .where(eq(rfqSupplierQuotes.id, results[i].id));
      }
      // Update RFQ status
      await db.update(rfqEvents)
        .set({ status: "evaluating", updatedAt: now })
        .where(eq(rfqEvents.id, input.rfqEventId));
      return { ranked: results.length };
    }),

  awardQuote: protectedProcedure
    .input(z.object({
      rfqEventId: z.number(),
      quoteId: z.number(),
      createPo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      // Award the selected quote
      await db.update(rfqSupplierQuotes)
        .set({ status: "awarded" })
        .where(eq(rfqSupplierQuotes.id, input.quoteId));
      // Reject others
      const allQuotes = await db.select().from(rfqSupplierQuotes)
        .where(eq(rfqSupplierQuotes.rfqEventId, input.rfqEventId));
      for (const q of allQuotes) {
        if (q.id !== input.quoteId) {
          await db.update(rfqSupplierQuotes)
            .set({ status: "rejected" })
            .where(eq(rfqSupplierQuotes.id, q.id));
        }
      }
      // Update RFQ
      await db.update(rfqEvents)
        .set({ status: "awarded", selectedQuoteId: input.quoteId, updatedAt: now })
        .where(eq(rfqEvents.id, input.rfqEventId));
      // Optionally create PO
      let poId: number | undefined;
      if (input.createPo) {
        const [rfq] = await db.select().from(rfqEvents).where(eq(rfqEvents.id, input.rfqEventId));
        const [quote] = await db.select().from(rfqSupplierQuotes).where(eq(rfqSupplierQuotes.id, input.quoteId));
        if (rfq && quote) {
          const [po] = await db.insert(purchaseOrders).values({
            poNumber: generateCode("PO"),
            supplierId: quote.supplierId,
            supplierCode: `SUP-${quote.supplierId}`,
            supplierName: quote.supplierName || `Supplier #${quote.supplierId}`,
            materialId: 0,
            materialCode: rfq.materialCode || "",
            materialName: rfq.materialName || "",
            quantity: Number(rfq.quantity) || 1,
            unitPrice: quote.unitPrice || "0",
            totalAmount: quote.totalPrice || "0",
            expectedDeliveryDate: now,
            createdBy: 1,
          }).returning();
          poId = po?.id;
          if (poId) {
            await db.update(rfqEvents)
              .set({ generatedPoId: poId })
              .where(eq(rfqEvents.id, input.rfqEventId));
          }
        }
      }
      return { awarded: true, poId };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 3. Delivery Registrations (到货登记)
// ═══════════════════════════════════════════════════════════════
const deliveryRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      status: z.string().optional(),
      poNumber: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(deliveryRegistrations).orderBy(desc(deliveryRegistrations.createdAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.status) items = items.filter(i => i.status === input.status);
      if (input?.poNumber) items = items.filter(i => i.poNumber === input.poNumber);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(deliveryRegistrations).where(eq(deliveryRegistrations.id, toNum(input.id)));
    if (!item) throw new Error("到货登记不存在");
    return item;
  }),

  register: protectedProcedure
    .input(z.object({
      purchaseOrderId: z.number().optional(),
      poNumber: z.string().optional(),
      supplierId: z.number().optional(),
      supplierName: z.string().optional(),
      materialCode: z.string().optional(),
      materialName: z.string().optional(),
      deliveredQuantity: z.string().optional(),
      unit: z.string().optional(),
      trackingNumber: z.string().optional(),
      packingList: z.array(z.record(z.string(), z.unknown())).optional(),
      testReportUrls: z.array(z.string()).optional(),
      receivedByName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.insert(deliveryRegistrations).values({
        registrationCode: generateCode("DLV"),
        ...input,
        receivedAt: new Date().toISOString(),
        status: "received",
      }).returning();
      return item;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      status: z.enum(["pending", "received", "qc_pending", "qc_passed", "qc_failed", "warehouse_confirmed", "rejected"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.update(deliveryRegistrations)
        .set({ status: input.status, updatedAt: new Date().toISOString() })
        .where(eq(deliveryRegistrations.id, toNum(input.id)))
        .returning();
      return item;
    }),

  linkQcInspection: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      qcInspectionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.update(deliveryRegistrations)
        .set({
          qcInspectionId: input.qcInspectionId,
          status: "qc_pending",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(deliveryRegistrations.id, toNum(input.id)))
        .returning();
      return item;
    }),

  confirmReceipt: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      warehouseReceiptId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.update(deliveryRegistrations)
        .set({
          warehouseReceiptId: input.warehouseReceiptId,
          status: "warehouse_confirmed",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(deliveryRegistrations.id, toNum(input.id)))
        .returning();
      return item;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 4. Supplier Report Submissions
// ═══════════════════════════════════════════════════════════════
const supplierReportRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      documentType: z.string().optional(),
      verificationStatus: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(supplierReportSubmissions).orderBy(desc(supplierReportSubmissions.submittedAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.documentType) items = items.filter(i => i.documentType === input.documentType);
      if (input?.verificationStatus) items = items.filter(i => i.verificationStatus === input.verificationStatus);
      return { items, total: items.length };
    }),

  submit: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      supplierName: z.string().optional(),
      documentType: z.string(),
      documentTitle: z.string().optional(),
      fileUrl: z.string().optional(),
      fileSize: z.number().optional(),
      relatedPoNumber: z.string().optional(),
      relatedMaterialCode: z.string().optional(),
      expiryDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.insert(supplierReportSubmissions).values(input).returning();
      return item;
    }),

  verify: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      verificationStatus: z.enum(["verified", "rejected"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.update(supplierReportSubmissions)
        .set({
          verificationStatus: input.verificationStatus,
          rejectionReason: input.rejectionReason,
          verifiedAt: new Date().toISOString(),
        })
        .where(eq(supplierReportSubmissions.id, toNum(input.id)))
        .returning();
      return item;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 5. Payment Workflows (8-step payment approval)
// ═══════════════════════════════════════════════════════════════
const paymentRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      status: z.string().optional(),
      currentStep: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(paymentWorkflows).orderBy(desc(paymentWorkflows.createdAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.status) items = items.filter(i => i.status === input.status);
      if (input?.currentStep) items = items.filter(i => i.currentStep === input.currentStep);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(paymentWorkflows).where(eq(paymentWorkflows.id, toNum(input.id)));
    if (!item) throw new Error("付款工作流不存在");
    return item;
  }),

  initiate: protectedProcedure
    .input(z.object({
      invoiceId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      supplierId: z.number().optional(),
      supplierName: z.string().optional(),
      paymentAmount: z.string(),
      currency: z.string().optional(),
      paymentDueDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.insert(paymentWorkflows).values({
        workflowCode: generateCode("PAY"),
        ...input,
        supplierConfirmToken: generateUUID(),
        status: "in_progress",
      }).returning();
      return item;
    }),

  checkPaymentTerm: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [wf] = await db.select().from(paymentWorkflows).where(eq(paymentWorkflows.id, toNum(input.id)));
    if (!wf) throw new Error("工作流不存在");
    const isExpired = wf.paymentDueDate ? new Date(wf.paymentDueDate) <= new Date() : false;
    const [item] = await db.update(paymentWorkflows)
      .set({
        paymentTermExpired: isExpired,
        currentStep: "quality_feedback_ok",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentWorkflows.id, toNum(input.id)))
      .returning();
    return item;
  }),

  confirmQualityOk: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(paymentWorkflows)
      .set({
        qualityFeedbackOk: true,
        qualityFeedbackAt: new Date().toISOString(),
        currentStep: "bu_dept_approval",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(paymentWorkflows.id, toNum(input.id)))
      .returning();
    return item;
  }),

  submitBuApproval: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      approvedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const [item] = await db.update(paymentWorkflows)
        .set({
          buApprovedBy: input.approvedBy,
          buApprovedAt: now,
          currentStep: "quality_prod_approval",
          updatedAt: now,
        })
        .where(eq(paymentWorkflows.id, toNum(input.id)))
        .returning();
      return item;
    }),

  submitQualityApproval: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      approvedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const [item] = await db.update(paymentWorkflows)
        .set({
          qualityApprovedBy: input.approvedBy,
          qualityApprovedAt: now,
          currentStep: "payment_approved",
          updatedAt: now,
        })
        .where(eq(paymentWorkflows.id, toNum(input.id)))
        .returning();
      return item;
    }),

  approvePayment: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      approvedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const [item] = await db.update(paymentWorkflows)
        .set({
          paymentApprovedBy: input.approvedBy,
          paymentApprovedAt: now,
          currentStep: "procurement_confirmed",
          updatedAt: now,
        })
        .where(eq(paymentWorkflows.id, toNum(input.id)))
        .returning();
      return item;
    }),

  procurementConfirm: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      confirmedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      // Calculate net payment (deduct quality losses)
      const [wf] = await db.select().from(paymentWorkflows).where(eq(paymentWorkflows.id, toNum(input.id)));
      const net = Number(wf?.paymentAmount || 0) - Number(wf?.qualityDeductionAmount || 0);
      const [item] = await db.update(paymentWorkflows)
        .set({
          procurementConfirmedBy: input.confirmedBy,
          procurementConfirmedAt: now,
          netPaymentAmount: net.toFixed(2),
          currentStep: "supplier_confirmed",
          updatedAt: now,
        })
        .where(eq(paymentWorkflows.id, toNum(input.id)))
        .returning();
      return item;
    }),

  supplierConfirm: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const all = await db.select().from(paymentWorkflows);
      const wf = all.find(w => w.supplierConfirmToken === input.token);
      if (!wf) throw new Error("无效的确认令牌");
      if (wf.supplierConfirmedAt) throw new Error("已确认，无需重复操作");
      const [item] = await db.update(paymentWorkflows)
        .set({
          supplierConfirmedAt: now,
          currentStep: "contract_archived",
          updatedAt: now,
        })
        .where(eq(paymentWorkflows.id, wf.id))
        .returning();
      return item;
    }),

  archiveContract: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const now = new Date().toISOString();
    const [item] = await db.update(paymentWorkflows)
      .set({
        contractArchived: true,
        contractArchivedAt: now,
        status: "completed",
        updatedAt: now,
      })
      .where(eq(paymentWorkflows.id, toNum(input.id)))
      .returning();
    return item;
  }),
});

// ═══════════════════════════════════════════════════════════════
// 6. Small Value Procurements (小额采购 <50元/件)
// ═══════════════════════════════════════════════════════════════
const smallValueRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(smallValueProcurements).orderBy(desc(smallValueProcurements.createdAt));
      if (input?.status) items = items.filter(i => i.status === input.status);
      return { items, total: items.length };
    }),

  create: protectedProcedure
    .input(z.object({
      materialName: z.string(),
      materialCode: z.string().optional(),
      specification: z.string().optional(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      estimatedUnitPrice: z.string(),
      purpose: z.string().optional(),
      requestedByName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (Number(input.estimatedUnitPrice) >= 50) {
        throw new Error("小额采购单价必须 < 50 元/件");
      }
      const db = await requireDb();
      const totalAmount = (Number(input.estimatedUnitPrice) * (input.quantity || 1)).toFixed(2);
      const [item] = await db.insert(smallValueProcurements).values({
        requestCode: generateCode("SVP"),
        ...input,
        estimatedTotalAmount: totalAmount,
        status: "pending_supervisor",
      }).returning();
      return item;
    }),

  supervisorApprove: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      approved: z.boolean(),
      supervisorName: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      if (input.approved) {
        const [item] = await db.update(smallValueProcurements)
          .set({
            supervisorName: input.supervisorName,
            supervisorApprovedAt: now,
            status: "supervisor_approved",
            updatedAt: now,
          })
          .where(eq(smallValueProcurements.id, toNum(input.id)))
          .returning();
        return item;
      } else {
        const [item] = await db.update(smallValueProcurements)
          .set({
            supervisorRejectionReason: input.rejectionReason,
            status: "rejected",
            updatedAt: now,
          })
          .where(eq(smallValueProcurements.id, toNum(input.id)))
          .returning();
        return item;
      }
    }),

  procurementConfirm: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      procurementOfficerName: z.string().optional(),
      assignedSupplierId: z.number().optional(),
      assignedSupplierName: z.string().optional(),
      annualContractId: z.number().optional(),
      actualUnitPrice: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const { id, ...data } = input;
      const [item] = await db.update(smallValueProcurements)
        .set({
          ...data,
          procurementConfirmedAt: now,
          status: "completed",
          updatedAt: now,
        })
        .where(eq(smallValueProcurements.id, toNum(id)))
        .returning();
      return item;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 7. Supplier Qualifications (供应商资格审查)
// ═══════════════════════════════════════════════════════════════
const qualificationRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      qualificationType: z.string().optional(),
      overallResult: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(supplierQualifications).orderBy(desc(supplierQualifications.createdAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.qualificationType) items = items.filter(i => i.qualificationType === input.qualificationType);
      if (input?.overallResult) items = items.filter(i => i.overallResult === input.overallResult);
      if (input?.status) items = items.filter(i => i.status === input.status);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(supplierQualifications).where(eq(supplierQualifications.id, toNum(input.id)));
    if (!item) throw new Error("资格记录不存在");
    return item;
  }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      supplierName: z.string().optional(),
      qualificationType: z.enum(["initial", "annual", "special"]).optional(),
      auditDate: z.string().optional(),
      auditorName: z.string().optional(),
      isoSystemCertifications: z.array(z.string()).optional(),
      specialRequirements: z.array(z.string()).optional(),
      qualitySystemScore: z.string().optional(),
      processCapabilityScore: z.string().optional(),
      deliveryCapabilityScore: z.string().optional(),
      overallResult: z.enum(["qualified", "conditional", "failed"]).optional(),
      validUntil: z.string().optional(),
      nextAuditDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Calculate overall score
      const scores = [input.qualitySystemScore, input.processCapabilityScore, input.deliveryCapabilityScore]
        .filter(Boolean).map(Number);
      const overallScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : undefined;
      const [item] = await db.insert(supplierQualifications).values({
        ...input,
        overallScore,
        status: "completed",
      }).returning();
      return item;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      isoSystemCertifications: z.array(z.string()).optional(),
      specialRequirements: z.array(z.string()).optional(),
      qualitySystemScore: z.string().optional(),
      processCapabilityScore: z.string().optional(),
      deliveryCapabilityScore: z.string().optional(),
      overallResult: z.enum(["qualified", "conditional", "failed"]).optional(),
      validUntil: z.string().optional(),
      nextAuditDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [item] = await db.update(supplierQualifications)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(supplierQualifications.id, toNum(id)))
        .returning();
      return item;
    }),

  getBySupplier: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(supplierQualifications)
        .where(eq(supplierQualifications.supplierId, input.supplierId))
        .orderBy(desc(supplierQualifications.createdAt));
      return items;
    }),

  checkExpiry: protectedProcedure.query(async () => {
    const db = await requireDb();
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const items = await db.select().from(supplierQualifications);
    const expiring = items.filter(i => i.validUntil && i.validUntil >= today && i.validUntil <= thirtyDaysLater);
    const expired = items.filter(i => i.validUntil && i.validUntil < today);
    return { expiring, expired };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 8. Quality Loss Agreements (质量损失协议)
// ═══════════════════════════════════════════════════════════════
const qualityLossAgreementRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(qualityLossAgreements).orderBy(desc(qualityLossAgreements.createdAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.status) items = items.filter(i => i.status === input.status);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(qualityLossAgreements).where(eq(qualityLossAgreements.id, toNum(input.id)));
    if (!item) throw new Error("质量损失协议不存在");
    return item;
  }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      supplierName: z.string().optional(),
      frameworkAgreementId: z.number().optional(),
      qualityLossThreshold: z.string().optional(),
      qualityLossRateThreshold: z.string().optional(),
      penaltyFormula: z.string().optional(),
      maxPenaltyAmount: z.string().optional(),
      effectiveDate: z.string().optional(),
      expiryDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db.insert(qualityLossAgreements).values({
        agreementCode: generateCode("QLA"),
        ...input,
      }).returning();
      return item;
    }),

  sign: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      signedBy: z.string(),
      witnessedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const [item] = await db.update(qualityLossAgreements)
        .set({
          signedBy: input.signedBy,
          witnessedBy: input.witnessedBy,
          signedAt: now,
          status: "active",
          updatedAt: now,
        })
        .where(eq(qualityLossAgreements.id, toNum(input.id)))
        .returning();
      return item;
    }),

  expire: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(qualityLossAgreements)
      .set({ status: "expired", updatedAt: new Date().toISOString() })
      .where(eq(qualityLossAgreements.id, toNum(input.id)))
      .returning();
    return item;
  }),
});

// ═══════════════════════════════════════════════════════════════
// 9. Quality Loss Incidents (质量损失事件记录)
// ═══════════════════════════════════════════════════════════════
const qualityLossIncidentRouter = router({
  list: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      qualityLossAgreementId: z.number().optional(),
      status: z.string().optional(),
      penaltyTriggered: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(qualityLossIncidents).orderBy(desc(qualityLossIncidents.createdAt));
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      if (input?.qualityLossAgreementId) items = items.filter(i => i.qualityLossAgreementId === input.qualityLossAgreementId);
      if (input?.status) items = items.filter(i => i.status === input.status);
      if (input?.penaltyTriggered !== undefined) items = items.filter(i => i.penaltyTriggered === input.penaltyTriggered);
      return { items, total: items.length };
    }),

  get: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(qualityLossIncidents).where(eq(qualityLossIncidents.id, toNum(input.id)));
    if (!item) throw new Error("质量损失事件不存在");
    return item;
  }),

  create: protectedProcedure
    .input(z.object({
      qualityLossAgreementId: z.number().optional(),
      supplierId: z.number(),
      supplierName: z.string().optional(),
      purchaseOrderId: z.number().optional(),
      poNumber: z.string().optional(),
      materialCode: z.string().optional(),
      materialName: z.string().optional(),
      lossAmount: z.string(),
      lossDescription: z.string().optional(),
      rootCause: z.string().optional(),
      evidenceUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      let penaltyTriggered = false;
      let penaltyAmount = "0";

      // Check if cumulative losses exceed threshold
      if (input.qualityLossAgreementId) {
        const [agreement] = await db.select().from(qualityLossAgreements)
          .where(eq(qualityLossAgreements.id, input.qualityLossAgreementId));
        if (agreement) {
          // Sum all existing losses for this agreement
          const existingIncidents = await db.select().from(qualityLossIncidents)
            .where(eq(qualityLossIncidents.qualityLossAgreementId, input.qualityLossAgreementId));
          const cumulativeLoss = existingIncidents.reduce((sum, i) => sum + Number(i.lossAmount || 0), 0) + Number(input.lossAmount);
          const threshold = Number(agreement.qualityLossThreshold || 0);
          if (threshold > 0 && cumulativeLoss > threshold) {
            penaltyTriggered = true;
            const excess = cumulativeLoss - threshold;
            // Default penalty: 100% of excess, capped at maxPenaltyAmount
            penaltyAmount = Math.min(excess, Number(agreement.maxPenaltyAmount || excess)).toFixed(2);
          }
        }
      }

      const [item] = await db.insert(qualityLossIncidents).values({
        incidentCode: generateCode("QLI"),
        ...input,
        penaltyTriggered,
        penaltyAmount,
        status: penaltyTriggered ? "penalty_applied" : "reported",
      }).returning();
      return item;
    }),

  acknowledge: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.update(qualityLossIncidents)
      .set({
        supplierAcknowledged: true,
        supplierAcknowledgedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(qualityLossIncidents.id, toNum(input.id)))
      .returning();
    return item;
  }),

  deductFromPayment: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      paymentWorkflowId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      // Get incident
      const [incident] = await db.select().from(qualityLossIncidents).where(eq(qualityLossIncidents.id, toNum(input.id)));
      if (!incident) throw new Error("事件不存在");
      // Update payment workflow deduction
      const [wf] = await db.select().from(paymentWorkflows).where(eq(paymentWorkflows.id, input.paymentWorkflowId));
      if (wf) {
        const newDeduction = Number(wf.qualityDeductionAmount || 0) + Number(incident.penaltyAmount || 0);
        await db.update(paymentWorkflows)
          .set({ qualityDeductionAmount: newDeduction.toFixed(2), updatedAt: now })
          .where(eq(paymentWorkflows.id, input.paymentWorkflowId));
      }
      // Update incident
      const [item] = await db.update(qualityLossIncidents)
        .set({
          deductionFromPaymentId: input.paymentWorkflowId,
          status: "deducted",
          updatedAt: now,
        })
        .where(eq(qualityLossIncidents.id, toNum(input.id)))
        .returning();
      return item;
    }),

  stats: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let items = await db.select().from(qualityLossIncidents);
      if (input?.supplierId) items = items.filter(i => i.supplierId === input.supplierId);
      const totalLoss = items.reduce((sum, i) => sum + Number(i.lossAmount || 0), 0);
      const totalPenalty = items.reduce((sum, i) => sum + Number(i.penaltyAmount || 0), 0);
      const penaltyTriggeredCount = items.filter(i => i.penaltyTriggered).length;
      return {
        totalIncidents: items.length,
        totalLoss: totalLoss.toFixed(2),
        totalPenalty: totalPenalty.toFixed(2),
        penaltyTriggeredCount,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Combined P2P Lifecycle Router
// ═══════════════════════════════════════════════════════════════
export const p2pLifecycleRouter = router({
  frameworkAgreement: frameworkAgreementRouter,
  rfq: rfqRouter,
  delivery: deliveryRouter,
  supplierReport: supplierReportRouter,
  payment: paymentRouter,
  smallValue: smallValueRouter,
  qualification: qualificationRouter,
  qualityLossAgreement: qualityLossAgreementRouter,
  qualityLossIncident: qualityLossIncidentRouter,
});
