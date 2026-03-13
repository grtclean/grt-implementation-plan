/**
 * FAT/SAT tRPC Router
 *
 * Task #56 - FAT/SAT backend persistence with new tables and router.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import {
  createTestPlan,
  getTestPlan,
  listTestPlans,
  updateTestPlanStatus,
  addTestItem,
  updateTestItem,
  getTestItems,
  batchUpdateTestItems,
  addChecklist,
  updateChecklist,
  getChecklists,
  addSignoff,
  updateSignoff,
  getSignoffs,
  addSiteCondition,
  updateSiteCondition,
  getSiteConditions,
  getTestPlanSummary,
  initializeSATTemplate,
} from "./fat-sat.service";

// ============================================================
// Input Schemas
// ============================================================

const createPlanSchema = z.object({
  projectId: z.number(),
  planType: z.enum(["FAT", "SAT"]),
  planName: z.string().min(1),
  equipmentModel: z.string().optional(),
  customerName: z.string().optional(),
  testLocation: z.string().optional(),
  plannedDate: z.string().optional(),
});

const addTestItemSchema = z.object({
  planId: z.number(),
  category: z.string().min(1),
  itemName: z.string().min(1),
  specification: z.string().optional(),
  passCriteria: z.string().optional(),
  unit: z.string().optional(),
  sortOrder: z.number().optional(),
});

const updateTestItemSchema = z.object({
  id: z.number(),
  actualValue: z.string().optional(),
  result: z.enum(["pending", "passed", "failed", "conditional"]).optional(),
  testerId: z.number().optional(),
  testerName: z.string().optional(),
  notes: z.string().optional(),
});
const batchUpdateTestItemsSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    actualValue: z.string().optional(),
    result: z.enum(["pending", "passed", "failed", "conditional"]).optional(),
    testerId: z.number().optional(),
    testerName: z.string().optional(),
    notes: z.string().optional(),
  })),
});

const addChecklistSchema = z.object({
  planId: z.number(),
  category: z.string().min(1),
  itemName: z.string().min(1),
  responsiblePerson: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().optional(),
});

const updateChecklistSchema = z.object({
  id: z.number(),
  isCompleted: z.boolean().optional(),
  responsiblePerson: z.string().optional(),
  notes: z.string().optional(),
});

const addSignoffSchema = z.object({
  planId: z.number(),
  stepOrder: z.number(),
  stepName: z.string().min(1),
  signerRole: z.string().min(1),
  signerName: z.string().optional(),
});

const updateSignoffSchema = z.object({
  id: z.number(),
  status: z.enum(["pending", "approved", "rejected"]),
  signerName: z.string().optional(),
  comment: z.string().optional(),
  signatureUrl: z.string().optional(),
});

const addSiteConditionSchema = z.object({
  planId: z.number(),
  conditionType: z.string().min(1),
  conditionName: z.string().min(1),
  expectedValue: z.string().optional(),
  unit: z.string().optional(),
});

const updateSiteConditionSchema = z.object({
  id: z.number(),
  actualValue: z.string().optional(),
  isWithinSpec: z.boolean().optional(),
  notes: z.string().optional(),
  measuredBy: z.string().optional(),
});

const initSATSchema = z.object({
  projectId: z.number(),
  planName: z.string().min(1),
  equipmentModel: z.string().optional(),
  customerName: z.string().optional(),
  testLocation: z.string().optional(),
  plannedDate: z.string().optional(),
});
// ============================================================
// Router Definition
// ============================================================

export const fatSatRouter = router({
  plans: router({
    create: requirePermission('mfg:fat:manage')
      .input(createPlanSchema)
      .mutation(async ({ input }) => {
        const plannedDate = input.plannedDate ? new Date(input.plannedDate) : undefined;
        return await createTestPlan({ ...input, plannedDate });
      }),

    get: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return await getTestPlan(input.planId);
      }),

    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        planType: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await listTestPlans(input);
      }),

    updateStatus: requirePermission('mfg:fat:manage')
      .input(z.object({
        planId: z.number(),
        status: z.enum(["draft", "in_progress", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        return await updateTestPlanStatus(input.planId, input.status);
      }),
  }),

  testItems: router({
    add: requirePermission('mfg:fat:manage')
      .input(addTestItemSchema)
      .mutation(async ({ input }) => {
        return await addTestItem(input);
      }),

    update: requirePermission('mfg:fat:manage')
      .input(updateTestItemSchema)
      .mutation(async ({ input }) => {
        return await updateTestItem(input);
      }),

    list: protectedProcedure
      .input(z.object({
        planId: z.number(),
        category: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getTestItems(input.planId, input.category);
      }),

    batchUpdate: requirePermission('mfg:fat:manage')
      .input(batchUpdateTestItemsSchema)
      .mutation(async ({ input }) => {
        return await batchUpdateTestItems(input);
      }),
  }),

  checklists: router({
    add: requirePermission('mfg:fat:manage')
      .input(addChecklistSchema)
      .mutation(async ({ input }) => {
        return await addChecklist(input);
      }),

    update: requirePermission('mfg:fat:manage')
      .input(updateChecklistSchema)
      .mutation(async ({ input }) => {
        return await updateChecklist(input);
      }),

    list: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return await getChecklists(input.planId);
      }),
  }),
  signoffs: router({
    add: requirePermission('mfg:fat:manage')
      .input(addSignoffSchema)
      .mutation(async ({ input }) => {
        return await addSignoff(input);
      }),

    update: requirePermission('mfg:fat:manage')
      .input(updateSignoffSchema)
      .mutation(async ({ input }) => {
        return await updateSignoff(input);
      }),

    list: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return await getSignoffs(input.planId);
      }),
  }),

  siteConditions: router({
    add: requirePermission('mfg:fat:manage')
      .input(addSiteConditionSchema)
      .mutation(async ({ input }) => {
        return await addSiteCondition(input);
      }),

    update: requirePermission('mfg:fat:manage')
      .input(updateSiteConditionSchema)
      .mutation(async ({ input }) => {
        return await updateSiteCondition(input);
      }),

    list: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return await getSiteConditions(input.planId);
      }),
  }),

  summary: router({
    get: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return await getTestPlanSummary(input.planId);
      }),
  }),

  templates: router({
    initSAT: requirePermission('mfg:fat:manage')
      .input(initSATSchema)
      .mutation(async ({ input }) => {
        const plannedDate = input.plannedDate ? new Date(input.plannedDate) : undefined;
        return await initializeSATTemplate({ ...input, plannedDate });
      }),
  }),
});