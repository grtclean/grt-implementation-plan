/**
 * CRM Service - Customer Relationship Management
 *
 * Core functions:
 * 1. Customer CRUD with auto-code generation
 * 2. Contact management per customer
 * 3. Opportunity pipeline management
 * 4. Lead capture and conversion
 */

import { requireDb } from "../db";
import {
  crmCustomersV2,
  crmContactsV2,
  crmOpportunitiesV2,
  crmLeads,
  crmInteractions,
} from "../../drizzle/schema";
import { eq, ilike, and, desc, sql, or } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("crm");

// ============================================================
// Customers
// ============================================================

/**
 * List customers with pagination and filters
 */
export async function listCustomers(params: {
  search?: string;
  type?: string;
  level?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { search, type, level, status, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (type) conditions.push(eq(crmCustomersV2.type, type));
  if (level) conditions.push(eq(crmCustomersV2.level, level));
  if (status) conditions.push(eq(crmCustomersV2.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(crmCustomersV2.name, `%${search}%`),
        ilike(crmCustomersV2.code, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(crmCustomersV2)
    .where(where)
    .orderBy(desc(crmCustomersV2.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmCustomersV2)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

/**
 * Get a single customer by ID
 */
export async function getCustomerById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(crmCustomersV2)
    .where(eq(crmCustomersV2.id, id))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Create a new customer with auto-generated code (CUS-001, CUS-002, ...)
 */
export async function createCustomer(data: {
  name: string;
  shortName?: string;
  type?: string;
  level?: string;
  industry?: string;
  region?: string;
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  annualRevenue?: string;
  employeeCount?: number;
  source?: string;
  assignedTo?: number;
  status?: string;
  notes?: string;
}) {
  const db = await requireDb();

  // Auto-generate customer code
  const maxCodeResult = await db
    .select({ maxCode: sql<string>`MAX(code)` })
    .from(crmCustomersV2);

  let nextNumber = 1;
  const maxCode = maxCodeResult[0]?.maxCode;
  if (maxCode) {
    const match = maxCode.match(/CUS-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  const code = `CUS-${String(nextNumber).padStart(3, "0")}`;

  const insertData: any = {
    code,
    name: data.name,
    type: data.type || "prospect",
    level: data.level || "C",
    status: data.status || "active",
  };

  // Only include optional fields when they have actual values
  if (data.shortName) insertData.shortName = data.shortName;
  if (data.industry) insertData.industry = data.industry;
  if (data.region) insertData.region = data.region;
  if (data.address) insertData.address = data.address;
  if (data.website) insertData.website = data.website;
  if (data.phone) insertData.phone = data.phone;
  if (data.email) insertData.email = data.email;
  if (data.taxId) insertData.taxId = data.taxId;
  if (data.annualRevenue) insertData.annualRevenue = data.annualRevenue;
  if (data.employeeCount) insertData.employeeCount = data.employeeCount;
  if (data.source) insertData.source = data.source;
  if (data.assignedTo) insertData.assignedTo = data.assignedTo;
  if (data.notes) insertData.notes = data.notes;

  const result = await db
    .insert(crmCustomersV2)
    .values(insertData)
    .returning();

  return result[0];
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: number,
  data: {
    name?: string;
    shortName?: string;
    type?: string;
    level?: string;
    industry?: string;
    region?: string;
    address?: string;
    website?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    annualRevenue?: string;
    employeeCount?: number;
    source?: string;
    assignedTo?: number;
    status?: string;
    notes?: string;
  }
) {
  const db = await requireDb();

  const updateData: any = { ...data, updatedAt: sql`now()` };
  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(crmCustomersV2)
    .set(updateData)
    .where(eq(crmCustomersV2.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Get customer statistics: counts by type and level
 */
export async function getCustomerStats() {
  const db = await requireDb();

  const byType = await db
    .select({
      type: crmCustomersV2.type,
      count: sql<number>`count(*)::int`,
    })
    .from(crmCustomersV2)
    .where(eq(crmCustomersV2.status, "active"))
    .groupBy(crmCustomersV2.type);

  const byLevel = await db
    .select({
      level: crmCustomersV2.level,
      count: sql<number>`count(*)::int`,
    })
    .from(crmCustomersV2)
    .where(eq(crmCustomersV2.status, "active"))
    .groupBy(crmCustomersV2.level);

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmCustomersV2);

  return {
    total: totalResult[0]?.count ?? 0,
    byType,
    byLevel,
  };
}

// ============================================================
// Contacts
// ============================================================

/**
 * List contacts with optional filters
 */
export async function listContacts(params: {
  customerId?: number;
  search?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const { customerId, search, limit = 50 } = params;

  const conditions: any[] = [];
  if (customerId) conditions.push(eq(crmContactsV2.customerId, customerId));
  if (search) {
    conditions.push(
      or(
        ilike(crmContactsV2.name, `%${search}%`),
        ilike(crmContactsV2.email, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(crmContactsV2)
    .where(where)
    .orderBy(desc(crmContactsV2.createdAt))
    .limit(limit);

  return items;
}

/**
 * Create a new contact
 */
export async function createContact(data: {
  customerId: number;
  name: string;
  position?: string;
  department?: string;
  mobile?: string;
  landline?: string;
  email?: string;
  wechat?: string;
  isKeyPerson?: boolean;
  notes?: string;
}) {
  const db = await requireDb();

  const result = await db
    .insert(crmContactsV2)
    .values({
      customerId: data.customerId,
      name: data.name,
      position: data.position,
      department: data.department,
      mobile: data.mobile,
      landline: data.landline,
      email: data.email,
      wechat: data.wechat,
      isKeyPerson: data.isKeyPerson ?? false,
      notes: data.notes,
    })
    .returning();

  return result[0];
}

/**
 * Update an existing contact
 */
export async function updateContact(
  id: number,
  data: {
    name?: string;
    position?: string;
    department?: string;
    mobile?: string;
    landline?: string;
    email?: string;
    wechat?: string;
    isKeyPerson?: boolean;
    notes?: string;
  }
) {
  const db = await requireDb();

  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(crmContactsV2)
    .set(updateData)
    .where(eq(crmContactsV2.id, id))
    .returning();

  return result[0] ?? null;
}

// ============================================================
// Opportunities
// ============================================================

/**
 * List opportunities with pagination and filters
 */
export async function listOpportunities(params: {
  search?: string;
  stage?: string;
  customerId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { search, stage, customerId, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (stage) conditions.push(eq(crmOpportunitiesV2.stage, stage));
  if (customerId) conditions.push(eq(crmOpportunitiesV2.customerId, customerId));
  if (search) {
    conditions.push(ilike(crmOpportunitiesV2.name, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(crmOpportunitiesV2)
    .where(where)
    .orderBy(desc(crmOpportunitiesV2.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOpportunitiesV2)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunityById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(crmOpportunitiesV2)
    .where(eq(crmOpportunitiesV2.id, id))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(data: {
  name: string;
  customerId: number;
  contactId?: number;
  stage?: string;
  expectedAmount?: string;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  productInterest?: string;
  competitorInfo?: string;
  assignedTo?: number;
  source?: string;
  notes?: string;
}) {
  const db = await requireDb();

  const result = await db
    .insert(crmOpportunitiesV2)
    .values({
      name: data.name,
      customerId: data.customerId,
      contactId: data.contactId,
      stage: data.stage || "qualification",
      expectedAmount: data.expectedAmount,
      currency: data.currency || "CNY",
      probability: data.probability ?? 20,
      expectedCloseDate: data.expectedCloseDate,
      productInterest: data.productInterest,
      competitorInfo: data.competitorInfo,
      assignedTo: data.assignedTo,
      source: data.source,
      notes: data.notes,
    })
    .returning();

  return result[0];
}

/**
 * Update an opportunity. Returns a flag when stage transitions to closed_won
 * so the caller can trigger project creation.
 */
export async function updateOpportunity(
  id: number,
  data: {
    name?: string;
    customerId?: number;
    contactId?: number;
    stage?: string;
    expectedAmount?: string;
    currency?: string;
    probability?: number;
    expectedCloseDate?: string;
    actualCloseDate?: string;
    productInterest?: string;
    competitorInfo?: string;
    lostReason?: string;
    assignedTo?: number;
    projectId?: number;
    source?: string;
    notes?: string;
  }
) {
  const db = await requireDb();

  // Fetch current opportunity to detect stage transition
  const current = await db
    .select()
    .from(crmOpportunitiesV2)
    .where(eq(crmOpportunitiesV2.id, id))
    .limit(1);

  if (!current[0]) {
    return { opportunity: null, shouldCreateProject: false };
  }

  const previousStage = current[0].stage;

  // Auto-set probability on stage changes
  const updateData: any = { ...data, updatedAt: sql`now()` };
  if (data.stage === "closed_won") {
    updateData.probability = 100;
    if (!data.actualCloseDate) {
      updateData.actualCloseDate = new Date().toISOString().split("T")[0];
    }
  } else if (data.stage === "closed_lost") {
    updateData.probability = 0;
    if (!data.actualCloseDate) {
      updateData.actualCloseDate = new Date().toISOString().split("T")[0];
    }
  }

  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(crmOpportunitiesV2)
    .set(updateData)
    .where(eq(crmOpportunitiesV2.id, id))
    .returning();

  const shouldCreateProject =
    data.stage === "closed_won" && previousStage !== "closed_won";

  return {
    opportunity: result[0] ?? null,
    shouldCreateProject,
  };
}

/**
 * Get opportunity statistics: pipeline value, win rate, stage counts
 */
export async function getOpportunityStats() {
  const db = await requireDb();

  // Pipeline value (sum of expected_amount for open opportunities)
  const pipelineResult = await db
    .select({
      totalValue: sql<string>`COALESCE(SUM(expected_amount), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(crmOpportunitiesV2)
    .where(
      and(
        sql`stage NOT IN ('closed_won', 'closed_lost')`
      )
    );

  // Win rate
  const closedResult = await db
    .select({
      stage: crmOpportunitiesV2.stage,
      count: sql<number>`count(*)::int`,
    })
    .from(crmOpportunitiesV2)
    .where(
      or(
        eq(crmOpportunitiesV2.stage, "closed_won"),
        eq(crmOpportunitiesV2.stage, "closed_lost")
      )
    )
    .groupBy(crmOpportunitiesV2.stage);

  const wonCount = closedResult.find((r) => r.stage === "closed_won")?.count ?? 0;
  const lostCount = closedResult.find((r) => r.stage === "closed_lost")?.count ?? 0;
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  // Stage counts
  const stageCounts = await db
    .select({
      stage: crmOpportunitiesV2.stage,
      count: sql<number>`count(*)::int`,
      totalValue: sql<string>`COALESCE(SUM(expected_amount), 0)`,
    })
    .from(crmOpportunitiesV2)
    .groupBy(crmOpportunitiesV2.stage);

  return {
    pipelineValue: pipelineResult[0]?.totalValue ?? "0",
    pipelineCount: pipelineResult[0]?.count ?? 0,
    winRate,
    wonCount,
    lostCount,
    stageCounts,
  };
}

/**
 * Get pipeline funnel data: counts per stage for funnel visualization
 */
export async function getPipelineFunnel() {
  const db = await requireDb();

  const stages = [
    "qualification",
    "needs_analysis",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ];

  const result = await db
    .select({
      stage: crmOpportunitiesV2.stage,
      count: sql<number>`count(*)::int`,
      totalValue: sql<string>`COALESCE(SUM(expected_amount), 0)`,
    })
    .from(crmOpportunitiesV2)
    .groupBy(crmOpportunitiesV2.stage);

  // Return ordered by stage pipeline order
  return stages.map((stage) => {
    const found = result.find((r) => r.stage === stage);
    return {
      stage,
      count: found?.count ?? 0,
      totalValue: found?.totalValue ?? "0",
    };
  });
}

// ============================================================
// Leads
// ============================================================

/**
 * List leads with optional filters
 */
export async function listLeads(params: {
  status?: string;
  priority?: string;
  search?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const { status, priority, search, limit = 50 } = params;

  const conditions: any[] = [];
  if (status) conditions.push(eq(crmLeads.status, status));
  if (priority) conditions.push(eq(crmLeads.priority, priority));
  if (search) {
    conditions.push(
      or(
        ilike(crmLeads.companyName, `%${search}%`),
        ilike(crmLeads.contactName, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(crmLeads)
    .where(where)
    .orderBy(desc(crmLeads.createdAt))
    .limit(limit);

  return items;
}

/**
 * Create a new lead
 */
export async function createLead(data: {
  companyName: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  source?: string;
  productInterest?: string;
  estimatedBudget?: string;
  priority?: string;
  status?: string;
  aiConfidenceScore?: string;
  assignedTo?: number;
  notes?: string;
}) {
  const db = await requireDb();

  const result = await db
    .insert(crmLeads)
    .values({
      companyName: data.companyName,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      source: data.source,
      productInterest: data.productInterest,
      estimatedBudget: data.estimatedBudget,
      priority: data.priority || "medium",
      status: data.status || "new",
      aiConfidenceScore: data.aiConfidenceScore,
      assignedTo: data.assignedTo,
      notes: data.notes,
    })
    .returning();

  return result[0];
}

/**
 * Update lead status
 */
export async function updateLeadStatus(id: number, status: string) {
  const db = await requireDb();

  const result = await db
    .update(crmLeads)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(crmLeads.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * Convert a lead to customer + opportunity.
 * Creates a new customer record and an opportunity,
 * then updates the lead with the converted IDs.
 */
export async function convertLeadToCustomer(leadId: number) {
  const db = await requireDb();

  // Fetch the lead
  const leads = await db
    .select()
    .from(crmLeads)
    .where(eq(crmLeads.id, leadId))
    .limit(1);

  const lead = leads[0];
  if (!lead) {
    throw new Error(`Lead with id ${leadId} not found`);
  }
  if (lead.status === "converted") {
    throw new Error(`Lead ${leadId} has already been converted`);
  }

  // Create the customer
  const customer = await createCustomer({
    name: lead.companyName,
    type: "prospect",
    level: "C",
    source: lead.source ?? undefined,
    phone: lead.contactPhone ?? undefined,
    email: lead.contactEmail ?? undefined,
    assignedTo: lead.assignedTo ?? undefined,
    notes: `Converted from lead #${leadId}`,
  });

  // Create contact if we have contact info
  if (lead.contactName) {
    await createContact({
      customerId: customer.id,
      name: lead.contactName,
      mobile: lead.contactPhone ?? undefined,
      email: lead.contactEmail ?? undefined,
      isKeyPerson: true,
    });
  }

  // Create the opportunity
  const opportunity = await createOpportunity({
    name: `${lead.companyName} - New Opportunity`,
    customerId: customer.id,
    stage: "qualification",
    expectedAmount: lead.estimatedBudget ?? undefined,
    productInterest: lead.productInterest ?? undefined,
    source: lead.source ?? undefined,
    assignedTo: lead.assignedTo ?? undefined,
    notes: lead.notes
      ? `Converted from lead #${leadId}\n${lead.notes}`
      : `Converted from lead #${leadId}`,
  });

  // Update the lead with conversion info
  await db
    .update(crmLeads)
    .set({
      status: "converted",
      convertedCustomerId: customer.id,
      convertedOpportunityId: opportunity.id,
      updatedAt: sql`now()`,
    })
    .where(eq(crmLeads.id, leadId));

  return {
    lead: { ...lead, status: "converted", convertedCustomerId: customer.id, convertedOpportunityId: opportunity.id },
    customer,
    opportunity,
  };
}

// ============================================================
// Opportunity -> Project Conversion
// ============================================================

/**
 * Convert a won opportunity into an M0 project.
 *
 * Validates the opportunity exists and is in 'closed_won' stage,
 * creates a new project record in projects_v2, links it back
 * to the opportunity via projectId, and creates the M0-M12
 * stage records in project_stages_v2.
 */
export async function convertOpportunityToProject(opportunityId: number, pmId?: number) {
  const db = await requireDb();
  const { projectsV2, projectStagesV2 } = await import("../../drizzle/schema");

  // 1. Fetch the opportunity
  const opportunities = await db
    .select()
    .from(crmOpportunitiesV2)
    .where(eq(crmOpportunitiesV2.id, opportunityId))
    .limit(1);

  const opportunity = opportunities[0];
  if (!opportunity) {
    throw new Error(`Opportunity with id ${opportunityId} not found`);
  }

  if (opportunity.stage !== "closed_won") {
    throw new Error(
      `Opportunity ${opportunityId} is in stage '${opportunity.stage}', must be 'closed_won' to convert`
    );
  }

  if (opportunity.projectId) {
    throw new Error(
      `Opportunity ${opportunityId} is already linked to project ${opportunity.projectId}`
    );
  }

  // 2. Generate a project code (PRJ-YYYYMMDD-NNN)
  const today = new Date();
  const datePart = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("");

  const maxCodeResult = await db
    .select({ maxCode: sql<string>`MAX(project_code)` })
    .from(projectsV2);

  let nextSeq = 1;
  const maxCode = maxCodeResult[0]?.maxCode;
  if (maxCode) {
    const match = maxCode.match(/PRJ-\d{8}-(\d+)/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }
  const projectCode = `PRJ-${datePart}-${String(nextSeq).padStart(3, "0")}`;

  // 3. Create the project in projects_v2
  const projectName = `${opportunity.name} - Project`;

  const insertResult = await db
    .insert(projectsV2)
    .values({
      projectCode,
      projectName,
      customerId: opportunity.customerId,
      currentStage: "M0" as const,
      status: "Active" as const,
      pm: pmId,
      salesOwner: opportunity.assignedTo,
      budget: opportunity.expectedAmount ?? undefined,
      description: `Auto-created from CRM opportunity #${opportunityId}`,
    })
    .returning();

  const project = insertResult[0];

  // 4. Create M0-M12 stage records
  const stages = [
    "M0", "M1", "M2", "M3", "M4", "M5", "M6",
    "M7", "M8", "M9", "M10", "M11", "M12",
  ] as const;
  const stageNames: Record<string, string> = {
    M0: "立项启动",
    M1: "需求调研",
    M2: "方案设计",
    M3: "项目评审",
    M4: "设计冻结",
    M5: "详细设计",
    M6: "采购准备",
    M7: "生产制造",
    M8: "组装调试",
    M9: "测试验收",
    M10: "发货交付",
    M11: "现场安装",
    M12: "终验收",
  };

  for (const stageCode of stages) {
    await db.insert(projectStagesV2).values({
      projectId: project.id,
      stageCode,
      stageName: stageNames[stageCode],
      status: stageCode === "M0" ? ("InProgress" as const) : ("NotStarted" as const),
      completionPercent: 0,
    });
  }

  // 5. Link the project back to the opportunity
  await db
    .update(crmOpportunitiesV2)
    .set({ projectId: project.id, updatedAt: sql`now()` })
    .where(eq(crmOpportunitiesV2.id, opportunityId));

  // 6. P2: Back-link customer solution meetings to the newly created project
  // The customer_solution_meetings table is not in drizzle schema (uses raw SQL),
  // so we use raw SQL to update related_project_id for any meetings linked to this opportunity.
  try {
    await (db as any).execute(
      sql`UPDATE customer_solution_meetings
          SET related_project_id = ${String(project.id)}
          WHERE related_opportunity_id = ${String(opportunityId)}
            AND (related_project_id IS NULL OR related_project_id = '')`
    );
    log.info({ opportunityId, projectId: project.id }, "Back-linked customer_solution_meetings to project");
  } catch (error) {
    // Log but do not fail the conversion if the table doesn't exist or query fails
    // This may happen if customer_solution_meetings table has not been migrated yet
    log.warn({ err: error }, "Could not back-link customer_solution_meetings");
  }

  return project;
}

// ============================================================
// Interactions
// ============================================================

/**
 * List interactions with pagination and filters
 */
export async function listInteractions(params: {
  customerId?: number;
  opportunityId?: number;
  type?: string;
  isComplaint?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { customerId, opportunityId, type, isComplaint, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (customerId) conditions.push(eq(crmInteractions.customerId, customerId));
  if (opportunityId) conditions.push(eq(crmInteractions.opportunityId, opportunityId));
  if (type) conditions.push(eq(crmInteractions.type, type));
  if (isComplaint !== undefined) conditions.push(eq(crmInteractions.isComplaint, isComplaint));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(crmInteractions)
    .where(where)
    .orderBy(desc(crmInteractions.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmInteractions)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

/**
 * Create a new interaction.
 * If type === "complaint", auto-set isComplaint=true and sentiment="negative".
 */
export async function createInteraction(data: {
  customerId: number;
  opportunityId?: number;
  type: string;
  subject: string;
  content?: string;
  sentiment?: string;
  isComplaint?: boolean;
  complaintSeverity?: string;
  resolution?: string;
  createdBy: number;
}) {
  const db = await requireDb();

  const isComplaint = data.type === "complaint" ? true : (data.isComplaint ?? false);
  const sentiment = data.type === "complaint" ? "negative" : (data.sentiment ?? "neutral");

  const result = await db
    .insert(crmInteractions)
    .values({
      customerId: data.customerId,
      opportunityId: data.opportunityId,
      type: data.type,
      subject: data.subject,
      content: data.content,
      sentiment,
      isComplaint,
      complaintSeverity: data.complaintSeverity,
      resolution: data.resolution,
      createdBy: data.createdBy,
    })
    .returning();

  return result[0];
}

/**
 * Get interaction statistics for a customer:
 * counts by type, complaint count, last interaction date.
 */
export async function getInteractionStats(customerId: number) {
  const db = await requireDb();

  const byType = await db
    .select({
      type: crmInteractions.type,
      count: sql<number>`count(*)::int`,
    })
    .from(crmInteractions)
    .where(eq(crmInteractions.customerId, customerId))
    .groupBy(crmInteractions.type);

  const complaintResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmInteractions)
    .where(
      and(
        eq(crmInteractions.customerId, customerId),
        eq(crmInteractions.isComplaint, true)
      )
    );

  const lastInteractionResult = await db
    .select({ lastDate: sql<string>`MAX(created_at)` })
    .from(crmInteractions)
    .where(eq(crmInteractions.customerId, customerId));

  return {
    byType,
    complaintCount: complaintResult[0]?.count ?? 0,
    lastInteractionDate: lastInteractionResult[0]?.lastDate ?? null,
  };
}

/**
 * Resolve a complaint interaction: set resolution text and resolvedAt timestamp.
 */
export async function resolveInteraction(id: number, resolution: string) {
  const db = await requireDb();

  const result = await db
    .update(crmInteractions)
    .set({
      resolution,
      resolvedAt: new Date().toISOString(),
    })
    .where(eq(crmInteractions.id, id))
    .returning();

  return result[0] ?? null;
}
