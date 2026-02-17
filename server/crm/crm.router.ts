/**
 * CRM Router - Customer Relationship Management tRPC endpoints
 *
 * Namespaced endpoints:
 * - crm.customers.*  (list, getById, create, update, stats)
 * - crm.contacts.*   (list, create, update)
 * - crm.opportunities.* (list, getById, create, update, stats, funnel, convertToProject)
 * - crm.leads.*      (list, create, update, updateStatus, convertToCustomer)
 * - crm.interactions.* (list, create, resolve, stats)
 */

import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getCustomerStats,
  listContacts,
  createContact,
  updateContact,
  listOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  getOpportunityStats,
  getPipelineFunnel,
  convertOpportunityToProject,
  listLeads,
  createLead,
  updateLeadStatus,
  convertLeadToCustomer,
  listInteractions,
  createInteraction,
  getInteractionStats,
  resolveInteraction,
} from "./crm.service";

// ============================================================
// Customers Router
// ============================================================

const customersRouter = router({
  /** List customers with search, type, level filters */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          type: z.string().optional(),
          level: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listCustomers(input ?? {});
    }),

  /** Get a single customer by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCustomerById(input.id);
    }),

  /** Create a new customer */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        shortName: z.string().optional(),
        type: z.enum(["prospect", "customer", "partner"]).optional(),
        level: z.enum(["A", "B", "C", "D"]).optional(),
        industry: z.string().optional(),
        region: z.string().optional(),
        address: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        taxId: z.string().optional(),
        annualRevenue: z.string().optional(),
        employeeCount: z.number().optional(),
        source: z
          .enum(["exhibition", "website", "referral", "cold_call", "community"])
          .optional(),
        assignedTo: z.number().optional(),
        status: z.enum(["active", "inactive", "blacklisted"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createCustomer(input);
    }),

  /** Update an existing customer */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        shortName: z.string().optional(),
        type: z.enum(["prospect", "customer", "partner"]).optional(),
        level: z.enum(["A", "B", "C", "D"]).optional(),
        industry: z.string().optional(),
        region: z.string().optional(),
        address: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        taxId: z.string().optional(),
        annualRevenue: z.string().optional(),
        employeeCount: z.number().optional(),
        source: z
          .enum(["exhibition", "website", "referral", "cold_call", "community"])
          .optional(),
        assignedTo: z.number().optional(),
        status: z.enum(["active", "inactive", "blacklisted"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateCustomer(id, data);
    }),

  /** Get customer statistics by type and level */
  stats: protectedProcedure.query(async () => {
    return getCustomerStats();
  }),
});

// ============================================================
// Contacts Router
// ============================================================

const contactsRouter = router({
  /** List contacts with optional customer filter */
  list: protectedProcedure
    .input(
      z
        .object({
          customerId: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(200).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listContacts(input ?? {});
    }),

  /** Create a new contact */
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        name: z.string().min(1),
        position: z.string().optional(),
        department: z.string().optional(),
        mobile: z.string().optional(),
        landline: z.string().optional(),
        email: z.string().optional(),
        wechat: z.string().optional(),
        isKeyPerson: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createContact(input);
    }),

  /** Update an existing contact */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        position: z.string().optional(),
        department: z.string().optional(),
        mobile: z.string().optional(),
        landline: z.string().optional(),
        email: z.string().optional(),
        wechat: z.string().optional(),
        isKeyPerson: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateContact(id, data);
    }),
});

// ============================================================
// Opportunities Router
// ============================================================

const opportunitiesRouter = router({
  /** List opportunities with search, stage, customer filters */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          stage: z.string().optional(),
          customerId: z.number().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listOpportunities(input ?? {});
    }),

  /** Get a single opportunity by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getOpportunityById(input.id);
    }),

  /** Create a new opportunity */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        customerId: z.number(),
        contactId: z.number().optional(),
        stage: z
          .enum([
            "qualification",
            "needs_analysis",
            "proposal",
            "negotiation",
            "closed_won",
            "closed_lost",
          ])
          .optional(),
        expectedAmount: z.string().optional(),
        currency: z.string().optional(),
        probability: z.number().min(0).max(100).optional(),
        expectedCloseDate: z.string().optional(),
        productInterest: z.string().optional(),
        competitorInfo: z.string().optional(),
        assignedTo: z.number().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createOpportunity(input);
    }),

  /** Update an opportunity (handles stage transition to closed_won) */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        customerId: z.number().optional(),
        contactId: z.number().optional(),
        stage: z
          .enum([
            "qualification",
            "needs_analysis",
            "proposal",
            "negotiation",
            "closed_won",
            "closed_lost",
          ])
          .optional(),
        expectedAmount: z.string().optional(),
        currency: z.string().optional(),
        probability: z.number().min(0).max(100).optional(),
        expectedCloseDate: z.string().optional(),
        actualCloseDate: z.string().optional(),
        productInterest: z.string().optional(),
        competitorInfo: z.string().optional(),
        lostReason: z.string().optional(),
        assignedTo: z.number().optional(),
        projectId: z.number().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateOpportunity(id, data);
    }),

  /** Get opportunity statistics */
  stats: protectedProcedure.query(async () => {
    return getOpportunityStats();
  }),

  /** Get pipeline funnel data for visualization */
  funnel: protectedProcedure.query(async () => {
    return getPipelineFunnel();
  }),

  /** Convert a won opportunity into an M0 project */
  convertToProject: protectedProcedure
    .input(z.object({ id: z.number(), pm: z.number().optional() }))
    .mutation(async ({ input }) => {
      return convertOpportunityToProject(input.id, input.pm);
    }),
});

// ============================================================
// Leads Router
// ============================================================

const leadsRouter = router({
  /** List leads with status, priority, search filters */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          priority: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(200).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listLeads(input ?? {});
    }),

  /** Create a new lead */
  create: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        source: z
          .enum([
            "exhibition",
            "website",
            "referral",
            "cold_call",
            "community",
            "ai_identified",
          ])
          .optional(),
        productInterest: z.string().optional(),
        estimatedBudget: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        status: z
          .enum(["new", "contacted", "qualified", "converted", "lost"])
          .optional(),
        aiConfidenceScore: z.string().optional(),
        assignedTo: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createLead(input);
    }),

  /** Update a lead (general update) */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        companyName: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        source: z.string().optional(),
        productInterest: z.string().optional(),
        estimatedBudget: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        assignedTo: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      // For general updates, use updateLeadStatus with current status or use db directly
      // This is a simplified approach - for full updates we'd need a dedicated updateLead function
      // For now, the primary use case is status updates via updateStatus
      const { requireDb } = await import("../db");
      const { crmLeads } = await import("../../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = await requireDb();
      const updateData: any = { ...data, updatedAt: sql`now()` };
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) delete updateData[key];
      });
      const result = await db
        .update(crmLeads)
        .set(updateData)
        .where(eq(crmLeads.id, id))
        .returning();
      return result[0] ?? null;
    }),

  /** Update lead status */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "lost"]),
      })
    )
    .mutation(async ({ input }) => {
      return updateLeadStatus(input.id, input.status);
    }),

  /** Convert a lead to customer + opportunity */
  convertToCustomer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return convertLeadToCustomer(input.id);
    }),
});

// ============================================================
// Interactions Router
// ============================================================

const interactionsRouter = router({
  /** List interactions with filters (customerId, type, isComplaint) */
  list: protectedProcedure
    .input(
      z
        .object({
          customerId: z.number().optional(),
          opportunityId: z.number().optional(),
          type: z
            .enum(["call", "email", "visit", "complaint", "meeting", "wechat"])
            .optional(),
          isComplaint: z.boolean().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listInteractions(input ?? {});
    }),

  /** Create a new interaction */
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        opportunityId: z.number().optional(),
        type: z.enum(["call", "email", "visit", "complaint", "meeting", "wechat"]),
        subject: z.string().min(1).max(300),
        content: z.string().optional(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        isComplaint: z.boolean().optional(),
        complaintSeverity: z.enum(["low", "medium", "high", "critical"]).optional(),
        resolution: z.string().optional(),
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return createInteraction(input);
    }),

  /** Resolve a complaint interaction */
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        resolution: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return resolveInteraction(input.id, input.resolution);
    }),

  /** Get interaction statistics for a customer */
  stats: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return getInteractionStats(input.customerId);
    }),
});

// ============================================================
// Combined CRM Router
// ============================================================

export const crmRouter = router({
  customers: customersRouter,
  contacts: contactsRouter,
  opportunities: opportunitiesRouter,
  leads: leadsRouter,
  interactions: interactionsRouter,

  /** Seed CRM test data (admin only) */
  seedData: adminProcedure.mutation(async () => {
    const { seedCrmData } = await import("../seed-crm");
    const result = await seedCrmData();
    return result;
  }),
});
