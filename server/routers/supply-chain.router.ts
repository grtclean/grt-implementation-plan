/**
 * Supply Chain Traceability & Quality Control Router
 * IATF 16949 / VDA 6.3 Compliance
 *
 * 10 sub-routers, ~65 procedures covering:
 *   supplier labels, incoming inspection, BOM scan verification,
 *   labor confirmations, customer complaints, maintenance,
 *   scrap disposal, spare parts, supplier penalties, traceability
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  supplierShipmentLabels,
  incomingInspectionRecords,
  assemblyBomScanLogs,
  assemblyLaborConfirmations,
  customerQualityComplaints,
  equipmentMaintenanceRecords,
  scrapDisposalRecords,
  spareParts,
  sparePartConsumptionLogs,
  supplierPenalties,
  traceabilityGraphEdges,
} from "../../drizzle/supply-chain-schema";
import { eq, desc, and, sql, count, gte, lte, isNull, inArray } from "drizzle-orm";
import { bomItems } from "../../drizzle/bom-schema";
import { inventoryLots } from "../../drizzle/inventory-lot-schema";
import { deliveryRegistrations } from "../../drizzle/p2p-lifecycle-schema";
import { suppliers } from "../../drizzle/procurement-schema";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

function generateCode(prefix: string) {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `${prefix}-${dateStr}-${rand}`;
}

// ═══════════════════════════════════════════════════════════════
// 1. Supplier Shipment Labels
// ═══════════════════════════════════════════════════════════════
const supplierLabelRouter = router({
  list: publicProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      materialCode: z.string().optional(),
      poNumber: z.string().optional(),
      projectNumber: z.string().optional(),
      isValidated: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(supplierShipmentLabels).orderBy(desc(supplierShipmentLabels.createdAt));
      let filtered = items;
      if (input?.supplierId) filtered = filtered.filter(i => i.supplierId === input.supplierId);
      if (input?.materialCode) filtered = filtered.filter(i => i.materialCode === input.materialCode);
      if (input?.poNumber) filtered = filtered.filter(i => i.poNumber === input.poNumber);
      if (input?.projectNumber) filtered = filtered.filter(i => i.projectNumber === input.projectNumber);
      if (input?.isValidated !== undefined) filtered = filtered.filter(i => i.isValidated === input.isValidated);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(supplierShipmentLabels).where(eq(supplierShipmentLabels.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      supplierSerialNumber: z.string(),
      supplierId: z.number().optional(),
      supplierName: z.string().optional(),
      projectNumber: z.string().optional(),
      bomProductCode: z.string().optional(),
      materialCode: z.string(),
      materialName: z.string().optional(),
      poNumber: z.string().optional(),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      batchNumber: z.string().optional(),
      productionDate: z.string().optional(),
      expiryDate: z.string().optional(),
      barcodeFormat: z.enum(["QR", "CODE128", "EAN13", "DATAMATRIX"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Generate barcode data (JSON payload)
      const barcodeData = JSON.stringify({
        sn: input.supplierSerialNumber,
        mat: input.materialCode,
        po: input.poNumber,
        qty: input.quantity,
        batch: input.batchNumber,
        proj: input.projectNumber,
      });
      const [label] = await db.insert(supplierShipmentLabels).values({
        ...input,
        barcodeData,
        barcodeFormat: input.barcodeFormat || "QR",
      }).returning();
      return label;
    }),

  validate: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    const [label] = await db.select().from(supplierShipmentLabels).where(eq(supplierShipmentLabels.id, numId));
    if (!label) throw new Error("Label not found");
    const errors: string[] = [];
    if (!label.materialCode) errors.push("物料编码缺失");
    if (!label.poNumber) errors.push("采购订单号缺失");
    if (!label.supplierSerialNumber) errors.push("供应商序列号缺失");
    const isValid = errors.length === 0;
    const [updated] = await db.update(supplierShipmentLabels).set({
      isValidated: isValid,
      validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
      updatedAt: new Date().toISOString(),
    }).where(eq(supplierShipmentLabels.id, numId)).returning();
    return updated;
  }),

  batchValidate: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const results: { id: number; valid: boolean }[] = [];
      for (const id of input.ids) {
        const [label] = await db.select().from(supplierShipmentLabels).where(eq(supplierShipmentLabels.id, id));
        if (!label) continue;
        const errors: string[] = [];
        if (!label.materialCode) errors.push("物料编码缺失");
        if (!label.poNumber) errors.push("采购订单号缺失");
        const isValid = errors.length === 0;
        await db.update(supplierShipmentLabels).set({
          isValidated: isValid,
          validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
          updatedAt: new Date().toISOString(),
        }).where(eq(supplierShipmentLabels.id, id));
        results.push({ id, valid: isValid });
      }
      return results;
    }),

  markPrinted: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(supplierShipmentLabels).set({
      printCount: sql`${supplierShipmentLabels.printCount} + 1`,
      lastPrintedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(supplierShipmentLabels.id, toNum(input.id))).returning();
    return updated;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(supplierShipmentLabels).where(eq(supplierShipmentLabels.id, toNum(input.id)));
    return { success: true };
  }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(supplierShipmentLabels);
    const validated = all.filter(l => l.isValidated);
    return {
      total: all.length,
      validated: validated.length,
      pending: all.length - validated.length,
      validationRate: all.length > 0 ? Math.round((validated.length / all.length) * 100) : 0,
    };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 2. Incoming Inspection (IQC)
// ═══════════════════════════════════════════════════════════════
const incomingInspectionRouter = router({
  list: publicProcedure
    .input(z.object({
      materialCode: z.string().optional(),
      supplierId: z.number().optional(),
      inspectionResult: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(incomingInspectionRecords).orderBy(desc(incomingInspectionRecords.createdAt));
      let filtered = items;
      if (input?.materialCode) filtered = filtered.filter(i => i.materialCode === input.materialCode);
      if (input?.supplierId) filtered = filtered.filter(i => i.supplierId === input.supplierId);
      if (input?.inspectionResult) filtered = filtered.filter(i => i.inspectionResult === input.inspectionResult);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(incomingInspectionRecords).where(eq(incomingInspectionRecords.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      purchaseReceiptId: z.number().optional(),
      lotId: z.number().optional(),
      labelId: z.number().optional(),
      materialCode: z.string(),
      materialName: z.string().optional(),
      supplierId: z.number().optional(),
      supplierName: z.string().optional(),
      poNumber: z.string().optional(),
      inspectedQuantity: z.string().optional(),
      sampleSize: z.number().optional(),
      hasTestReport: z.boolean().default(false),
      testReportUrl: z.string().optional(),
      testReportGrtMaterialMatch: z.boolean().optional(),
      testReportOrderMatch: z.boolean().optional(),
      controlPlanId: z.number().optional(),
      measurementData: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const code = generateCode("IQC");
      const [record] = await db.insert(incomingInspectionRecords).values({
        inspectionCode: code,
        ...input,
        inspectionResult: "PENDING",
        disposition: "hold",
      }).returning();

      // Create traceability edge
      if (record.lotId) {
        await db.insert(traceabilityGraphEdges).values({
          fromEntityType: "lot",
          fromEntityId: record.lotId,
          toEntityType: "inspection",
          toEntityId: record.id,
          relationshipType: "inspected_as",
        });
      }
      return record;
    }),

  submitResult: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      inspectionResult: z.enum(["PASS", "FAIL", "CONDITIONAL"]),
      disposition: z.enum(["accept", "reject", "rework", "return_to_supplier", "hold"]),
      dispositionReason: z.string().optional(),
      defectCount: z.number().optional(),
      measurementData: z.any().optional(),
      inspectedByName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);
      const [record] = await db.select().from(incomingInspectionRecords).where(eq(incomingInspectionRecords.id, numId));
      if (!record) throw new Error("Inspection record not found");

      const [updated] = await db.update(incomingInspectionRecords).set({
        inspectionResult: input.inspectionResult,
        disposition: input.disposition,
        dispositionReason: input.dispositionReason,
        defectCount: input.defectCount ?? 0,
        measurementData: input.measurementData,
        inspectedByName: input.inspectedByName,
        inspectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(incomingInspectionRecords.id, numId)).returning();

      // P3: When QC passes, update linked delivery registrations → notify supplier to submit invoice
      if (input.inspectionResult === "PASS") {
        try {
          const allDeliveries = await db.select().from(deliveryRegistrations);
          const linked = allDeliveries.filter(d => d.qcInspectionId === numId);
          for (const dlv of linked) {
            await db.update(deliveryRegistrations)
              .set({ status: "qc_passed", updatedAt: new Date().toISOString() })
              .where(eq(deliveryRegistrations.id, dlv.id));
          }
          // Notify supplier: QC passed, please submit invoice
          if (linked.length > 0) {
            const supplierIds = [...new Set(linked.map(d => d.supplierId).filter(Boolean))];
            for (const sid of supplierIds) {
              const allSuppliers = await db.select().from(suppliers);
              const supplier = allSuppliers.find(s => s.id === Number(sid));
              if (supplier?.contactEmail) {
                console.log(`[QC-PASS] Notification → ${supplier.supplierName} <${supplier.contactEmail}>: 质检合格(IQC #${numId})，请提交发票`);
                // In production: integrate with email/webhook service
                // await emailService.send({ to: supplier.contactEmail, subject: "质检合格通知 — 请提交发票", ... });
              }
            }
          }
        } catch { /* non-critical — log but don't fail */ }
      }

      return updated;
    }),

  // Auto-reject if test report missing or mismatched
  rejectReceipt: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);
      const [record] = await db.select().from(incomingInspectionRecords).where(eq(incomingInspectionRecords.id, numId));
      if (!record) throw new Error("Inspection record not found");

      const reasons: string[] = [];
      if (!record.hasTestReport) reasons.push("检测报告缺失");
      if (record.hasTestReport && !record.testReportGrtMaterialMatch) reasons.push("检测报告物料号不匹配");
      if (record.hasTestReport && !record.testReportOrderMatch) reasons.push("检测报告订单号不匹配");

      if (reasons.length === 0) {
        return { autoRejected: false, message: "所有检验条件通过，无需自动拒绝" };
      }

      // Auto-reject
      const [updated] = await db.update(incomingInspectionRecords).set({
        inspectionResult: "FAIL",
        disposition: "reject",
        dispositionReason: reasons.join("; "),
        inspectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(incomingInspectionRecords.id, numId)).returning();

      // Auto-create supplier penalty
      if (record.supplierId) {
        // Count existing ACTIVE penalties for this supplier (consistent with penalty.create)
        const existing = await db.select().from(supplierPenalties)
          .where(and(eq(supplierPenalties.supplierId, record.supplierId), eq(supplierPenalties.isActive, true)));
        const occurrenceCount = existing.length + 1;
        const escalation = getEscalationLevel(occurrenceCount);

        await db.insert(supplierPenalties).values({
          penaltyCode: generateCode("PEN"),
          supplierId: record.supplierId,
          supplierName: record.supplierName || undefined,
          triggerType: record.hasTestReport ? "quality_reject" : "missing_report",
          triggerReferenceId: record.id,
          triggerReferenceType: "inspection",
          penaltyType: escalation.type,
          description: `来料检验自动拒绝: ${reasons.join("; ")}`,
          occurrenceCount,
          escalationLevel: escalation.level,
          correctiveActionRequired: occurrenceCount >= 3,
          isBlacklisted: occurrenceCount >= 10,
          blacklistEffectiveDate: occurrenceCount >= 10 ? new Date().toISOString().split("T")[0] : undefined,
        });
      }

      return { autoRejected: true, reasons, updated };
    }),

  linkTo8D: protectedProcedure
    .input(z.object({
      inspectionId: z.union([z.string(), z.number()]),
      eightDReportId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(incomingInspectionRecords).set({
        eightDReportId: input.eightDReportId,
        updatedAt: new Date().toISOString(),
      }).where(eq(incomingInspectionRecords.id, toNum(input.inspectionId))).returning();
      return updated;
    }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(incomingInspectionRecords);
    const pass = all.filter(i => i.inspectionResult === "PASS").length;
    const fail = all.filter(i => i.inspectionResult === "FAIL").length;
    const pending = all.filter(i => i.inspectionResult === "PENDING").length;
    const noReport = all.filter(i => !i.hasTestReport).length;
    return {
      total: all.length,
      pass,
      fail,
      pending,
      conditional: all.length - pass - fail - pending,
      passRate: all.length - pending > 0 ? Math.round((pass / (all.length - pending)) * 100) : 0,
      missingReports: noReport,
    };
  }),

  approve: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      approvedByName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(incomingInspectionRecords).set({
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(incomingInspectionRecords.id, toNum(input.id))).returning();
      return updated;
    }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(incomingInspectionRecords).where(eq(incomingInspectionRecords.id, toNum(input.id)));
    return { success: true };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 3. Assembly BOM Scan Verification
// ═══════════════════════════════════════════════════════════════
const assemblyBomScanRouter = router({
  list: publicProcedure
    .input(z.object({
      projectNumber: z.string().optional(),
      processCode: z.string().optional(),
      bomMatchResult: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(assemblyBomScanLogs).orderBy(desc(assemblyBomScanLogs.createdAt));
      let filtered = items;
      if (input?.projectNumber) filtered = filtered.filter(i => i.projectNumber === input.projectNumber);
      if (input?.processCode) filtered = filtered.filter(i => i.processCode === input.processCode);
      if (input?.bomMatchResult) filtered = filtered.filter(i => i.bomMatchResult === input.bomMatchResult);
      return { items: filtered, total: filtered.length };
    }),

  // Core scanning procedure: resolve barcode → BOM match
  scanAndVerify: protectedProcedure
    .input(z.object({
      projectNumber: z.string(),
      processCode: z.string(),
      scannedBarcode: z.string(),
      scannedBy: z.number().optional(),
      scannedByName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Step 1: Try to resolve barcode to material code via supplier labels
      let resolvedMaterialCode: string | null = null;
      let lotNumber: string | null = null;
      let serialNumber: string | null = null;

      const [label] = await db.select().from(supplierShipmentLabels)
        .where(eq(supplierShipmentLabels.supplierSerialNumber, input.scannedBarcode));

      if (label) {
        resolvedMaterialCode = label.materialCode;
        lotNumber = label.batchNumber;
      } else {
        // Try parsing barcode data as JSON
        try {
          const parsed = JSON.parse(input.scannedBarcode);
          resolvedMaterialCode = parsed.mat || parsed.materialCode || null;
        } catch {
          // Plain text barcode = treat as material code
          resolvedMaterialCode = input.scannedBarcode;
        }
      }

      // Step 2: Determine BOM match result by querying bomItems table
      let bomMatchResult = "NOT_FOUND" as "MATCH" | "MISMATCH" | "SUBSTITUTE" | "NOT_FOUND";
      let expectedMaterialCode: string | null = null;
      let bomItemId: number | null = null;

      // Query BOM items for this process code
      const bomItemsForProcess = await db.select().from(bomItems)
        .where(eq(bomItems.processCode, input.processCode));

      if (bomItemsForProcess.length > 0 && resolvedMaterialCode) {
        // Check for exact match
        const exactMatch = bomItemsForProcess.find(b => b.materialCode === resolvedMaterialCode);
        if (exactMatch) {
          bomMatchResult = "MATCH" as const;
          expectedMaterialCode = exactMatch.materialCode;
          bomItemId = exactMatch.id;
        } else {
          // Check for substitute match
          const substituteMatch = bomItemsForProcess.find(b => b.substituteCode === resolvedMaterialCode);
          if (substituteMatch) {
            bomMatchResult = "SUBSTITUTE" as const;
            expectedMaterialCode = substituteMatch.materialCode;
            bomItemId = substituteMatch.id;
          } else {
            // Material resolved but doesn't match any BOM item for this process
            bomMatchResult = "MISMATCH" as const;
            expectedMaterialCode = bomItemsForProcess[0]?.materialCode || null;
            bomItemId = bomItemsForProcess[0]?.id || null;
          }
        }
      } else if (resolvedMaterialCode && bomItemsForProcess.length === 0) {
        // No BOM items defined for this process — cannot verify
        bomMatchResult = "NOT_FOUND" as const;
      }

      const [scanLog] = await db.insert(assemblyBomScanLogs).values({
        projectNumber: input.projectNumber,
        processCode: input.processCode,
        scannedBarcode: input.scannedBarcode,
        resolvedMaterialCode,
        bomItemId,
        expectedMaterialCode,
        bomMatchResult,
        lotNumber,
        serialNumber,
        scannedBy: input.scannedBy,
        scannedByName: input.scannedByName,
      }).returning();

      // Create traceability edge
      if (label) {
        await db.insert(traceabilityGraphEdges).values({
          fromEntityType: "label",
          fromEntityId: label.id,
          toEntityType: "bom_scan",
          toEntityId: scanLog.id,
          relationshipType: "assembled_in",
          projectNumber: input.projectNumber,
        });
      }

      return {
        ...scanLog,
        requiresDeviation: (bomMatchResult as string) === "MISMATCH" || (bomMatchResult as string) === "SUBSTITUTE",
      };
    }),

  confirmDeviation: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      deviationReason: z.string(),
      deviationConfirmedBy: z.number().optional(),
      bomAdjustmentApplied: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(assemblyBomScanLogs).set({
        deviationConfirmed: true,
        deviationReason: input.deviationReason,
        deviationConfirmedBy: input.deviationConfirmedBy,
        deviationConfirmedAt: new Date().toISOString(),
        bomAdjustmentApplied: input.bomAdjustmentApplied ?? false,
      }).where(eq(assemblyBomScanLogs.id, toNum(input.id))).returning();
      return updated;
    }),

  processProgress: publicProcedure
    .input(z.object({ projectNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const scans = await db.select().from(assemblyBomScanLogs)
        .where(eq(assemblyBomScanLogs.projectNumber, input.projectNumber));
      // Group by process code
      const byProcess = new Map<string, { total: number; match: number; mismatch: number; deviation: number }>();
      scans.forEach(s => {
        const proc = byProcess.get(s.processCode) || { total: 0, match: 0, mismatch: 0, deviation: 0 };
        proc.total++;
        if (s.bomMatchResult === "MATCH") proc.match++;
        if (s.bomMatchResult === "MISMATCH") proc.mismatch++;
        if (s.deviationConfirmed) proc.deviation++;
        byProcess.set(s.processCode, proc);
      });
      return { projectNumber: input.projectNumber, processes: Object.fromEntries(byProcess) };
    }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(assemblyBomScanLogs);
    const match = all.filter(s => s.bomMatchResult === "MATCH").length;
    const mismatch = all.filter(s => s.bomMatchResult === "MISMATCH").length;
    const substitute = all.filter(s => s.bomMatchResult === "SUBSTITUTE").length;
    return {
      total: all.length,
      match,
      mismatch,
      substitute,
      notFound: all.length - match - mismatch - substitute,
      matchRate: all.length > 0 ? Math.round((match / all.length) * 100) : 0,
    };
  }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(assemblyBomScanLogs).where(eq(assemblyBomScanLogs.id, toNum(input.id)));
    return item ?? null;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(assemblyBomScanLogs).where(eq(assemblyBomScanLogs.id, toNum(input.id)));
    return { success: true };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 4. Labor Confirmations
// ═══════════════════════════════════════════════════════════════
const laborConfirmationRouter = router({
  list: publicProcedure
    .input(z.object({
      projectNumber: z.string().optional(),
      processCode: z.string().optional(),
      workerId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(assemblyLaborConfirmations).orderBy(desc(assemblyLaborConfirmations.createdAt));
      let filtered = items;
      if (input?.projectNumber) filtered = filtered.filter(i => i.projectNumber === input.projectNumber);
      if (input?.processCode) filtered = filtered.filter(i => i.processCode === input.processCode);
      if (input?.workerId) filtered = filtered.filter(i => i.workerId === input.workerId);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(assemblyLaborConfirmations).where(eq(assemblyLaborConfirmations.id, toNum(input.id)));
    return item ?? null;
  }),

  clockIn: protectedProcedure
    .input(z.object({
      projectNumber: z.string(),
      processCode: z.string(),
      workerId: z.number(),
      workerName: z.string().optional(),
      plannedMinutes: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [record] = await db.insert(assemblyLaborConfirmations).values({
        projectNumber: input.projectNumber,
        processCode: input.processCode,
        workerId: input.workerId,
        workerName: input.workerName,
        clockInTime: new Date().toISOString(),
        plannedMinutes: input.plannedMinutes,
      }).returning();
      return record;
    }),

  clockOut: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      qualityResult: z.string().optional(),
      defectsFound: z.number().optional(),
      reworkMinutes: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);
      const [record] = await db.select().from(assemblyLaborConfirmations).where(eq(assemblyLaborConfirmations.id, numId));
      if (!record) throw new Error("Labor record not found");

      const clockOut = new Date();
      const clockIn = new Date(record.clockInTime);
      const netMinutes = Math.max(1, Math.round((clockOut.getTime() - clockIn.getTime()) / 60000));
      const efficiency = record.plannedMinutes && netMinutes > 0 ? Math.round((record.plannedMinutes / netMinutes) * 100) : null;

      const [updated] = await db.update(assemblyLaborConfirmations).set({
        clockOutTime: clockOut.toISOString(),
        netWorkMinutes: netMinutes,
        efficiencyPercent: efficiency ? String(efficiency) : null,
        qualityResult: input.qualityResult,
        defectsFound: input.defectsFound ?? 0,
        reworkMinutes: input.reworkMinutes ?? 0,
        confirmedByWorker: true,
        updatedAt: new Date().toISOString(),
      }).where(eq(assemblyLaborConfirmations.id, numId)).returning();
      return updated;
    }),

  supervisorConfirm: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      supervisorId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(assemblyLaborConfirmations).set({
        confirmedBySupervisor: true,
        supervisorId: input.supervisorId,
        supervisorConfirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(assemblyLaborConfirmations.id, toNum(input.id))).returning();
      return updated;
    }),

  workerSummary: publicProcedure
    .input(z.object({ workerId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const records = await db.select().from(assemblyLaborConfirmations).where(eq(assemblyLaborConfirmations.workerId, input.workerId));
      const completed = records.filter(r => r.clockOutTime);
      const totalMinutes = completed.reduce((sum, r) => sum + (r.netWorkMinutes || 0), 0);
      const totalDefects = completed.reduce((sum, r) => sum + (r.defectsFound || 0), 0);
      const avgEfficiency = completed.length > 0
        ? completed.reduce((sum, r) => sum + (Number(r.efficiencyPercent) || 0), 0) / completed.length
        : 0;
      return {
        workerId: input.workerId,
        totalRecords: records.length,
        completedRecords: completed.length,
        totalMinutes,
        totalDefects,
        avgEfficiency: Math.round(avgEfficiency),
      };
    }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(assemblyLaborConfirmations);
    const active = all.filter(r => r.clockInTime && !r.clockOutTime).length;
    const completed = all.filter(r => r.clockOutTime).length;
    const avgEfficiency = all.filter(r => r.efficiencyPercent).reduce((s, r) => s + Number(r.efficiencyPercent), 0)
      / (all.filter(r => r.efficiencyPercent).length || 1);
    return {
      total: all.length,
      active,
      completed,
      avgEfficiency: Math.round(avgEfficiency),
    };
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(assemblyLaborConfirmations).where(eq(assemblyLaborConfirmations.id, toNum(input.id)));
    return { success: true };
  }),

  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      notes: z.string().optional(),
      qualityResult: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [updated] = await db.update(assemblyLaborConfirmations).set({
        ...data,
        updatedAt: new Date().toISOString(),
      }).where(eq(assemblyLaborConfirmations.id, toNum(id))).returning();
      return updated;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 5. Customer Quality Complaints
// ═══════════════════════════════════════════════════════════════
const customerComplaintRouter = router({
  list: publicProcedure
    .input(z.object({
      customerId: z.number().optional(),
      projectNumber: z.string().optional(),
      severity: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(customerQualityComplaints).orderBy(desc(customerQualityComplaints.createdAt));
      let filtered = items;
      if (input?.customerId) filtered = filtered.filter(i => i.customerId === input.customerId);
      if (input?.projectNumber) filtered = filtered.filter(i => i.projectNumber === input.projectNumber);
      if (input?.severity) filtered = filtered.filter(i => i.severity === input.severity);
      if (input?.status) filtered = filtered.filter(i => i.status === input.status);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(customerQualityComplaints).where(eq(customerQualityComplaints.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      projectNumber: z.string().optional(),
      equipmentSerialNumber: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      description: z.string(),
      affectedParts: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [complaint] = await db.insert(customerQualityComplaints).values({
        complaintCode: generateCode("CQC"),
        ...input,
        status: "open",
      }).returning();
      return complaint;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      status: z.string().optional(),
      severity: z.string().optional(),
      rootCause: z.string().optional(),
      correctiveAction: z.string().optional(),
      designChangeRequired: z.boolean().optional(),
      ecnNumber: z.string().optional(),
      fmeaUpdated: z.boolean().optional(),
      controlPlanUpdated: z.boolean().optional(),
      satisfactionScore: z.number().optional(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const updateData: any = { ...data, updatedAt: new Date().toISOString() };
      if (input.status === "resolved") updateData.resolutionDate = new Date().toISOString();
      const [updated] = await db.update(customerQualityComplaints).set(updateData)
        .where(eq(customerQualityComplaints.id, toNum(id))).returning();
      return updated;
    }),

  linkTo8D: protectedProcedure
    .input(z.object({
      complaintId: z.union([z.string(), z.number()]),
      eightDReportId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(customerQualityComplaints).set({
        eightDReportId: input.eightDReportId,
        updatedAt: new Date().toISOString(),
      }).where(eq(customerQualityComplaints.id, toNum(input.complaintId))).returning();

      // Create traceability edge
      await db.insert(traceabilityGraphEdges).values({
        fromEntityType: "complaint",
        fromEntityId: toNum(input.complaintId),
        toEntityType: "eight_d",
        toEntityId: input.eightDReportId,
        relationshipType: "resolved_by",
      });

      return updated;
    }),

  linkToCAPA: protectedProcedure
    .input(z.object({
      complaintId: z.union([z.string(), z.number()]),
      capaId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(customerQualityComplaints).set({
        capaId: input.capaId,
        updatedAt: new Date().toISOString(),
      }).where(eq(customerQualityComplaints.id, toNum(input.complaintId))).returning();
      return updated;
    }),

  traceToSupplier: publicProcedure
    .input(z.object({ complaintId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [complaint] = await db.select().from(customerQualityComplaints).where(eq(customerQualityComplaints.id, toNum(input.complaintId)));
      if (!complaint) return null;

      // Find related traceability edges
      const edges = await db.select().from(traceabilityGraphEdges)
        .where(eq(traceabilityGraphEdges.projectNumber, complaint.projectNumber || ""));
      return { complaint, traceEdges: edges };
    }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(customerQualityComplaints);
    const open = all.filter(c => c.status === "open").length;
    const investigating = all.filter(c => c.status === "investigating").length;
    const resolved = all.filter(c => c.status === "resolved").length;
    const critical = all.filter(c => c.severity === "critical").length;
    const avgScore = all.filter(c => c.satisfactionScore).reduce((s, c) => s + (c.satisfactionScore || 0), 0)
      / (all.filter(c => c.satisfactionScore).length || 1);
    return {
      total: all.length,
      open,
      investigating,
      resolved,
      closed: all.length - open - investigating - resolved,
      critical,
      avgSatisfactionScore: Math.round(avgScore * 10) / 10,
    };
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(customerQualityComplaints).where(eq(customerQualityComplaints.id, toNum(input.id)));
    return { success: true };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 6. Equipment Maintenance
// ═══════════════════════════════════════════════════════════════
const maintenanceRouter = router({
  list: publicProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      maintenanceType: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(equipmentMaintenanceRecords).orderBy(desc(equipmentMaintenanceRecords.createdAt));
      let filtered = items;
      if (input?.equipmentId) filtered = filtered.filter(i => i.equipmentId === input.equipmentId);
      if (input?.maintenanceType) filtered = filtered.filter(i => i.maintenanceType === input.maintenanceType);
      if (input?.status) filtered = filtered.filter(i => i.status === input.status);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(equipmentMaintenanceRecords).where(eq(equipmentMaintenanceRecords.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      equipmentName: z.string().optional(),
      equipmentCode: z.string().optional(),
      maintenanceType: z.enum(["preventive", "corrective", "predictive", "emergency"]).default("preventive"),
      scheduledDate: z.string().optional(),
      workPerformed: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [record] = await db.insert(equipmentMaintenanceRecords).values({
        maintenanceCode: generateCode("MNT"),
        ...input,
        status: "scheduled",
      }).returning();
      return record;
    }),

  start: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(equipmentMaintenanceRecords).set({
      status: "in_progress",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(equipmentMaintenanceRecords.id, toNum(input.id))).returning();
    return updated;
  }),

  complete: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      workPerformed: z.string().optional(),
      findings: z.string().optional(),
      partsConsumed: z.any().optional(),
      laborCost: z.string().optional(),
      partsCost: z.string().optional(),
      nextMaintenanceDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);
      const [record] = await db.select().from(equipmentMaintenanceRecords).where(eq(equipmentMaintenanceRecords.id, numId));
      if (!record) throw new Error("Maintenance record not found");

      const startTime = record.startedAt ? new Date(record.startedAt).getTime() : Date.now();
      const downtime = Math.round((Date.now() - startTime) / 60000);
      const laborCost = Number(input.laborCost || 0);
      const partsCost = Number(input.partsCost || 0);

      const [updated] = await db.update(equipmentMaintenanceRecords).set({
        status: "completed",
        completedAt: new Date().toISOString(),
        downtimeMinutes: downtime,
        workPerformed: input.workPerformed,
        findings: input.findings,
        partsConsumed: input.partsConsumed,
        laborCost: String(laborCost),
        partsCost: String(partsCost),
        totalCost: String(laborCost + partsCost),
        nextMaintenanceDate: input.nextMaintenanceDate,
        updatedAt: new Date().toISOString(),
      }).where(eq(equipmentMaintenanceRecords.id, numId)).returning();
      return updated;
    }),

  upcoming: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(equipmentMaintenanceRecords)
      .where(eq(equipmentMaintenanceRecords.status, "scheduled"));
    return all.sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
  }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(equipmentMaintenanceRecords);
    const scheduled = all.filter(r => r.status === "scheduled").length;
    const inProgress = all.filter(r => r.status === "in_progress").length;
    const completed = all.filter(r => r.status === "completed").length;
    const totalDowntime = all.reduce((s, r) => s + (r.downtimeMinutes || 0), 0);
    const totalCost = all.reduce((s, r) => s + Number(r.totalCost || 0), 0);
    return { total: all.length, scheduled, inProgress, completed, totalDowntimeMinutes: totalDowntime, totalCost };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 7. Scrap Disposal
// ═══════════════════════════════════════════════════════════════
const scrapDisposalRouter = router({
  list: publicProcedure
    .input(z.object({
      materialCode: z.string().optional(),
      disposalMethod: z.string().optional(),
      projectNumber: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(scrapDisposalRecords).orderBy(desc(scrapDisposalRecords.createdAt));
      let filtered = items;
      if (input?.materialCode) filtered = filtered.filter(i => i.materialCode === input.materialCode);
      if (input?.disposalMethod) filtered = filtered.filter(i => i.disposalMethod === input.disposalMethod);
      if (input?.projectNumber) filtered = filtered.filter(i => i.projectNumber === input.projectNumber);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(scrapDisposalRecords).where(eq(scrapDisposalRecords.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      materialCode: z.string(),
      materialName: z.string().optional(),
      lotNumber: z.string().optional(),
      serialNumber: z.string().optional(),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      scrapReason: z.string(),
      scrapCategory: z.string().optional(),
      projectNumber: z.string().optional(),
      processCode: z.string().optional(),
      authorizedBy: z.number(),
      authorizedByName: z.string().optional(),
      disposalMethod: z.enum(["recycle", "destroy", "return", "salvage"]).default("recycle"),
      replacementRequired: z.boolean().optional(),
      unitCost: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qty = Number(input.quantity || 1);
      const unitCost = Number(input.unitCost || 0);
      const [record] = await db.insert(scrapDisposalRecords).values({
        scrapCode: generateCode("SCR"),
        ...input,
        totalScrapCost: String(qty * unitCost),
        authorizedAt: new Date().toISOString(),
      }).returning();

      // Traceability: link lot → scrap record
      if (input.lotNumber) {
        // Look up the lot's numeric ID from inventoryLots
        const [lot] = await db.select({ id: inventoryLots.id }).from(inventoryLots)
          .where(eq(inventoryLots.lotNumber, input.lotNumber));
        await db.insert(traceabilityGraphEdges).values({
          fromEntityType: "lot",
          fromEntityId: lot?.id ?? 0,
          toEntityType: "scrap",
          toEntityId: record.id,
          relationshipType: "scrapped_from",
          projectNumber: input.projectNumber,
          metadata: { lotNumber: input.lotNumber },
        });
      }
      return record;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      disposalMethod: z.enum(["recycle", "destroy", "return", "salvage"]).optional(),
      disposalDate: z.string().optional(),
      notes: z.string().optional(),
      replacementPurchaseRequestId: z.number().optional(),
      supplierPenaltyId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [updated] = await db.update(scrapDisposalRecords).set({
        ...data,
        updatedAt: new Date().toISOString(),
      } as any).where(eq(scrapDisposalRecords.id, toNum(id))).returning();
      return updated;
    }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(scrapDisposalRecords);
    const totalCost = all.reduce((s, r) => s + Number(r.totalScrapCost || 0), 0);
    const byMethod = { recycle: 0, destroy: 0, return: 0, salvage: 0 } as Record<string, number>;
    all.forEach(r => { byMethod[r.disposalMethod] = (byMethod[r.disposalMethod] || 0) + 1; });
    const replacementNeeded = all.filter(r => r.replacementRequired).length;
    return { total: all.length, totalCost, byMethod, replacementNeeded };
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(scrapDisposalRecords).where(eq(scrapDisposalRecords.id, toNum(input.id)));
    return { success: true };
  }),

  byCategory: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(scrapDisposalRecords);
    const byCategory = new Map<string, { count: number; cost: number }>();
    all.forEach(r => {
      const cat = r.scrapCategory || "unknown";
      const existing = byCategory.get(cat) || { count: 0, cost: 0 };
      existing.count++;
      existing.cost += Number(r.totalScrapCost || 0);
      byCategory.set(cat, existing);
    });
    return Object.fromEntries(byCategory);
  }),

  linkToPenalty: protectedProcedure
    .input(z.object({
      scrapId: z.union([z.string(), z.number()]),
      penaltyId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(scrapDisposalRecords).set({
        supplierPenaltyId: input.penaltyId,
        updatedAt: new Date().toISOString(),
      }).where(eq(scrapDisposalRecords.id, toNum(input.scrapId))).returning();
      return updated;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 8. Spare Parts
// ═══════════════════════════════════════════════════════════════
const sparePartsRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      isCritical: z.boolean().optional(),
      lowStockOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(spareParts).orderBy(desc(spareParts.createdAt));
      let filtered = items.filter(i => i.isActive);
      if (input?.category) filtered = filtered.filter(i => i.category === input.category);
      if (input?.isCritical) filtered = filtered.filter(i => i.isCritical);
      if (input?.lowStockOnly) filtered = filtered.filter(i => i.currentStock <= i.reorderPoint);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(spareParts).where(eq(spareParts.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      materialCode: z.string(),
      materialName: z.string(),
      specification: z.string().optional(),
      category: z.string().optional(),
      applicableEquipmentTypes: z.any().optional(),
      minStockLevel: z.number().optional(),
      reorderPoint: z.number().optional(),
      maxStockLevel: z.number().optional(),
      currentStock: z.number().default(0),
      autoReorderEnabled: z.boolean().optional(),
      preferredSupplierId: z.number().optional(),
      preferredSupplierName: z.string().optional(),
      unitPrice: z.string().optional(),
      leadTimeDays: z.number().optional(),
      isCritical: z.boolean().optional(),
      warehouseId: z.number().optional(),
      locationCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [part] = await db.insert(spareParts).values({
        partCode: generateCode("SP"),
        ...input,
      }).returning();
      return part;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      materialName: z.string().optional(),
      specification: z.string().optional(),
      category: z.string().optional(),
      minStockLevel: z.number().optional(),
      reorderPoint: z.number().optional(),
      maxStockLevel: z.number().optional(),
      autoReorderEnabled: z.boolean().optional(),
      preferredSupplierId: z.number().optional(),
      preferredSupplierName: z.string().optional(),
      unitPrice: z.string().optional(),
      leadTimeDays: z.number().optional(),
      isCritical: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [updated] = await db.update(spareParts).set({
        ...data,
        updatedAt: new Date().toISOString(),
      }).where(eq(spareParts.id, toNum(id))).returning();
      return updated;
    }),

  // Consume spare part and check auto-reorder
  consume: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      quantityConsumed: z.number(),
      maintenanceRecordId: z.number().optional(),
      equipmentId: z.number().optional(),
      equipmentName: z.string().optional(),
      reason: z.string().optional(),
      consumedByName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [part] = await db.select().from(spareParts).where(eq(spareParts.id, input.sparePartId));
      if (!part) throw new Error("Spare part not found");
      if (part.currentStock < input.quantityConsumed) throw new Error("库存不足");

      const newStock = part.currentStock - input.quantityConsumed;
      const shouldReorder = part.autoReorderEnabled && newStock <= part.reorderPoint;

      // Update stock
      await db.update(spareParts).set({
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      }).where(eq(spareParts.id, input.sparePartId));

      // Log consumption
      const [log] = await db.insert(sparePartConsumptionLogs).values({
        sparePartId: input.sparePartId,
        maintenanceRecordId: input.maintenanceRecordId,
        equipmentId: input.equipmentId,
        equipmentName: input.equipmentName,
        quantityConsumed: input.quantityConsumed,
        previousStock: part.currentStock,
        newStock,
        reason: input.reason,
        autoReorderTriggered: shouldReorder,
        consumedByName: input.consumedByName,
      }).returning();

      // Create traceability edge
      if (input.maintenanceRecordId) {
        await db.insert(traceabilityGraphEdges).values({
          fromEntityType: "spare_part",
          fromEntityId: input.sparePartId,
          toEntityType: "maintenance",
          toEntityId: input.maintenanceRecordId,
          relationshipType: "consumed_by",
        });
      }

      return { log, autoReorderTriggered: shouldReorder, newStock };
    }),

  consumptionHistory: publicProcedure
    .input(z.object({ sparePartId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(sparePartConsumptionLogs).orderBy(desc(sparePartConsumptionLogs.createdAt));
      if (input?.sparePartId) return items.filter(i => i.sparePartId === input.sparePartId);
      return items;
    }),

  restock: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      quantity: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [part] = await db.select().from(spareParts).where(eq(spareParts.id, input.sparePartId));
      if (!part) throw new Error("Spare part not found");
      const [updated] = await db.update(spareParts).set({
        currentStock: part.currentStock + input.quantity,
        updatedAt: new Date().toISOString(),
      }).where(eq(spareParts.id, input.sparePartId)).returning();
      return updated;
    }),

  lowStockAlerts: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(spareParts);
    return all.filter(p => p.isActive && p.currentStock <= p.reorderPoint);
  }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(spareParts).where(eq(spareParts.isActive, true));
    const lowStock = all.filter(p => p.currentStock <= p.reorderPoint).length;
    const critical = all.filter(p => p.isCritical).length;
    const totalValue = all.reduce((s, p) => s + (p.currentStock * Number(p.unitPrice || 0)), 0);
    return { total: all.length, lowStock, critical, totalValue: Math.round(totalValue) };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 9. Supplier Penalties
// ═══════════════════════════════════════════════════════════════
function getEscalationLevel(occurrenceCount: number): { level: number; type: "warning" | "fine" | "probation" | "suspension" | "blacklist" } {
  if (occurrenceCount >= 10) return { level: 5, type: "blacklist" };
  if (occurrenceCount >= 7) return { level: 4, type: "suspension" };
  if (occurrenceCount >= 5) return { level: 3, type: "probation" };
  if (occurrenceCount >= 3) return { level: 2, type: "fine" };
  return { level: 1, type: "warning" };
}

const supplierPenaltyRouter = router({
  list: publicProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      triggerType: z.string().optional(),
      isBlacklisted: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(supplierPenalties).orderBy(desc(supplierPenalties.createdAt));
      let filtered = items;
      if (input?.supplierId) filtered = filtered.filter(i => i.supplierId === input.supplierId);
      if (input?.triggerType) filtered = filtered.filter(i => i.triggerType === input.triggerType);
      if (input?.isBlacklisted !== undefined) filtered = filtered.filter(i => i.isBlacklisted === input.isBlacklisted);
      if (input?.isActive !== undefined) filtered = filtered.filter(i => i.isActive === input.isActive);
      return { items: filtered, total: filtered.length };
    }),

  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(supplierPenalties).where(eq(supplierPenalties.id, toNum(input.id)));
    return item ?? null;
  }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      supplierName: z.string().optional(),
      triggerType: z.enum(["quality_reject", "late_delivery", "missing_report", "safety_violation"]),
      triggerReferenceId: z.number().optional(),
      triggerReferenceType: z.string().optional(),
      description: z.string().optional(),
      fineAmount: z.string().optional(),
      correctiveActionRequired: z.boolean().optional(),
      correctiveActionDeadline: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Count existing active penalties for auto-escalation
      const existing = await db.select().from(supplierPenalties)
        .where(and(eq(supplierPenalties.supplierId, input.supplierId), eq(supplierPenalties.isActive, true)));
      const occurrenceCount = existing.length + 1;
      const escalation = getEscalationLevel(occurrenceCount);

      const [penalty] = await db.insert(supplierPenalties).values({
        penaltyCode: generateCode("PEN"),
        ...input,
        penaltyType: escalation.type,
        occurrenceCount,
        escalationLevel: escalation.level,
        correctiveActionRequired: input.correctiveActionRequired ?? occurrenceCount >= 3,
        isBlacklisted: occurrenceCount >= 10,
        blacklistEffectiveDate: occurrenceCount >= 10 ? new Date().toISOString().split("T")[0] : undefined,
      }).returning();
      return { penalty, escalation, occurrenceCount };
    }),

  resolve: protectedProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      resolvedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(supplierPenalties).set({
        isActive: false,
        resolvedAt: new Date().toISOString(),
        resolvedBy: input.resolvedBy,
        updatedAt: new Date().toISOString(),
      }).where(eq(supplierPenalties.id, toNum(input.id))).returning();
      return updated;
    }),

  supplierScorecard: publicProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const penalties = await db.select().from(supplierPenalties)
        .where(eq(supplierPenalties.supplierId, input.supplierId));

      const inspections = await db.select().from(incomingInspectionRecords)
        .where(eq(incomingInspectionRecords.supplierId, input.supplierId));

      const totalInspections = inspections.length;
      const passedInspections = inspections.filter(i => i.inspectionResult === "PASS").length;
      const qualityRate = totalInspections > 0 ? passedInspections / totalInspections : 1;
      const activePenalties = penalties.filter(p => p.isActive).length;
      const penaltyScore = Math.min(activePenalties / 10, 1);

      // Composite score: quality_rate × 0.4 + delivery_rate × 0.3 + (1 - penalty_score) × 0.3
      const deliveryRate = 1; // Placeholder until delivery tracking is wired
      const compositeScore = Math.round((qualityRate * 40 + deliveryRate * 30 + (1 - penaltyScore) * 30));

      return {
        supplierId: input.supplierId,
        qualityRate: Math.round(qualityRate * 100),
        deliveryRate: Math.round(deliveryRate * 100),
        penaltyScore: Math.round(penaltyScore * 100),
        compositeScore,
        totalInspections,
        passedInspections,
        activePenalties,
        totalPenalties: penalties.length,
        isBlacklisted: penalties.some(p => p.isBlacklisted),
        riskLevel: compositeScore >= 80 ? "low" : compositeScore >= 60 ? "medium" : compositeScore >= 40 ? "high" : "critical",
      };
    }),

  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(supplierPenalties);
    const active = all.filter(p => p.isActive).length;
    const blacklisted = all.filter(p => p.isBlacklisted).length;
    const byType = { quality_reject: 0, late_delivery: 0, missing_report: 0, safety_violation: 0 } as Record<string, number>;
    all.forEach(p => { byType[p.triggerType] = (byType[p.triggerType] || 0) + 1; });
    return { total: all.length, active, resolved: all.length - active, blacklisted, byType };
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(supplierPenalties).where(eq(supplierPenalties.id, toNum(input.id)));
    return { success: true };
  }),
});

// ═══════════════════════════════════════════════════════════════
// 10. Traceability Graph
// ═══════════════════════════════════════════════════════════════
const traceabilityRouter = router({
  // Forward trace: from entity → all downstream
  forward: publicProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
      maxDepth: z.number().default(5),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const visited = new Set<string>();
      const edges: any[] = [];

      async function traverse(type: string, id: number, depth: number) {
        if (depth <= 0 || visited.has(`${type}:${id}`)) return;
        visited.add(`${type}:${id}`);
        const found = await db.select().from(traceabilityGraphEdges)
          .where(and(
            eq(traceabilityGraphEdges.fromEntityType, type),
            eq(traceabilityGraphEdges.fromEntityId, id),
          ));
        for (const edge of found) {
          edges.push(edge);
          await traverse(edge.toEntityType, edge.toEntityId, depth - 1);
        }
      }

      await traverse(input.entityType, input.entityId, input.maxDepth);
      return { root: { type: input.entityType, id: input.entityId }, edges, nodeCount: visited.size };
    }),

  // Backward trace: from entity → all upstream
  backward: publicProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
      maxDepth: z.number().default(5),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const visited = new Set<string>();
      const edges: any[] = [];

      async function traverse(type: string, id: number, depth: number) {
        if (depth <= 0 || visited.has(`${type}:${id}`)) return;
        visited.add(`${type}:${id}`);
        const found = await db.select().from(traceabilityGraphEdges)
          .where(and(
            eq(traceabilityGraphEdges.toEntityType, type),
            eq(traceabilityGraphEdges.toEntityId, id),
          ));
        for (const edge of found) {
          edges.push(edge);
          await traverse(edge.fromEntityType, edge.fromEntityId, depth - 1);
        }
      }

      await traverse(input.entityType, input.entityId, input.maxDepth);
      return { root: { type: input.entityType, id: input.entityId }, edges, nodeCount: visited.size };
    }),

  // Project-level trace graph
  projectGraph: publicProcedure
    .input(z.object({ projectNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const edges = await db.select().from(traceabilityGraphEdges)
        .where(eq(traceabilityGraphEdges.projectNumber, input.projectNumber));
      // Build unique nodes
      const nodes = new Set<string>();
      edges.forEach(e => {
        nodes.add(`${e.fromEntityType}:${e.fromEntityId}`);
        nodes.add(`${e.toEntityType}:${e.toEntityId}`);
      });
      return { projectNumber: input.projectNumber, edges, nodeCount: nodes.size };
    }),

  // Dashboard overview stats
  stats: publicProcedure.query(async () => {
    const db = await requireDb();
    const all = await db.select().from(traceabilityGraphEdges);
    const byType = new Map<string, number>();
    all.forEach(e => {
      byType.set(e.relationshipType, (byType.get(e.relationshipType) || 0) + 1);
    });
    const nodes = new Set<string>();
    all.forEach(e => {
      nodes.add(`${e.fromEntityType}:${e.fromEntityId}`);
      nodes.add(`${e.toEntityType}:${e.toEntityId}`);
    });
    return {
      totalEdges: all.length,
      totalNodes: nodes.size,
      byRelationshipType: Object.fromEntries(byType),
    };
  }),
});

// ═══════════════════════════════════════════════════════════════
// Combined Export
// ═══════════════════════════════════════════════════════════════
export const supplyChainRouter = router({
  label: supplierLabelRouter,
  inspection: incomingInspectionRouter,
  bomScan: assemblyBomScanRouter,
  labor: laborConfirmationRouter,
  complaint: customerComplaintRouter,
  maintenance: maintenanceRouter,
  scrap: scrapDisposalRouter,
  sparePart: sparePartsRouter,
  penalty: supplierPenaltyRouter,
  trace: traceabilityRouter,

  // Unified dashboard stats
  dashboardStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const [inspections, scans, complaints, penalties, parts, scraps] = await Promise.all([
      db.select().from(incomingInspectionRecords),
      db.select().from(assemblyBomScanLogs),
      db.select().from(customerQualityComplaints),
      db.select().from(supplierPenalties),
      db.select().from(spareParts),
      db.select().from(scrapDisposalRecords),
    ]);

    const iqcTotal = inspections.length;
    const iqcPass = inspections.filter(i => i.inspectionResult === "PASS").length;
    const iqcPending = inspections.filter(i => i.inspectionResult === "PENDING").length;

    const bomTotal = scans.length;
    const bomMatch = scans.filter(s => s.bomMatchResult === "MATCH").length;

    const openComplaints = complaints.filter(c => c.status === "open" || c.status === "investigating").length;
    const criticalComplaints = complaints.filter(c => c.severity === "critical").length;

    const activePenalties = penalties.filter(p => p.isActive).length;
    const blacklisted = penalties.filter(p => p.isBlacklisted).length;

    const lowStockParts = parts.filter(p => p.isActive && p.currentStock <= p.reorderPoint).length;
    const totalScrapCost = scraps.reduce((s, r) => s + Number(r.totalScrapCost || 0), 0);

    return {
      iqc: {
        total: iqcTotal,
        passRate: iqcTotal - iqcPending > 0 ? Math.round((iqcPass / (iqcTotal - iqcPending)) * 100) : 0,
        pending: iqcPending,
      },
      bomScan: {
        total: bomTotal,
        matchRate: bomTotal > 0 ? Math.round((bomMatch / bomTotal) * 100) : 0,
      },
      complaints: {
        total: complaints.length,
        open: openComplaints,
        critical: criticalComplaints,
      },
      penalties: {
        active: activePenalties,
        blacklisted,
      },
      spareParts: {
        lowStock: lowStockParts,
      },
      scrap: {
        total: scraps.length,
        totalCost: Math.round(totalScrapCost),
      },
    };
  }),
});
