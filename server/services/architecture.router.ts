/**
 * Architecture Router
 *
 * tRPC router for schema architecture improvements.
 * Tasks #63, #64, #65, #67, #77
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import {
  syncUnifiedProjects,
  listUnifiedProjects,
  registerFKConstraint,
  listFKConstraints,
  migrateJsonTasks,
  migrateJsonAuditLog,
  syncCustomerMaster,
  listCustomerMaster,
  listExtendedChecklist,
  createExtendedChecklistItem,
  updateExtendedChecklistItem,
  deleteExtendedChecklistItem,
} from "./architecture.service";

// ============================================================
// Input Schemas
// ============================================================

const unifiedProjectFiltersSchema = z.object({
  sourceTable: z.enum(["v1", "v2"]).optional(),
  status: z.string().optional(),
  currentStage: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional(),
});

const fkConstraintInputSchema = z.object({
  sourceTable: z.string().min(1),
  sourceColumn: z.string().min(1),
  targetTable: z.string().min(1),
  targetColumn: z.string().min(1),
  constraintName: z.string().optional(),
  isEnforced: z.boolean().optional(),
});

const fkConstraintFiltersSchema = z.object({
  sourceTable: z.string().optional(),
  targetTable: z.string().optional(),
}).optional();

const stageIdSchema = z.object({
  stageId: z.number().int().positive(),
});

const customerMasterFiltersSchema = z.object({
  search: z.string().optional(),
  tier: z.string().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(200).optional(),
  offset: z.number().min(0).optional(),
});

const extendedChecklistInputSchema = z.object({
  stageCode: z.string().min(1).max(10),
  category: z.string().min(1).max(100),
  itemName: z.string().min(1).max(500),
  description: z.string().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  isRequired: z.boolean().optional(),
  passCriteria: z.string().optional(),
  applicableEquipmentTypes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const extendedChecklistUpdateSchema = z.object({
  id: z.number().int().positive(),
  stageCode: z.string().min(1).max(10).optional(),
  category: z.string().min(1).max(100).optional(),
  itemName: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  isRequired: z.boolean().optional(),
  passCriteria: z.string().optional(),
  applicableEquipmentTypes: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Sub-Routers
// ============================================================

const unifiedProjectsRouter = router({
  sync: publicProcedure.mutation(async () => {
    return syncUnifiedProjects();
  }),
  list: publicProcedure.input(unifiedProjectFiltersSchema).query(async ({ input }) => {
    return listUnifiedProjects(input);
  }),
});

const fkConstraintsRouter = router({
  register: publicProcedure.input(fkConstraintInputSchema).mutation(async ({ input }) => {
    return registerFKConstraint(input);
  }),
  list: publicProcedure.input(fkConstraintFiltersSchema).query(async ({ input }) => {
    return listFKConstraints(input);
  }),
});

const jsonMigrationRouter = router({
  migrateTasks: publicProcedure.input(stageIdSchema).mutation(async ({ input }) => {
    return migrateJsonTasks(input.stageId);
  }),
  migrateAuditLog: publicProcedure.input(stageIdSchema).mutation(async ({ input }) => {
    return migrateJsonAuditLog(input.stageId);
  }),
});

const customerMasterRouter = router({
  sync: publicProcedure.mutation(async () => {
    return syncCustomerMaster();
  }),
  list: publicProcedure.input(customerMasterFiltersSchema).query(async ({ input }) => {
    return listCustomerMaster(input);
  }),
});

const extendedChecklistRouter = router({
  list: publicProcedure
    .input(z.object({ stageCode: z.string().optional() }))
    .query(async ({ input }) => {
      return listExtendedChecklist(input.stageCode);
    }),
  create: publicProcedure.input(extendedChecklistInputSchema).mutation(async ({ input }) => {
    return createExtendedChecklistItem(input);
  }),
  update: publicProcedure.input(extendedChecklistUpdateSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return updateExtendedChecklistItem(id, data);
  }),
  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return deleteExtendedChecklistItem(input.id);
    }),
});

// ============================================================
// Main Architecture Router
// ============================================================

export const architectureRouter = router({
  unifiedProjects: unifiedProjectsRouter,
  fkConstraints: fkConstraintsRouter,
  jsonMigration: jsonMigrationRouter,
  customerMaster: customerMasterRouter,
  extendedChecklist: extendedChecklistRouter,
});
