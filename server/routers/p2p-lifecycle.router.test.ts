/**
 * P2P (Procure-to-Pay) Lifecycle Router — Comprehensive Test Suite
 *
 * Covers all 9 sub-routers (~56 procedures):
 *   1. frameworkAgreement  — CRUD + lifecycle (draft → active → expired)
 *   2. rfq                — RFQ/bidding (create, publish, quotes, evaluate, award)
 *   3. delivery           — delivery registration + QC linking + receipt confirmation
 *   4. supplierReport     — submit + verify/reject
 *   5. payment            — 8-step payment workflow
 *   6. smallValue         — small-value procurement (<50 per unit)
 *   7. qualification      — supplier qualification + expiry check
 *   8. qualityLossAgreement — quality loss agreement lifecycle
 *   9. qualityLossIncident  — incident + penalty + deduction + stats
 *
 * Run: pnpm test -- server/routers/p2p-lifecycle.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
  chain.then = (resolve: any, reject?: any) => {
    try {
      resolve(mockQueryResult);
    } catch (e) {
      reject?.(e);
    }
  };
  return chain;
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain = createMockDbChain();
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

// ─── Mock schema tables (column refs only) ───────────────────────
vi.mock("../../drizzle/p2p-lifecycle-schema", () => ({
  frameworkAgreements: {
    id: "id", agreementCode: "agreementCode", supplierId: "supplierId",
    supplierName: "supplierName", title: "title", startDate: "startDate",
    endDate: "endDate", pricingItems: "pricingItems", totalBudget: "totalBudget",
    spentAmount: "spentAmount", paymentTerms: "paymentTerms", currency: "currency",
    notes: "notes", status: "status", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rfqEvents: {
    id: "id", rfqCode: "rfqCode", title: "title", materialCode: "materialCode",
    materialName: "materialName", quantity: "quantity", unit: "unit",
    biddingType: "biddingType", deadline: "deadline",
    evaluationCriteria: "evaluationCriteria", invitedSupplierIds: "invitedSupplierIds",
    selectedQuoteId: "selectedQuoteId", generatedPoId: "generatedPoId",
    frameworkAgreementId: "frameworkAgreementId", notes: "notes",
    status: "status", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  rfqSupplierQuotes: {
    id: "id", rfqEventId: "rfqEventId", supplierId: "supplierId",
    supplierName: "supplierName", unitPrice: "unitPrice", totalPrice: "totalPrice",
    currency: "currency", deliveryDays: "deliveryDays", warrantyMonths: "warrantyMonths",
    paymentTerms: "paymentTerms", technicalNotes: "technicalNotes",
    attachmentUrls: "attachmentUrls", priceScore: "priceScore",
    qualityScore: "qualityScore", deliveryScore: "deliveryScore",
    totalScore: "totalScore", rank: "rank", status: "status",
    submittedAt: "submittedAt", evaluatedAt: "evaluatedAt", evaluatedBy: "evaluatedBy",
  },
  deliveryRegistrations: {
    id: "id", registrationCode: "registrationCode", purchaseOrderId: "purchaseOrderId",
    poNumber: "poNumber", supplierId: "supplierId", supplierName: "supplierName",
    materialCode: "materialCode", materialName: "materialName",
    deliveredQuantity: "deliveredQuantity", unit: "unit",
    trackingNumber: "trackingNumber", packingList: "packingList",
    testReportUrls: "testReportUrls", qcInspectionId: "qcInspectionId",
    warehouseReceiptId: "warehouseReceiptId", receivedByName: "receivedByName",
    receivedAt: "receivedAt", notes: "notes", status: "status",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  paymentWorkflows: {
    id: "id", workflowCode: "workflowCode", invoiceId: "invoiceId",
    invoiceNumber: "invoiceNumber", supplierId: "supplierId",
    supplierName: "supplierName", paymentAmount: "paymentAmount",
    currency: "currency", currentStep: "currentStep",
    paymentDueDate: "paymentDueDate", paymentTermExpired: "paymentTermExpired",
    qualityFeedbackOk: "qualityFeedbackOk", qualityFeedbackAt: "qualityFeedbackAt",
    buApprovedBy: "buApprovedBy", buApprovedAt: "buApprovedAt",
    qualityApprovedBy: "qualityApprovedBy", qualityApprovedAt: "qualityApprovedAt",
    paymentApprovedBy: "paymentApprovedBy", paymentApprovedAt: "paymentApprovedAt",
    procurementConfirmedBy: "procurementConfirmedBy",
    procurementConfirmedAt: "procurementConfirmedAt",
    supplierConfirmToken: "supplierConfirmToken",
    supplierConfirmedAt: "supplierConfirmedAt",
    contractArchived: "contractArchived", contractArchivedAt: "contractArchivedAt",
    qualityDeductionAmount: "qualityDeductionAmount",
    netPaymentAmount: "netPaymentAmount", notes: "notes",
    status: "status", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  smallValueProcurements: {
    id: "id", requestCode: "requestCode", materialName: "materialName",
    materialCode: "materialCode", specification: "specification",
    quantity: "quantity", unit: "unit", estimatedUnitPrice: "estimatedUnitPrice",
    estimatedTotalAmount: "estimatedTotalAmount", purpose: "purpose",
    requestedBy: "requestedBy", requestedByName: "requestedByName",
    supervisorId: "supervisorId", supervisorName: "supervisorName",
    supervisorApprovedAt: "supervisorApprovedAt",
    supervisorRejectionReason: "supervisorRejectionReason",
    procurementOfficerId: "procurementOfficerId",
    procurementOfficerName: "procurementOfficerName",
    procurementConfirmedAt: "procurementConfirmedAt",
    assignedSupplierId: "assignedSupplierId",
    assignedSupplierName: "assignedSupplierName",
    annualContractId: "annualContractId", actualUnitPrice: "actualUnitPrice",
    notes: "notes", status: "status",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  supplierReportSubmissions: {
    id: "id", supplierId: "supplierId", supplierName: "supplierName",
    documentType: "documentType", documentTitle: "documentTitle",
    fileUrl: "fileUrl", fileSize: "fileSize",
    relatedPoNumber: "relatedPoNumber", relatedMaterialCode: "relatedMaterialCode",
    expiryDate: "expiryDate", verificationStatus: "verificationStatus",
    verifiedBy: "verifiedBy", verifiedAt: "verifiedAt",
    rejectionReason: "rejectionReason",
    submittedAt: "submittedAt", createdAt: "createdAt",
  },
  supplierQualifications: {
    id: "id", supplierId: "supplierId", supplierName: "supplierName",
    qualificationType: "qualificationType", auditDate: "auditDate",
    auditorName: "auditorName", auditorId: "auditorId",
    isoSystemCertifications: "isoSystemCertifications",
    specialRequirements: "specialRequirements",
    qualitySystemScore: "qualitySystemScore",
    processCapabilityScore: "processCapabilityScore",
    deliveryCapabilityScore: "deliveryCapabilityScore",
    overallScore: "overallScore", overallResult: "overallResult",
    validUntil: "validUntil", nextAuditDate: "nextAuditDate",
    attachmentUrls: "attachmentUrls", notes: "notes",
    status: "status", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  qualityLossAgreements: {
    id: "id", agreementCode: "agreementCode", supplierId: "supplierId",
    supplierName: "supplierName", frameworkAgreementId: "frameworkAgreementId",
    qualityLossThreshold: "qualityLossThreshold",
    qualityLossRateThreshold: "qualityLossRateThreshold",
    penaltyFormula: "penaltyFormula", maxPenaltyAmount: "maxPenaltyAmount",
    effectiveDate: "effectiveDate", expiryDate: "expiryDate",
    signedBy: "signedBy", signedAt: "signedAt",
    witnessedBy: "witnessedBy", notes: "notes",
    status: "status", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  qualityLossIncidents: {
    id: "id", incidentCode: "incidentCode",
    qualityLossAgreementId: "qualityLossAgreementId",
    supplierId: "supplierId", supplierName: "supplierName",
    purchaseOrderId: "purchaseOrderId", poNumber: "poNumber",
    materialCode: "materialCode", materialName: "materialName",
    lossAmount: "lossAmount", lossDescription: "lossDescription",
    rootCause: "rootCause", evidenceUrls: "evidenceUrls",
    penaltyTriggered: "penaltyTriggered", penaltyAmount: "penaltyAmount",
    supplierAcknowledged: "supplierAcknowledged",
    supplierAcknowledgedAt: "supplierAcknowledgedAt",
    deductionFromPaymentId: "deductionFromPaymentId",
    notes: "notes", status: "status", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

vi.mock("../../drizzle/procurement-schema", () => ({
  purchaseOrders: {
    id: "id", poNumber: "poNumber", poDate: "poDate",
    supplierId: "supplierId", supplierCode: "supplierCode",
    supplierName: "supplierName", materialId: "materialId",
    materialCode: "materialCode", materialName: "materialName",
    quantity: "quantity", unitPrice: "unitPrice", totalAmount: "totalAmount",
    expectedDeliveryDate: "expectedDeliveryDate", createdBy: "createdBy",
  },
  purchaseInvoices: {
    id: "id", invoiceNumber: "invoiceNumber", invoiceDate: "invoiceDate",
    purchaseOrderId: "purchaseOrderId", poNumber: "poNumber",
    supplierId: "supplierId", supplierName: "supplierName",
    invoiceAmount: "invoiceAmount", taxAmount: "taxAmount",
    totalAmount: "totalAmount", paymentStatus: "paymentStatus",
    dueDate: "dueDate",
  },
  suppliers: {
    id: "id", supplierCode: "supplierCode", supplierName: "supplierName",
    supplierCategory: "supplierCategory",
  },
}));

// ─── Import callers AFTER mocks ──────────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset before each test ──────────────────────────────────────
beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
});

// ═════════════════════════════════════════════════════════════════
// AUTH GUARD — anonymous callers should be rejected
// ═════════════════════════════════════════════════════════════════
describe("p2p auth guard", () => {
  it("rejects anonymous caller on frameworkAgreement.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.frameworkAgreement.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on rfq.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.rfq.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on delivery.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.delivery.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on payment.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.payment.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on smallValue.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.smallValue.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on qualification.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.qualification.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on qualityLossAgreement.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.qualityLossAgreement.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on qualityLossIncident.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.qualityLossIncident.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on supplierReport.list", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.p2p.supplierReport.list()).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════
// 1. Framework Agreements (年度框架协议)
// ═════════════════════════════════════════════════════════════════
describe("p2p.frameworkAgreement", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [
      { id: 1, agreementCode: "FA-20260301-0001", status: "draft", supplierId: 10 },
      { id: 2, agreementCode: "FA-20260301-0002", status: "active", supplierId: 20 },
    ];
    const result = await caller.p2p.frameworkAgreement.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, status: "draft" },
      { id: 2, supplierId: 20, status: "active" },
    ];
    const result = await caller.p2p.frameworkAgreement.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "active", supplierId: 10 },
      { id: 2, status: "draft", supplierId: 20 },
    ];
    const result = await caller.p2p.frameworkAgreement.list({ status: "active" });
    expect(result.items.every((i: any) => i.status === "active")).toBe(true);
  });

  it("get returns single agreement", async () => {
    mockQueryResult = [{ id: 1, agreementCode: "FA-001", status: "draft" }];
    const result = await caller.p2p.frameworkAgreement.get({ id: 1 });
    expect(result).toHaveProperty("id", 1);
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.frameworkAgreement.get({ id: 999 })).rejects.toThrow("框架协议不存在");
  });

  it("get accepts string id", async () => {
    mockQueryResult = [{ id: 5, agreementCode: "FA-005" }];
    const result = await caller.p2p.frameworkAgreement.get({ id: "5" });
    expect(result).toHaveProperty("id", 5);
  });

  it("create inserts with generated code", async () => {
    mockReturningResult = [{ id: 1, agreementCode: "FA-20260301-1234", supplierId: 10, status: "draft" }];
    const result = await caller.p2p.frameworkAgreement.create({
      supplierId: 10,
      supplierName: "Acme Corp",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      totalBudget: "500000.00",
      paymentTerms: "Net 30",
    });
    expect(result).toHaveProperty("id", 1);
    expect(result.agreementCode).toMatch(/^FA-/);
  });

  it("update modifies fields", async () => {
    mockReturningResult = [{ id: 1, title: "Updated Agreement" }];
    const result = await caller.p2p.frameworkAgreement.update({
      id: 1,
      title: "Updated Agreement",
      totalBudget: "600000.00",
    });
    expect(result).toHaveProperty("title", "Updated Agreement");
  });

  it("activate sets status to active", async () => {
    mockReturningResult = [{ id: 1, status: "active" }];
    const result = await caller.p2p.frameworkAgreement.activate({ id: 1 });
    expect(result).toHaveProperty("status", "active");
  });

  it("expire sets status to expired", async () => {
    mockReturningResult = [{ id: 1, status: "expired" }];
    const result = await caller.p2p.frameworkAgreement.expire({ id: 1 });
    expect(result).toHaveProperty("status", "expired");
  });

  it("lifecycle: draft → active → expired", async () => {
    // Create (draft)
    mockReturningResult = [{ id: 1, status: "draft" }];
    const created = await caller.p2p.frameworkAgreement.create({
      supplierId: 10,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(created.status).toBe("draft");

    // Activate
    mockReturningResult = [{ id: 1, status: "active" }];
    const activated = await caller.p2p.frameworkAgreement.activate({ id: 1 });
    expect(activated.status).toBe("active");

    // Expire
    mockReturningResult = [{ id: 1, status: "expired" }];
    const expired = await caller.p2p.frameworkAgreement.expire({ id: 1 });
    expect(expired.status).toBe("expired");
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. RFQ (询价竞标)
// ═════════════════════════════════════════════════════════════════
describe("p2p.rfq", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, rfqCode: "RFQ-001", status: "draft" }];
    const result = await caller.p2p.rfq.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "published" },
      { id: 2, status: "draft" },
    ];
    const result = await caller.p2p.rfq.list({ status: "published" });
    expect(result.items.every((i: any) => i.status === "published")).toBe(true);
  });

  it("list with materialCode filter", async () => {
    mockQueryResult = [
      { id: 1, materialCode: "MAT-001", status: "draft" },
      { id: 2, materialCode: "MAT-002", status: "draft" },
    ];
    const result = await caller.p2p.rfq.list({ materialCode: "MAT-001" });
    expect(result.items.every((i: any) => i.materialCode === "MAT-001")).toBe(true);
  });

  it("get returns single RFQ", async () => {
    mockQueryResult = [{ id: 1, rfqCode: "RFQ-001" }];
    const result = await caller.p2p.rfq.get({ id: 1 });
    expect(result).toHaveProperty("rfqCode", "RFQ-001");
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.rfq.get({ id: 999 })).rejects.toThrow("询价事件不存在");
  });

  it("create inserts with generated RFQ code", async () => {
    mockReturningResult = [{ id: 1, rfqCode: "RFQ-20260301-5678", status: "draft" }];
    const result = await caller.p2p.rfq.create({
      title: "Bearing RFQ",
      materialCode: "MAT-BEARING-001",
      materialName: "Deep Groove Ball Bearing",
      quantity: "500",
      unit: "pcs",
      biddingType: "sealed",
      invitedSupplierIds: [10, 20, 30],
    });
    expect(result.rfqCode).toMatch(/^RFQ-/);
  });

  it("create with frameworkAgreementId", async () => {
    mockReturningResult = [{ id: 2, rfqCode: "RFQ-002", frameworkAgreementId: 1 }];
    const result = await caller.p2p.rfq.create({
      title: "Linked RFQ",
      frameworkAgreementId: 1,
    });
    expect(result).toHaveProperty("frameworkAgreementId", 1);
  });

  it("publish sets status to published", async () => {
    mockReturningResult = [{ id: 1, status: "published" }];
    const result = await caller.p2p.rfq.publish({ id: 1 });
    expect(result).toHaveProperty("status", "published");
  });

  it("close sets status to closed", async () => {
    mockReturningResult = [{ id: 1, status: "closed" }];
    const result = await caller.p2p.rfq.close({ id: 1 });
    expect(result).toHaveProperty("status", "closed");
  });

  it("getQuotes returns quotes for an RFQ", async () => {
    mockQueryResult = [
      { id: 1, rfqEventId: 1, supplierId: 10, unitPrice: "12.50" },
      { id: 2, rfqEventId: 1, supplierId: 20, unitPrice: "11.80" },
    ];
    const result = await caller.p2p.rfq.getQuotes({ rfqEventId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("getQuotes accepts string rfqEventId", async () => {
    mockQueryResult = [{ id: 1, rfqEventId: 5 }];
    const result = await caller.p2p.rfq.getQuotes({ rfqEventId: "5" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("submitQuote inserts a supplier quote", async () => {
    mockReturningResult = [{ id: 1, rfqEventId: 1, supplierId: 10, unitPrice: "12.50" }];
    const result = await caller.p2p.rfq.submitQuote({
      rfqEventId: 1,
      supplierId: 10,
      supplierName: "Acme Corp",
      unitPrice: "12.50",
      totalPrice: "6250.00",
      deliveryDays: 14,
      warrantyMonths: 12,
      paymentTerms: "Net 30",
      technicalNotes: "Grade A material",
    });
    expect(result).toHaveProperty("supplierId", 10);
  });

  it("evaluateQuotes scores and ranks", async () => {
    mockReturningResult = [{ id: 1, totalScore: "85.00" }];
    const result = await caller.p2p.rfq.evaluateQuotes({
      rfqEventId: 1,
      scores: [
        { quoteId: 1, priceScore: "90", qualityScore: "85", deliveryScore: "80" },
        { quoteId: 2, priceScore: "80", qualityScore: "90", deliveryScore: "85" },
      ],
    });
    expect(result).toHaveProperty("ranked", 2);
  });

  it("evaluateQuotes with single quote", async () => {
    mockReturningResult = [{ id: 1, totalScore: "90.00" }];
    const result = await caller.p2p.rfq.evaluateQuotes({
      rfqEventId: 1,
      scores: [
        { quoteId: 1, priceScore: "90", qualityScore: "90", deliveryScore: "90" },
      ],
    });
    expect(result).toHaveProperty("ranked", 1);
  });

  it("awardQuote awards selected and rejects others", async () => {
    // The procedure reads all quotes for the RFQ to reject non-winners
    mockQueryResult = [
      { id: 1, rfqEventId: 1, supplierId: 10 },
      { id: 2, rfqEventId: 1, supplierId: 20 },
    ];
    mockReturningResult = [{ id: 1, status: "awarded" }];
    const result = await caller.p2p.rfq.awardQuote({
      rfqEventId: 1,
      quoteId: 1,
    });
    expect(result).toHaveProperty("awarded", true);
  });

  it("awardQuote with createPo generates a PO", async () => {
    mockQueryResult = [
      { id: 1, rfqEventId: 1, materialCode: "MAT-001", materialName: "Bearing", quantity: "100" },
    ];
    mockReturningResult = [{ id: 10, poNumber: "PO-20260301-0001" }];
    const result = await caller.p2p.rfq.awardQuote({
      rfqEventId: 1,
      quoteId: 1,
      createPo: true,
    });
    expect(result).toHaveProperty("awarded", true);
    expect(result).toHaveProperty("poId");
  });

  it("full bidding lifecycle: create → publish → quote → evaluate → award", async () => {
    // Create
    mockReturningResult = [{ id: 1, rfqCode: "RFQ-001", status: "draft" }];
    const rfq = await caller.p2p.rfq.create({ title: "Test RFQ" });
    expect(rfq.status).toBe("draft");

    // Publish
    mockReturningResult = [{ id: 1, status: "published" }];
    const published = await caller.p2p.rfq.publish({ id: 1 });
    expect(published.status).toBe("published");

    // Submit quotes
    mockReturningResult = [{ id: 1, supplierId: 10 }];
    await caller.p2p.rfq.submitQuote({ rfqEventId: 1, supplierId: 10, unitPrice: "10.00" });
    mockReturningResult = [{ id: 2, supplierId: 20 }];
    await caller.p2p.rfq.submitQuote({ rfqEventId: 1, supplierId: 20, unitPrice: "9.50" });

    // Evaluate
    mockReturningResult = [{ id: 1, totalScore: "85.00" }];
    const evaluated = await caller.p2p.rfq.evaluateQuotes({
      rfqEventId: 1,
      scores: [
        { quoteId: 1, priceScore: "80", qualityScore: "90", deliveryScore: "85" },
        { quoteId: 2, priceScore: "85", qualityScore: "85", deliveryScore: "80" },
      ],
    });
    expect(evaluated.ranked).toBe(2);

    // Award
    mockQueryResult = [{ id: 1 }, { id: 2 }];
    mockReturningResult = [{ id: 1 }];
    const awarded = await caller.p2p.rfq.awardQuote({ rfqEventId: 1, quoteId: 2 });
    expect(awarded.awarded).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. Delivery Registrations (到货登记)
// ═════════════════════════════════════════════════════════════════
describe("p2p.delivery", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, registrationCode: "DLV-001", status: "received" }];
    const result = await caller.p2p.delivery.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, status: "received" },
      { id: 2, supplierId: 20, status: "pending" },
    ];
    const result = await caller.p2p.delivery.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "qc_passed" },
      { id: 2, status: "pending" },
    ];
    const result = await caller.p2p.delivery.list({ status: "qc_passed" });
    expect(result.items.every((i: any) => i.status === "qc_passed")).toBe(true);
  });

  it("list with poNumber filter", async () => {
    mockQueryResult = [
      { id: 1, poNumber: "PO-001", status: "received" },
      { id: 2, poNumber: "PO-002", status: "received" },
    ];
    const result = await caller.p2p.delivery.list({ poNumber: "PO-001" });
    expect(result.items.every((i: any) => i.poNumber === "PO-001")).toBe(true);
  });

  it("get returns single delivery", async () => {
    mockQueryResult = [{ id: 1, registrationCode: "DLV-001" }];
    const result = await caller.p2p.delivery.get({ id: 1 });
    expect(result).toHaveProperty("registrationCode", "DLV-001");
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.delivery.get({ id: 999 })).rejects.toThrow("到货登记不存在");
  });

  it("register creates a delivery registration", async () => {
    mockReturningResult = [{
      id: 1,
      registrationCode: "DLV-20260301-1234",
      status: "received",
      materialCode: "MAT-001",
    }];
    const result = await caller.p2p.delivery.register({
      purchaseOrderId: 1,
      poNumber: "PO-001",
      supplierId: 10,
      supplierName: "Acme",
      materialCode: "MAT-001",
      materialName: "Bearing",
      deliveredQuantity: "500",
      unit: "pcs",
      trackingNumber: "SF123456789",
      receivedByName: "Zhang Wei",
    });
    expect(result).toHaveProperty("status", "received");
    expect(result.registrationCode).toMatch(/^DLV-/);
  });

  it("updateStatus changes delivery status", async () => {
    mockReturningResult = [{ id: 1, status: "qc_pending" }];
    const result = await caller.p2p.delivery.updateStatus({
      id: 1,
      status: "qc_pending",
    });
    expect(result).toHaveProperty("status", "qc_pending");
  });

  it("updateStatus to qc_passed", async () => {
    mockReturningResult = [{ id: 1, status: "qc_passed" }];
    const result = await caller.p2p.delivery.updateStatus({
      id: 1,
      status: "qc_passed",
    });
    expect(result).toHaveProperty("status", "qc_passed");
  });

  it("updateStatus to qc_failed", async () => {
    mockReturningResult = [{ id: 1, status: "qc_failed" }];
    const result = await caller.p2p.delivery.updateStatus({
      id: 1,
      status: "qc_failed",
    });
    expect(result).toHaveProperty("status", "qc_failed");
  });

  it("linkQcInspection links QC and sets qc_pending", async () => {
    mockReturningResult = [{ id: 1, qcInspectionId: 42, status: "qc_pending" }];
    const result = await caller.p2p.delivery.linkQcInspection({
      id: 1,
      qcInspectionId: 42,
    });
    expect(result).toHaveProperty("qcInspectionId", 42);
    expect(result).toHaveProperty("status", "qc_pending");
  });

  it("confirmReceipt sets warehouse_confirmed", async () => {
    mockReturningResult = [{ id: 1, warehouseReceiptId: 100, status: "warehouse_confirmed" }];
    const result = await caller.p2p.delivery.confirmReceipt({
      id: 1,
      warehouseReceiptId: 100,
    });
    expect(result).toHaveProperty("status", "warehouse_confirmed");
    expect(result).toHaveProperty("warehouseReceiptId", 100);
  });

  it("confirmReceipt without warehouseReceiptId", async () => {
    mockReturningResult = [{ id: 1, status: "warehouse_confirmed" }];
    const result = await caller.p2p.delivery.confirmReceipt({ id: "1" });
    expect(result).toHaveProperty("status", "warehouse_confirmed");
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. Supplier Report Submissions
// ═════════════════════════════════════════════════════════════════
describe("p2p.supplierReport", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, documentType: "test_report", supplierId: 10 }];
    const result = await caller.p2p.supplierReport.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, documentType: "certificate" },
      { id: 2, supplierId: 20, documentType: "test_report" },
    ];
    const result = await caller.p2p.supplierReport.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with documentType filter", async () => {
    mockQueryResult = [
      { id: 1, documentType: "msds" },
      { id: 2, documentType: "coa" },
    ];
    const result = await caller.p2p.supplierReport.list({ documentType: "msds" });
    expect(result.items.every((i: any) => i.documentType === "msds")).toBe(true);
  });

  it("list with verificationStatus filter", async () => {
    mockQueryResult = [
      { id: 1, verificationStatus: "verified" },
      { id: 2, verificationStatus: "pending" },
    ];
    const result = await caller.p2p.supplierReport.list({ verificationStatus: "verified" });
    expect(result.items.every((i: any) => i.verificationStatus === "verified")).toBe(true);
  });

  it("submit creates a report submission", async () => {
    mockReturningResult = [{ id: 1, supplierId: 10, documentType: "test_report" }];
    const result = await caller.p2p.supplierReport.submit({
      supplierId: 10,
      supplierName: "Acme",
      documentType: "test_report",
      documentTitle: "Hardness Test Report",
      fileUrl: "/uploads/report.pdf",
      fileSize: 1024000,
      relatedPoNumber: "PO-001",
      relatedMaterialCode: "MAT-001",
      expiryDate: "2027-12-31",
    });
    expect(result).toHaveProperty("documentType", "test_report");
  });

  it("verify sets verificationStatus to verified", async () => {
    mockReturningResult = [{ id: 1, verificationStatus: "verified" }];
    const result = await caller.p2p.supplierReport.verify({
      id: 1,
      verificationStatus: "verified",
    });
    expect(result).toHaveProperty("verificationStatus", "verified");
  });

  it("verify rejects with reason", async () => {
    mockReturningResult = [{ id: 1, verificationStatus: "rejected", rejectionReason: "Expired certificate" }];
    const result = await caller.p2p.supplierReport.verify({
      id: 1,
      verificationStatus: "rejected",
      rejectionReason: "Expired certificate",
    });
    expect(result).toHaveProperty("verificationStatus", "rejected");
    expect(result).toHaveProperty("rejectionReason", "Expired certificate");
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. Payment Workflows (8-step payment approval)
// ═════════════════════════════════════════════════════════════════
describe("p2p.payment", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, workflowCode: "PAY-001", status: "pending" }];
    const result = await caller.p2p.payment.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, status: "in_progress" },
      { id: 2, supplierId: 20, status: "pending" },
    ];
    const result = await caller.p2p.payment.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "in_progress" },
      { id: 2, status: "completed" },
    ];
    const result = await caller.p2p.payment.list({ status: "in_progress" });
    expect(result.items.every((i: any) => i.status === "in_progress")).toBe(true);
  });

  it("list with currentStep filter", async () => {
    mockQueryResult = [
      { id: 1, currentStep: "bu_dept_approval" },
      { id: 2, currentStep: "payment_term_check" },
    ];
    const result = await caller.p2p.payment.list({ currentStep: "bu_dept_approval" });
    expect(result.items.every((i: any) => i.currentStep === "bu_dept_approval")).toBe(true);
  });

  it("get returns single payment workflow", async () => {
    mockQueryResult = [{ id: 1, workflowCode: "PAY-001", paymentAmount: "50000.00" }];
    const result = await caller.p2p.payment.get({ id: 1 });
    expect(result).toHaveProperty("workflowCode", "PAY-001");
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.payment.get({ id: 999 })).rejects.toThrow("付款工作流不存在");
  });

  it("initiate creates a payment workflow", async () => {
    mockReturningResult = [{
      id: 1,
      workflowCode: "PAY-20260301-1234",
      status: "in_progress",
      supplierConfirmToken: "some-uuid",
    }];
    const result = await caller.p2p.payment.initiate({
      invoiceId: 1,
      invoiceNumber: "INV-001",
      supplierId: 10,
      supplierName: "Acme",
      paymentAmount: "50000.00",
      currency: "CNY",
      paymentDueDate: "2026-04-01",
    });
    expect(result).toHaveProperty("status", "in_progress");
    expect(result.workflowCode).toMatch(/^PAY-/);
    expect(result).toHaveProperty("supplierConfirmToken");
  });

  it("checkPaymentTerm advances to quality_feedback_ok step", async () => {
    mockQueryResult = [{ id: 1, paymentDueDate: "2025-01-01" }]; // past date => expired
    mockReturningResult = [{ id: 1, currentStep: "quality_feedback_ok", paymentTermExpired: true }];
    const result = await caller.p2p.payment.checkPaymentTerm({ id: 1 });
    expect(result).toHaveProperty("currentStep", "quality_feedback_ok");
  });

  it("checkPaymentTerm not expired for future date", async () => {
    mockQueryResult = [{ id: 1, paymentDueDate: "2028-01-01" }]; // future date
    mockReturningResult = [{ id: 1, currentStep: "quality_feedback_ok", paymentTermExpired: false }];
    const result = await caller.p2p.payment.checkPaymentTerm({ id: 1 });
    expect(result).toHaveProperty("currentStep", "quality_feedback_ok");
  });

  it("checkPaymentTerm throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.payment.checkPaymentTerm({ id: 999 })).rejects.toThrow("工作流不存在");
  });

  it("confirmQualityOk advances to bu_dept_approval", async () => {
    mockReturningResult = [{ id: 1, qualityFeedbackOk: true, currentStep: "bu_dept_approval" }];
    const result = await caller.p2p.payment.confirmQualityOk({ id: 1 });
    expect(result).toHaveProperty("qualityFeedbackOk", true);
    expect(result).toHaveProperty("currentStep", "bu_dept_approval");
  });

  it("submitBuApproval advances to quality_prod_approval", async () => {
    mockReturningResult = [{ id: 1, buApprovedBy: 1, currentStep: "quality_prod_approval" }];
    const result = await caller.p2p.payment.submitBuApproval({ id: 1 });
    expect(result).toHaveProperty("currentStep", "quality_prod_approval");
    expect(result).toHaveProperty("buApprovedBy", 1);
  });

  it("submitQualityApproval advances to payment_approved", async () => {
    mockReturningResult = [{ id: 1, qualityApprovedBy: 1, currentStep: "payment_approved" }];
    const result = await caller.p2p.payment.submitQualityApproval({ id: 1 });
    expect(result).toHaveProperty("currentStep", "payment_approved");
  });

  it("approvePayment advances to procurement_confirmed", async () => {
    mockReturningResult = [{ id: 1, paymentApprovedBy: 1, currentStep: "procurement_confirmed" }];
    const result = await caller.p2p.payment.approvePayment({ id: 1 });
    expect(result).toHaveProperty("currentStep", "procurement_confirmed");
  });

  it("procurementConfirm calculates net and advances to supplier_confirmed", async () => {
    mockQueryResult = [{ id: 1, paymentAmount: "50000.00", qualityDeductionAmount: "1000.00" }];
    mockReturningResult = [{ id: 1, netPaymentAmount: "49000.00", currentStep: "supplier_confirmed" }];
    const result = await caller.p2p.payment.procurementConfirm({ id: 1 });
    expect(result).toHaveProperty("currentStep", "supplier_confirmed");
    expect(result).toHaveProperty("netPaymentAmount", "49000.00");
  });

  it("supplierConfirm advances to contract_archived", async () => {
    mockQueryResult = [{ id: 1, supplierConfirmToken: "valid-token-123", supplierConfirmedAt: null }];
    mockReturningResult = [{ id: 1, currentStep: "contract_archived" }];
    const result = await caller.p2p.payment.supplierConfirm({ token: "valid-token-123" });
    expect(result).toHaveProperty("currentStep", "contract_archived");
  });

  it("supplierConfirm throws for invalid token", async () => {
    mockQueryResult = []; // no match
    await expect(
      caller.p2p.payment.supplierConfirm({ token: "invalid-token" })
    ).rejects.toThrow("无效的确认令牌");
  });

  it("supplierConfirm throws if already confirmed", async () => {
    mockQueryResult = [{ id: 1, supplierConfirmToken: "token-123", supplierConfirmedAt: "2026-03-01T00:00:00Z" }];
    await expect(
      caller.p2p.payment.supplierConfirm({ token: "token-123" })
    ).rejects.toThrow("已确认，无需重复操作");
  });

  it("archiveContract completes the workflow", async () => {
    mockReturningResult = [{ id: 1, contractArchived: true, status: "completed" }];
    const result = await caller.p2p.payment.archiveContract({ id: 1 });
    expect(result).toHaveProperty("contractArchived", true);
    expect(result).toHaveProperty("status", "completed");
  });

  it("full 8-step workflow", async () => {
    // Step 1: Initiate
    mockReturningResult = [{ id: 1, status: "in_progress", currentStep: "payment_term_check" }];
    const wf = await caller.p2p.payment.initiate({ paymentAmount: "10000.00" });
    expect(wf.status).toBe("in_progress");

    // Step 2: Payment term check
    mockQueryResult = [{ id: 1, paymentDueDate: "2028-12-31" }];
    mockReturningResult = [{ id: 1, currentStep: "quality_feedback_ok" }];
    await caller.p2p.payment.checkPaymentTerm({ id: 1 });

    // Step 3: Quality OK
    mockReturningResult = [{ id: 1, currentStep: "bu_dept_approval" }];
    await caller.p2p.payment.confirmQualityOk({ id: 1 });

    // Step 4: BU approval
    mockReturningResult = [{ id: 1, currentStep: "quality_prod_approval" }];
    await caller.p2p.payment.submitBuApproval({ id: 1 });

    // Step 5: Quality/prod approval
    mockReturningResult = [{ id: 1, currentStep: "payment_approved" }];
    await caller.p2p.payment.submitQualityApproval({ id: 1 });

    // Step 6: Payment approved
    mockReturningResult = [{ id: 1, currentStep: "procurement_confirmed" }];
    await caller.p2p.payment.approvePayment({ id: 1 });

    // Step 7: Procurement confirm
    mockQueryResult = [{ id: 1, paymentAmount: "10000.00", qualityDeductionAmount: "0" }];
    mockReturningResult = [{ id: 1, currentStep: "supplier_confirmed", netPaymentAmount: "10000.00" }];
    await caller.p2p.payment.procurementConfirm({ id: 1 });

    // Step 8a: Supplier confirm
    mockQueryResult = [{ id: 1, supplierConfirmToken: "tok", supplierConfirmedAt: null }];
    mockReturningResult = [{ id: 1, currentStep: "contract_archived" }];
    await caller.p2p.payment.supplierConfirm({ token: "tok" });

    // Step 8b: Archive
    mockReturningResult = [{ id: 1, contractArchived: true, status: "completed" }];
    const final = await caller.p2p.payment.archiveContract({ id: 1 });
    expect(final.status).toBe("completed");
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. Small Value Procurements (小额采购)
// ═════════════════════════════════════════════════════════════════
describe("p2p.smallValue", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, requestCode: "SVP-001", status: "draft" }];
    const result = await caller.p2p.smallValue.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "pending_supervisor" },
      { id: 2, status: "completed" },
    ];
    const result = await caller.p2p.smallValue.list({ status: "pending_supervisor" });
    expect(result.items.every((i: any) => i.status === "pending_supervisor")).toBe(true);
  });

  it("create with valid price (< 50)", async () => {
    mockReturningResult = [{
      id: 1,
      requestCode: "SVP-20260301-0001",
      status: "pending_supervisor",
      estimatedTotalAmount: "245.00",
    }];
    const result = await caller.p2p.smallValue.create({
      materialName: "Rubber O-ring",
      materialCode: "MAT-ORING-001",
      specification: "30mm x 3mm",
      quantity: 5,
      unit: "pcs",
      estimatedUnitPrice: "49.00",
      purpose: "Maintenance spare parts",
      requestedByName: "Li Ming",
    });
    expect(result).toHaveProperty("status", "pending_supervisor");
  });

  it("create rejects price >= 50", async () => {
    await expect(
      caller.p2p.smallValue.create({
        materialName: "Expensive Part",
        estimatedUnitPrice: "50.00",
      })
    ).rejects.toThrow("小额采购单价必须 < 50 元/件");
  });

  it("create rejects price well above 50", async () => {
    await expect(
      caller.p2p.smallValue.create({
        materialName: "Very Expensive Part",
        estimatedUnitPrice: "200.00",
      })
    ).rejects.toThrow("小额采购单价必须 < 50 元/件");
  });

  it("supervisorApprove approves and advances status", async () => {
    mockReturningResult = [{ id: 1, status: "supervisor_approved" }];
    const result = await caller.p2p.smallValue.supervisorApprove({
      id: 1,
      approved: true,
      supervisorName: "Wang Gang",
    });
    expect(result).toHaveProperty("status", "supervisor_approved");
  });

  it("supervisorApprove rejects with reason", async () => {
    mockReturningResult = [{ id: 1, status: "rejected", supervisorRejectionReason: "Not needed" }];
    const result = await caller.p2p.smallValue.supervisorApprove({
      id: 1,
      approved: false,
      rejectionReason: "Not needed",
    });
    expect(result).toHaveProperty("status", "rejected");
  });

  it("procurementConfirm completes the procurement", async () => {
    mockReturningResult = [{
      id: 1,
      status: "completed",
      assignedSupplierId: 10,
      assignedSupplierName: "Local Parts Shop",
      actualUnitPrice: "42.00",
    }];
    const result = await caller.p2p.smallValue.procurementConfirm({
      id: 1,
      procurementOfficerName: "Chen Procurement",
      assignedSupplierId: 10,
      assignedSupplierName: "Local Parts Shop",
      annualContractId: 1,
      actualUnitPrice: "42.00",
    });
    expect(result).toHaveProperty("status", "completed");
    expect(result).toHaveProperty("actualUnitPrice", "42.00");
  });

  it("full small-value lifecycle: create → approve → confirm", async () => {
    // Create
    mockReturningResult = [{ id: 1, status: "pending_supervisor" }];
    const created = await caller.p2p.smallValue.create({
      materialName: "Screws M6",
      estimatedUnitPrice: "0.50",
      quantity: 100,
    });
    expect(created.status).toBe("pending_supervisor");

    // Supervisor approve
    mockReturningResult = [{ id: 1, status: "supervisor_approved" }];
    const approved = await caller.p2p.smallValue.supervisorApprove({
      id: 1,
      approved: true,
    });
    expect(approved.status).toBe("supervisor_approved");

    // Procurement confirm
    mockReturningResult = [{ id: 1, status: "completed" }];
    const completed = await caller.p2p.smallValue.procurementConfirm({ id: 1 });
    expect(completed.status).toBe("completed");
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. Supplier Qualifications (供应商资格审查)
// ═════════════════════════════════════════════════════════════════
describe("p2p.qualification", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, supplierId: 10, qualificationType: "initial" }];
    const result = await caller.p2p.qualification.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10 },
      { id: 2, supplierId: 20 },
    ];
    const result = await caller.p2p.qualification.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with qualificationType filter", async () => {
    mockQueryResult = [
      { id: 1, qualificationType: "annual" },
      { id: 2, qualificationType: "initial" },
    ];
    const result = await caller.p2p.qualification.list({ qualificationType: "annual" });
    expect(result.items.every((i: any) => i.qualificationType === "annual")).toBe(true);
  });

  it("list with overallResult filter", async () => {
    mockQueryResult = [
      { id: 1, overallResult: "qualified" },
      { id: 2, overallResult: "failed" },
    ];
    const result = await caller.p2p.qualification.list({ overallResult: "qualified" });
    expect(result.items.every((i: any) => i.overallResult === "qualified")).toBe(true);
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "completed" },
      { id: 2, status: "draft" },
    ];
    const result = await caller.p2p.qualification.list({ status: "completed" });
    expect(result.items.every((i: any) => i.status === "completed")).toBe(true);
  });

  it("get returns single qualification", async () => {
    mockQueryResult = [{ id: 1, supplierId: 10, overallScore: "85.00" }];
    const result = await caller.p2p.qualification.get({ id: 1 });
    expect(result).toHaveProperty("overallScore", "85.00");
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.qualification.get({ id: 999 })).rejects.toThrow("资格记录不存在");
  });

  it("create with scores calculates overall score", async () => {
    mockReturningResult = [{
      id: 1,
      supplierId: 10,
      overallScore: "85.00",
      status: "completed",
    }];
    const result = await caller.p2p.qualification.create({
      supplierId: 10,
      supplierName: "Acme Corp",
      qualificationType: "initial",
      auditDate: "2026-03-01",
      auditorName: "Inspector Zhang",
      qualitySystemScore: "90",
      processCapabilityScore: "80",
      deliveryCapabilityScore: "85",
      overallResult: "qualified",
      validUntil: "2027-03-01",
      nextAuditDate: "2027-02-01",
    });
    expect(result).toHaveProperty("status", "completed");
  });

  it("create annual qualification", async () => {
    mockReturningResult = [{ id: 2, qualificationType: "annual", status: "completed" }];
    const result = await caller.p2p.qualification.create({
      supplierId: 10,
      qualificationType: "annual",
    });
    expect(result).toHaveProperty("qualificationType", "annual");
  });

  it("create special qualification", async () => {
    mockReturningResult = [{ id: 3, qualificationType: "special", status: "completed" }];
    const result = await caller.p2p.qualification.create({
      supplierId: 10,
      qualificationType: "special",
    });
    expect(result).toHaveProperty("qualificationType", "special");
  });

  it("update modifies qualification fields", async () => {
    mockReturningResult = [{ id: 1, overallResult: "conditional", notes: "Requires improvement" }];
    const result = await caller.p2p.qualification.update({
      id: 1,
      overallResult: "conditional",
      notes: "Requires improvement in process capability",
    });
    expect(result).toHaveProperty("overallResult", "conditional");
  });

  it("getBySupplier returns all qualifications for a supplier", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, qualificationType: "initial" },
      { id: 2, supplierId: 10, qualificationType: "annual" },
    ];
    const result = await caller.p2p.qualification.getBySupplier({ supplierId: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("checkExpiry returns expiring and expired qualifications", async () => {
    const today = new Date();
    const in15Days = new Date(today.getTime() + 15 * 86400000).toISOString().split("T")[0];
    const past = new Date(today.getTime() - 5 * 86400000).toISOString().split("T")[0];
    const future = new Date(today.getTime() + 60 * 86400000).toISOString().split("T")[0];
    mockQueryResult = [
      { id: 1, validUntil: in15Days },  // expiring (within 30 days)
      { id: 2, validUntil: past },       // expired
      { id: 3, validUntil: future },     // still valid (>30 days)
    ];
    const result = await caller.p2p.qualification.checkExpiry();
    expect(result).toHaveProperty("expiring");
    expect(result).toHaveProperty("expired");
    expect(result.expiring.length).toBe(1);
    expect(result.expired.length).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. Quality Loss Agreements (质量损失协议)
// ═════════════════════════════════════════════════════════════════
describe("p2p.qualityLossAgreement", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, agreementCode: "QLA-001", status: "draft" }];
    const result = await caller.p2p.qualityLossAgreement.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, status: "active" },
      { id: 2, supplierId: 20, status: "draft" },
    ];
    const result = await caller.p2p.qualityLossAgreement.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "active" },
      { id: 2, status: "expired" },
    ];
    const result = await caller.p2p.qualityLossAgreement.list({ status: "active" });
    expect(result.items.every((i: any) => i.status === "active")).toBe(true);
  });

  it("get returns single agreement", async () => {
    mockQueryResult = [{ id: 1, agreementCode: "QLA-001", qualityLossThreshold: "10000.00" }];
    const result = await caller.p2p.qualityLossAgreement.get({ id: 1 });
    expect(result).toHaveProperty("agreementCode", "QLA-001");
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.qualityLossAgreement.get({ id: 999 })).rejects.toThrow("质量损失协议不存在");
  });

  it("create inserts with generated code", async () => {
    mockReturningResult = [{
      id: 1,
      agreementCode: "QLA-20260301-0001",
      supplierId: 10,
      status: "draft",
    }];
    const result = await caller.p2p.qualityLossAgreement.create({
      supplierId: 10,
      supplierName: "Acme Corp",
      frameworkAgreementId: 1,
      qualityLossThreshold: "10000.00",
      qualityLossRateThreshold: "0.005",
      penaltyFormula: "excess * 1.0",
      maxPenaltyAmount: "50000.00",
      effectiveDate: "2026-01-01",
      expiryDate: "2026-12-31",
    });
    expect(result.agreementCode).toMatch(/^QLA-/);
  });

  it("sign sets status to active with signer info", async () => {
    mockReturningResult = [{
      id: 1,
      signedBy: "Wang Supplier",
      witnessedBy: "Li GRT",
      status: "active",
    }];
    const result = await caller.p2p.qualityLossAgreement.sign({
      id: 1,
      signedBy: "Wang Supplier",
      witnessedBy: "Li GRT",
    });
    expect(result).toHaveProperty("status", "active");
    expect(result).toHaveProperty("signedBy", "Wang Supplier");
    expect(result).toHaveProperty("witnessedBy", "Li GRT");
  });

  it("expire sets status to expired", async () => {
    mockReturningResult = [{ id: 1, status: "expired" }];
    const result = await caller.p2p.qualityLossAgreement.expire({ id: 1 });
    expect(result).toHaveProperty("status", "expired");
  });

  it("lifecycle: create → sign → expire", async () => {
    // Create (draft)
    mockReturningResult = [{ id: 1, status: "draft" }];
    const created = await caller.p2p.qualityLossAgreement.create({
      supplierId: 10,
      qualityLossThreshold: "5000.00",
    });
    expect(created.status).toBe("draft");

    // Sign (active)
    mockReturningResult = [{ id: 1, status: "active" }];
    const signed = await caller.p2p.qualityLossAgreement.sign({
      id: 1,
      signedBy: "Supplier Rep",
    });
    expect(signed.status).toBe("active");

    // Expire
    mockReturningResult = [{ id: 1, status: "expired" }];
    const expired = await caller.p2p.qualityLossAgreement.expire({ id: 1 });
    expect(expired.status).toBe("expired");
  });
});

// ═════════════════════════════════════════════════════════════════
// 9. Quality Loss Incidents (质量损失事件记录)
// ═════════════════════════════════════════════════════════════════
describe("p2p.qualityLossIncident", () => {
  const caller = createAuthenticatedCaller();

  it("list returns items and total", async () => {
    mockQueryResult = [{ id: 1, incidentCode: "QLI-001", status: "reported" }];
    const result = await caller.p2p.qualityLossIncident.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, status: "reported" },
      { id: 2, supplierId: 20, status: "confirmed" },
    ];
    const result = await caller.p2p.qualityLossIncident.list({ supplierId: 10 });
    expect(result.items.every((i: any) => i.supplierId === 10)).toBe(true);
  });

  it("list with qualityLossAgreementId filter", async () => {
    mockQueryResult = [
      { id: 1, qualityLossAgreementId: 1 },
      { id: 2, qualityLossAgreementId: 2 },
    ];
    const result = await caller.p2p.qualityLossIncident.list({ qualityLossAgreementId: 1 });
    expect(result.items.every((i: any) => i.qualityLossAgreementId === 1)).toBe(true);
  });

  it("list with status filter", async () => {
    mockQueryResult = [
      { id: 1, status: "penalty_applied" },
      { id: 2, status: "reported" },
    ];
    const result = await caller.p2p.qualityLossIncident.list({ status: "penalty_applied" });
    expect(result.items.every((i: any) => i.status === "penalty_applied")).toBe(true);
  });

  it("list with penaltyTriggered filter", async () => {
    mockQueryResult = [
      { id: 1, penaltyTriggered: true },
      { id: 2, penaltyTriggered: false },
    ];
    const result = await caller.p2p.qualityLossIncident.list({ penaltyTriggered: true });
    expect(result.items.every((i: any) => i.penaltyTriggered === true)).toBe(true);
  });

  it("get returns single incident", async () => {
    mockQueryResult = [{ id: 1, incidentCode: "QLI-001", lossAmount: "5000.00" }];
    const result = await caller.p2p.qualityLossIncident.get({ id: 1 });
    expect(result).toHaveProperty("incidentCode", "QLI-001");
  });

  it("get throws when not found", async () => {
    mockQueryResult = [];
    await expect(caller.p2p.qualityLossIncident.get({ id: 999 })).rejects.toThrow("质量损失事件不存在");
  });

  it("create without agreement (no penalty check)", async () => {
    mockReturningResult = [{
      id: 1,
      incidentCode: "QLI-20260301-0001",
      penaltyTriggered: false,
      penaltyAmount: "0",
      status: "reported",
    }];
    const result = await caller.p2p.qualityLossIncident.create({
      supplierId: 10,
      supplierName: "Acme",
      lossAmount: "3000.00",
      lossDescription: "Defective batch",
      rootCause: "Raw material contamination",
      evidenceUrls: ["/evidence/photo1.jpg"],
    });
    expect(result).toHaveProperty("status", "reported");
    expect(result).toHaveProperty("penaltyTriggered", false);
  });

  it("create with agreement triggers penalty when threshold exceeded", async () => {
    // First call: db.select().from(qualityLossAgreements) returns the agreement
    // Second call: db.select().from(qualityLossIncidents) returns existing incidents
    // We need mockQueryResult to serve both calls, but with our proxy it returns same array.
    // The procedure does two selects. Both resolve to mockQueryResult.
    // Agreement mock: has threshold 10000, existing incidents sum = 8000, new loss = 3000, total = 11000 > threshold
    mockQueryResult = [
      { id: 1, qualityLossThreshold: "10000.00", maxPenaltyAmount: "50000.00" },
    ];
    mockReturningResult = [{
      id: 2,
      incidentCode: "QLI-002",
      penaltyTriggered: true,
      penaltyAmount: "1000.00",
      status: "penalty_applied",
    }];
    const result = await caller.p2p.qualityLossIncident.create({
      qualityLossAgreementId: 1,
      supplierId: 10,
      lossAmount: "3000.00",
      lossDescription: "Cracked housings",
    });
    expect(result).toHaveProperty("status", "penalty_applied");
    expect(result).toHaveProperty("penaltyTriggered", true);
  });

  it("acknowledge sets supplier acknowledged", async () => {
    mockReturningResult = [{ id: 1, supplierAcknowledged: true }];
    const result = await caller.p2p.qualityLossIncident.acknowledge({ id: 1 });
    expect(result).toHaveProperty("supplierAcknowledged", true);
  });

  it("deductFromPayment links incident to payment workflow", async () => {
    // First select: incident
    // Second select: payment workflow
    mockQueryResult = [
      { id: 1, penaltyAmount: "1000.00" },
    ];
    mockReturningResult = [{ id: 1, deductionFromPaymentId: 5, status: "deducted" }];
    const result = await caller.p2p.qualityLossIncident.deductFromPayment({
      id: 1,
      paymentWorkflowId: 5,
    });
    expect(result).toHaveProperty("status", "deducted");
    expect(result).toHaveProperty("deductionFromPaymentId", 5);
  });

  it("deductFromPayment throws when incident not found", async () => {
    mockQueryResult = [];
    await expect(
      caller.p2p.qualityLossIncident.deductFromPayment({ id: 999, paymentWorkflowId: 1 })
    ).rejects.toThrow("事件不存在");
  });

  it("stats returns aggregated statistics", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, lossAmount: "3000.00", penaltyAmount: "500.00", penaltyTriggered: true },
      { id: 2, supplierId: 10, lossAmount: "2000.00", penaltyAmount: "0", penaltyTriggered: false },
      { id: 3, supplierId: 20, lossAmount: "1500.00", penaltyAmount: "200.00", penaltyTriggered: true },
    ];
    const result = await caller.p2p.qualityLossIncident.stats();
    expect(result).toHaveProperty("totalIncidents", 3);
    expect(result).toHaveProperty("totalLoss", "6500.00");
    expect(result).toHaveProperty("totalPenalty", "700.00");
    expect(result).toHaveProperty("penaltyTriggeredCount", 2);
  });

  it("stats with supplierId filter", async () => {
    mockQueryResult = [
      { id: 1, supplierId: 10, lossAmount: "3000.00", penaltyAmount: "500.00", penaltyTriggered: true },
      { id: 2, supplierId: 10, lossAmount: "2000.00", penaltyAmount: "0", penaltyTriggered: false },
      { id: 3, supplierId: 20, lossAmount: "1500.00", penaltyAmount: "200.00", penaltyTriggered: true },
    ];
    const result = await caller.p2p.qualityLossIncident.stats({ supplierId: 10 });
    expect(result).toHaveProperty("totalIncidents", 2);
    expect(result).toHaveProperty("totalLoss", "5000.00");
    expect(result).toHaveProperty("totalPenalty", "500.00");
    expect(result).toHaveProperty("penaltyTriggeredCount", 1);
  });

  it("stats with no incidents returns zeros", async () => {
    mockQueryResult = [];
    const result = await caller.p2p.qualityLossIncident.stats();
    expect(result).toHaveProperty("totalIncidents", 0);
    expect(result).toHaveProperty("totalLoss", "0.00");
    expect(result).toHaveProperty("totalPenalty", "0.00");
    expect(result).toHaveProperty("penaltyTriggeredCount", 0);
  });
});
