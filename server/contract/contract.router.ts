/**
 * Contract Router - Contract Management tRPC endpoints
 *
 * Endpoints:
 * - contract.list / getById / create / update / delete / stats
 * - contract.uploadDocument / getDocuments / deleteDocument
 * - contract.analyzeDocument / getAnalysis / getAnalysesByContract / applyAnalysis
 */

import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { z } from "zod";
import {
  listContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  getContractStats,
  convertContractToProject,
  uploadDocument,
  getDocuments,
  deleteDocument,
  analyzeDocument,
  getAnalysis,
  getAnalysesByContract,
  applyAnalysis,
} from "./contract.service";

export const contractRouter = router({
  // ============================================================
  // P0: Contract CRUD
  // ============================================================

  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          customerId: z.number().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listContracts(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getContractById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        opportunityId: z.number().optional(),
        title: z.string().min(1),
        type: z.enum(["sales", "service", "framework"]).optional(),
        amount: z.string().optional(),
        currency: z.string().optional(),
        status: z
          .enum(["draft", "pending_approval", "active", "completed", "terminated"])
          .optional(),
        signDate: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        terms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createContract({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        customerId: z.number().optional(),
        opportunityId: z.number().optional(),
        title: z.string().min(1).optional(),
        type: z.enum(["sales", "service", "framework"]).optional(),
        amount: z.string().optional(),
        currency: z.string().optional(),
        status: z
          .enum(["draft", "pending_approval", "active", "completed", "terminated"])
          .optional(),
        signDate: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        terms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateContract(id, data);
    }),

  delete: requirePermission('crm:contracts:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteContract(input.id);
    }),

  stats: protectedProcedure.query(async () => {
    return getContractStats();
  }),

  // ============================================================
  // W2-05: Sign Contract → Auto-Create Project
  // ============================================================

  signContract: requirePermission('crm:contracts:manage')
    .input(
      z.object({
        id: z.number(),
        pm: z.number().optional(),
        signDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Validate contract status
      const existing = await getContractById(input.id);
      if (!existing) throw new Error(`合同 ${input.id} 不存在`);
      if (["active", "completed", "terminated"].includes(existing.status)) {
        throw new Error(`合同当前状态为 '${existing.status}'，无法签署`);
      }

      // 2. Update contract to active
      const contract = await updateContract(input.id, {
        status: "active",
        signDate: input.signDate || new Date().toISOString().split("T")[0],
      });

      // 3. Auto-create project
      const project = await convertContractToProject(input.id, input.pm);

      return {
        contract,
        project,
        message: `合同已签署，项目 ${project.projectCode} 已自动创建`,
      };
    }),

  // ============================================================
  // P1: Document Upload & Management
  // ============================================================

  uploadDocument: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
        fileName: z.string().min(1),
        mimeType: z.string(),
        docType: z.enum([
          "tech_spec",
          "bidding_req",
          "equipment_spec",
          "order",
          "contract",
          "other",
        ]),
        fileBase64: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return uploadDocument({ ...input, uploadedBy: ctx.user.id });
    }),

  getDocuments: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
        docType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getDocuments(input.contractId, input.docType);
    }),

  deleteDocument: requirePermission('crm:contracts:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteDocument(input.id);
    }),

  // ============================================================
  // P2: AI Document Analysis
  // ============================================================

  analyzeDocument: requirePermission('crm:contracts:manage')
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      return analyzeDocument(input.documentId);
    }),

  getAnalysis: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getAnalysis(input.documentId);
    }),

  getAnalysesByContract: protectedProcedure
    .input(z.object({ contractId: z.number() }))
    .query(async ({ input }) => {
      return getAnalysesByContract(input.contractId);
    }),

  applyAnalysis: requirePermission('crm:contracts:manage')
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return applyAnalysis(input.analysisId, ctx.user.id);
    }),
});
