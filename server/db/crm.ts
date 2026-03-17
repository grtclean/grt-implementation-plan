/**
 * CRM module — customers, contacts, opportunities, BANT scores, follow-ups
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, or, like, and, sql } from "drizzle-orm";
import { requireDb } from "./connection";
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("db");
import {
  crmCustomers, InsertCrmCustomer, CrmCustomer, crmContacts,
  InsertCrmContact, CrmContact, crmOpportunities, InsertCrmOpportunity,
  CrmOpportunity, crmBantScores, InsertCrmBantScore, crmFollowUps,
  InsertCrmFollowUp,
} from "../../drizzle/schema";

// ============= CRM Module Functions =============

// --- Customers ---

export async function createCustomer(data: InsertCrmCustomer) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate customer code
    const count = await db.select({ count: sql<number>`count(*)` }).from(crmCustomers);
    const code = `CUS${String(count[0].count + 1).padStart(6, '0')}`;
    
    const result = await db.insert(crmCustomers).values({
      ...data,
      customerCode: code,
    });
    return { id: (result as any)[0].insertId, customerCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create customer");
    throw error;
  }
}

export async function getAllCustomers(filters?: {
  type?: string;
  level?: string;
  status?: string;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(crmCustomers);
  
  const conditions = [];
  if (filters?.type) {
    conditions.push(eq(crmCustomers.type, filters.type as any));
  }
  if (filters?.level) {
    conditions.push(eq(crmCustomers.level, filters.level as any));
  }
  if (filters?.status) {
    conditions.push(eq(crmCustomers.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(crmCustomers.name, `%${filters.search}%`),
        like(crmCustomers.customerCode, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(crmCustomers.createdAt)).limit(1000);
}

export async function getCustomerById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(crmCustomers).where(eq(crmCustomers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateCustomer(id: number, data: Partial<Omit<CrmCustomer, "id" | "createdAt" | "updatedAt" | "customerCode">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(crmCustomers).set(data).where(eq(crmCustomers.id, id));
  return { success: true };
}

export async function deleteCustomer(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(crmCustomers).where(eq(crmCustomers.id, id));
  return { success: true };
}

// --- Contacts ---

export async function createContact(data: InsertCrmContact) {
  const db = await requireDb();
  if (!db) return null;

  try {
    const result = await db.insert(crmContacts).values(data);
    return { id: (result as any)[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create contact");
    throw error;
  }
}

export async function getContactsByCustomerId(customerId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(crmContacts)
    .where(eq(crmContacts.customerId, customerId))
    .orderBy(desc(crmContacts.createdAt))
    .limit(1000);
}

export async function getAllContacts(filters?: { search?: string; customerId?: number }) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(crmContacts);
  
  const conditions = [];
  if (filters?.customerId) {
    conditions.push(eq(crmContacts.customerId, filters.customerId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(crmContacts.name, `%${filters.search}%`),
        like(crmContacts.mobile, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(crmContacts.createdAt)).limit(1000);
}

export async function updateContact(id: number, data: Partial<Omit<CrmContact, "id" | "createdAt" | "updatedAt">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(crmContacts).set(data).where(eq(crmContacts.id, id));
  return { success: true };
}

export async function deleteContact(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(crmContacts).where(eq(crmContacts.id, id));
  return { success: true };
}

// --- Opportunities ---

export async function createOpportunity(data: InsertCrmOpportunity) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate opportunity code
    const count = await db.select({ count: sql<number>`count(*)` }).from(crmOpportunities);
    const code = `OPP${String(count[0].count + 1).padStart(6, '0')}`;
    
    const result = await db.insert(crmOpportunities).values({
      ...data,
      opportunityCode: code,
    });
    return { id: (result as any)[0].insertId, opportunityCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create opportunity");
    throw error;
  }
}

export async function getAllOpportunities(filters?: {
  stage?: string;
  type?: string;
  customerId?: number;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(crmOpportunities);
  
  const conditions = [];
  if (filters?.stage) {
    conditions.push(eq(crmOpportunities.stage, filters.stage as any));
  }
  if (filters?.type) {
    conditions.push(eq(crmOpportunities.type, filters.type as any));
  }
  if (filters?.customerId) {
    conditions.push(eq(crmOpportunities.customerId, filters.customerId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(crmOpportunities.name, `%${filters.search}%`),
        like(crmOpportunities.opportunityCode, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(crmOpportunities.createdAt)).limit(1000);
}

export async function getOpportunityById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(crmOpportunities).where(eq(crmOpportunities.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateOpportunity(id: number, data: Partial<Omit<CrmOpportunity, "id" | "createdAt" | "updatedAt" | "opportunityCode">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(crmOpportunities).set(data).where(eq(crmOpportunities.id, id));
  return { success: true };
}

export async function deleteOpportunity(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(crmOpportunities).where(eq(crmOpportunities.id, id));
  return { success: true };
}

// --- BANT Scores ---

export async function createBantScore(data: InsertCrmBantScore) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Calculate total score
    const totalScore = (data.budgetScore || 1) + (data.authorityScore || 1) + (data.needScore || 1) + (data.timelineScore || 1);
    
    const result = await db.insert(crmBantScores).values({
      ...data,
      totalScore,
    });
    return { id: (result as any)[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create BANT score");
    throw error;
  }
}

export async function getBantScoreByOpportunityId(opportunityId: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(crmBantScores)
    .where(eq(crmBantScores.opportunityId, opportunityId))
    .orderBy(desc(crmBantScores.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateBantScore(id: number, data: Partial<InsertCrmBantScore>) {
  const db = await requireDb();
  if (!db) return null;

  // Recalculate total score if any score changed
  const totalScore = (data.budgetScore || 1) + (data.authorityScore || 1) + (data.needScore || 1) + (data.timelineScore || 1);
  
  await db.update(crmBantScores).set({ ...data, totalScore }).where(eq(crmBantScores.id, id));
  return { success: true };
}

// --- Follow-ups ---

export async function createFollowUp(data: InsertCrmFollowUp) {
  const db = await requireDb();
  if (!db) return null;

  try {
    const result = await db.insert(crmFollowUps).values(data);
    return { id: (result as any)[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create follow-up");
    throw error;
  }
}

export async function getFollowUpsByRelated(relatedType: "customer" | "opportunity", relatedId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(crmFollowUps)
    .where(and(
      eq(crmFollowUps.relatedType, relatedType),
      eq(crmFollowUps.relatedId, relatedId)
    ))
    .orderBy(desc(crmFollowUps.followedAt))
    .limit(1000);
}
