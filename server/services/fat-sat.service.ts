/**
 * FAT/SAT Backend Persistence Service
 *
 * Provides CRUD operations for FAT (Factory Acceptance Test) and SAT (Site Acceptance Test)
 * test plans, test items, checklists, signoffs, and site conditions.
 *
 * Task #56 - FAT/SAT backend persistence with new tables and router.
 */

import { requireDb } from "../db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import {
  fatTestPlans,
  fatTestItems,
  fatChecklists,
  fatSignoffs,
  satSiteConditions,
} from "../../drizzle/schema";

// ============================================================
// Type Definitions
// ============================================================

export interface CreateTestPlanInput {
  projectId: number;
  planType: "FAT" | "SAT";
  planName: string;
  equipmentModel?: string;
  customerName?: string;
  testLocation?: string;
  plannedDate?: Date;
  createdBy?: number;
}

export interface AddTestItemInput {
  planId: number;
  category: string;
  itemName: string;
  specification?: string;
  passCriteria?: string;
  unit?: string;
  sortOrder?: number;
}

export interface UpdateTestItemInput {
  id: number;
  actualValue?: string;
  result?: string;
  testerId?: number;
  testerName?: string;
  testedAt?: Date;
  notes?: string;
}

export interface BatchUpdateTestItemInput {
  items: UpdateTestItemInput[];
}
export interface AddChecklistInput {
  planId: number;
  category: string;
  itemName: string;
  responsiblePerson?: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateChecklistInput {
  id: number;
  isCompleted?: boolean;
  responsiblePerson?: string;
  notes?: string;
}

export interface AddSignoffInput {
  planId: number;
  stepOrder: number;
  stepName: string;
  signerRole: string;
  signerName?: string;
}

export interface UpdateSignoffInput {
  id: number;
  status: "pending" | "approved" | "rejected";
  signerName?: string;
  comment?: string;
  signatureUrl?: string;
  signedAt?: Date;
}

export interface AddSiteConditionInput {
  planId: number;
  conditionType: string;
  conditionName: string;
  expectedValue?: string;
  unit?: string;
}

export interface UpdateSiteConditionInput {
  id: number;
  actualValue?: string;
  isWithinSpec?: boolean;
  notes?: string;
  measuredBy?: string;
  measuredAt?: Date;
}

export interface TestPlanSummary {
  planId: number;
  planName: string;
  planType: string;
  status: string;
  totalTestItems: number;
  passedItems: number;
  failedItems: number;
  pendingItems: number;
  conditionalItems: number;
  passRate: number;
  totalChecklists: number;
  completedChecklists: number;
  checklistCompletionRate: number;
  totalSignoffs: number;
  approvedSignoffs: number;
  signoffProgress: number;
}
// ============================================================
// Test Plan Operations
// ============================================================

export async function createTestPlan(input: CreateTestPlanInput) {
  const db = await requireDb();
  const result = await db
    .insert(fatTestPlans)
    .values({
      projectId: input.projectId,
      planType: input.planType,
      planName: input.planName,
      equipmentModel: input.equipmentModel ?? null,
      customerName: input.customerName ?? null,
      testLocation: input.testLocation ?? null,
      plannedDate: input.plannedDate ?? null,
      createdBy: input.createdBy ?? null,
      status: "draft",
    })
    .returning();
  return result[0];
}

export async function getTestPlan(planId: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(fatTestPlans)
    .where(eq(fatTestPlans.id, planId));
  return result[0] ?? null;
}

export async function listTestPlans(params: {
  projectId?: number;
  planType?: string;
  status?: string;
}) {
  const db = await requireDb();
  const conditions = [];
  if (params.projectId !== undefined) {
    conditions.push(eq(fatTestPlans.projectId, params.projectId));
  }
  if (params.planType) {
    conditions.push(eq(fatTestPlans.planType, params.planType));
  }
  if (params.status) {
    conditions.push(eq(fatTestPlans.status, params.status));
  }
  const query = db.select().from(fatTestPlans);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(fatTestPlans.createdAt));
  }
  return await query.orderBy(desc(fatTestPlans.createdAt));
}

export async function updateTestPlanStatus(planId: number, status: string) {
  const db = await requireDb();
  const result = await db
    .update(fatTestPlans)
    .set({ status, updatedAt: new Date() })
    .where(eq(fatTestPlans.id, planId))
    .returning();
  return result[0] ?? null;
}

// ============================================================
// Test Item Operations
// ============================================================

export async function addTestItem(input: AddTestItemInput) {
  const db = await requireDb();
  const result = await db
    .insert(fatTestItems)
    .values({
      planId: input.planId,
      category: input.category,
      itemName: input.itemName,
      specification: input.specification ?? null,
      passCriteria: input.passCriteria ?? null,
      unit: input.unit ?? null,
      sortOrder: input.sortOrder ?? 0,
      result: "pending",
    })
    .returning();
  return result[0];
}

export async function updateTestItem(input: UpdateTestItemInput) {
  const db = await requireDb();
  const updateData: Record<string, unknown> = {};
  if (input.actualValue !== undefined) updateData.actualValue = input.actualValue;
  if (input.result !== undefined) updateData.result = input.result;
  if (input.testerId !== undefined) updateData.testerId = input.testerId;
  if (input.testerName !== undefined) updateData.testerName = input.testerName;
  if (input.testedAt !== undefined) updateData.testedAt = input.testedAt;
  if (input.notes !== undefined) updateData.notes = input.notes;
  const result = await db
    .update(fatTestItems)
    .set(updateData)
    .where(eq(fatTestItems.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function getTestItems(planId: number, category?: string) {
  const db = await requireDb();
  const conditions = [eq(fatTestItems.planId, planId)];
  if (category) {
    conditions.push(eq(fatTestItems.category, category));
  }
  return await db
    .select()
    .from(fatTestItems)
    .where(and(...conditions))
    .orderBy(fatTestItems.sortOrder);
}

export async function batchUpdateTestItems(input: BatchUpdateTestItemInput) {
  const results = [];
  for (const item of input.items) {
    const updated = await updateTestItem(item);
    if (updated) results.push(updated);
  }
  return results;
}
// ============================================================
// Checklist Operations
// ============================================================

export async function addChecklist(input: AddChecklistInput) {
  const db = await requireDb();
  const result = await db
    .insert(fatChecklists)
    .values({
      planId: input.planId,
      category: input.category,
      itemName: input.itemName,
      isCompleted: false,
      responsiblePerson: input.responsiblePerson ?? null,
      notes: input.notes ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return result[0];
}

export async function updateChecklist(input: UpdateChecklistInput) {
  const db = await requireDb();
  const updateData: Record<string, unknown> = {};
  if (input.isCompleted !== undefined) updateData.isCompleted = input.isCompleted;
  if (input.responsiblePerson !== undefined) updateData.responsiblePerson = input.responsiblePerson;
  if (input.notes !== undefined) updateData.notes = input.notes;
  const result = await db
    .update(fatChecklists)
    .set(updateData)
    .where(eq(fatChecklists.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function getChecklists(planId: number) {
  const db = await requireDb();
  return await db
    .select()
    .from(fatChecklists)
    .where(eq(fatChecklists.planId, planId))
    .orderBy(fatChecklists.sortOrder);
}

// ============================================================
// Signoff Operations
// ============================================================

export async function addSignoff(input: AddSignoffInput) {
  const db = await requireDb();
  const result = await db
    .insert(fatSignoffs)
    .values({
      planId: input.planId,
      stepOrder: input.stepOrder,
      stepName: input.stepName,
      signerRole: input.signerRole,
      signerName: input.signerName ?? null,
      status: "pending",
    })
    .returning();
  return result[0];
}

export async function updateSignoff(input: UpdateSignoffInput) {
  const db = await requireDb();
  const updateData: Record<string, unknown> = { status: input.status };
  if (input.signerName !== undefined) updateData.signerName = input.signerName;
  if (input.comment !== undefined) updateData.comment = input.comment;
  if (input.signatureUrl !== undefined) updateData.signatureUrl = input.signatureUrl;
  if (input.signedAt !== undefined) {
    updateData.signedAt = input.signedAt;
  } else if (input.status === "approved" || input.status === "rejected") {
    updateData.signedAt = new Date();
  }
  const result = await db
    .update(fatSignoffs)
    .set(updateData)
    .where(eq(fatSignoffs.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function getSignoffs(planId: number) {
  const db = await requireDb();
  return await db
    .select()
    .from(fatSignoffs)
    .where(eq(fatSignoffs.planId, planId))
    .orderBy(fatSignoffs.stepOrder);
}

// ============================================================
// Site Condition Operations (SAT-specific)
// ============================================================

export async function addSiteCondition(input: AddSiteConditionInput) {
  const db = await requireDb();
  const result = await db
    .insert(satSiteConditions)
    .values({
      planId: input.planId,
      conditionType: input.conditionType,
      conditionName: input.conditionName,
      expectedValue: input.expectedValue ?? null,
      unit: input.unit ?? null,
    })
    .returning();
  return result[0];
}

export async function updateSiteCondition(input: UpdateSiteConditionInput) {
  const db = await requireDb();
  const updateData: Record<string, unknown> = {};
  if (input.actualValue !== undefined) updateData.actualValue = input.actualValue;
  if (input.isWithinSpec !== undefined) updateData.isWithinSpec = input.isWithinSpec;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.measuredBy !== undefined) updateData.measuredBy = input.measuredBy;
  if (input.measuredAt !== undefined) updateData.measuredAt = input.measuredAt;
  const result = await db
    .update(satSiteConditions)
    .set(updateData)
    .where(eq(satSiteConditions.id, input.id))
    .returning();
  return result[0] ?? null;
}

export async function getSiteConditions(planId: number) {
  const db = await requireDb();
  return await db
    .select()
    .from(satSiteConditions)
    .where(eq(satSiteConditions.planId, planId))
    .orderBy(satSiteConditions.id);
}
// ============================================================
// Summary and Analytics
// ============================================================

export async function getTestPlanSummary(planId: number): Promise<TestPlanSummary | null> {
  const db = await requireDb();
  const plan = await getTestPlan(planId);
  if (!plan) return null;

  const testItemRows = await db
    .select({ result: fatTestItems.result, cnt: count() })
    .from(fatTestItems)
    .where(eq(fatTestItems.planId, planId))
    .groupBy(fatTestItems.result);

  let totalTestItems = 0;
  let passedItems = 0;
  let failedItems = 0;
  let pendingItems = 0;
  let conditionalItems = 0;

  for (const row of testItemRows) {
    const c = Number(row.cnt);
    totalTestItems += c;
    switch (row.result) {
      case "passed": passedItems = c; break;
      case "failed": failedItems = c; break;
      case "pending": pendingItems = c; break;
      case "conditional": conditionalItems = c; break;
    }
  }

  const checklistRows = await db
    .select({ isCompleted: fatChecklists.isCompleted, cnt: count() })
    .from(fatChecklists)
    .where(eq(fatChecklists.planId, planId))
    .groupBy(fatChecklists.isCompleted);

  let totalChecklists = 0;
  let completedChecklists = 0;
  for (const row of checklistRows) {
    const c = Number(row.cnt);
    totalChecklists += c;
    if (row.isCompleted) completedChecklists = c;
  }

  const signoffRows = await db
    .select({ status: fatSignoffs.status, cnt: count() })
    .from(fatSignoffs)
    .where(eq(fatSignoffs.planId, planId))
    .groupBy(fatSignoffs.status);

  let totalSignoffs = 0;
  let approvedSignoffs = 0;
  for (const row of signoffRows) {
    const c = Number(row.cnt);
    totalSignoffs += c;
    if (row.status === "approved") approvedSignoffs = c;
  }

  const testedItems = passedItems + failedItems + conditionalItems;
  const passRate = testedItems > 0 ? Math.round((passedItems / testedItems) * 100) : 0;
  const checklistCompletionRate = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;
  const signoffProgress = totalSignoffs > 0 ? Math.round((approvedSignoffs / totalSignoffs) * 100) : 0;

  return {
    planId: plan.id,
    planName: plan.planName,
    planType: plan.planType,
    status: plan.status ?? "draft",
    totalTestItems, passedItems, failedItems, pendingItems, conditionalItems, passRate,
    totalChecklists, completedChecklists, checklistCompletionRate,
    totalSignoffs, approvedSignoffs, signoffProgress,
  };
}
// ============================================================
// SAT Template Initialization
// ============================================================

export async function initializeSATTemplate(params: {
  projectId: number;
  planName: string;
  equipmentModel?: string;
  customerName?: string;
  testLocation?: string;
  plannedDate?: Date;
  createdBy?: number;
}) {
  const plan = await createTestPlan({
    projectId: params.projectId,
    planType: "SAT",
    planName: params.planName,
    equipmentModel: params.equipmentModel,
    customerName: params.customerName,
    testLocation: params.testLocation,
    plannedDate: params.plannedDate,
    createdBy: params.createdBy,
  });

  const siteConditionTemplates = [
    { conditionType: "ambient_temp", conditionName: "Ambient Temperature", expectedValue: "15-35", unit: "degC" },
    { conditionType: "water_quality", conditionName: "Water Quality (Conductivity)", expectedValue: "< 500", unit: "uS/cm" },
    { conditionType: "power_supply", conditionName: "Power Supply Voltage", expectedValue: "380 +/- 10%", unit: "V" },
    { conditionType: "humidity", conditionName: "Relative Humidity", expectedValue: "30-80", unit: "%RH" },
    { conditionType: "vibration", conditionName: "Floor Vibration Level", expectedValue: "< 0.5", unit: "mm/s" },
  ];
  for (const sc of siteConditionTemplates) {
    await addSiteCondition({ planId: plan.id, ...sc });
  }
  const standardTestItems: Omit<AddTestItemInput, "planId">[] = [
    { category: "mechanical", itemName: "Overall Dimensions Check", specification: "Per GA drawing", passCriteria: "Within +/-5mm tolerance", unit: "mm", sortOrder: 1 },
    { category: "mechanical", itemName: "Pump Pressure Test", specification: "12 +/- 1 MPa", passCriteria: "Stable pressure for 30 min", unit: "MPa", sortOrder: 2 },
    { category: "mechanical", itemName: "Nozzle Spray Pattern", specification: "Full coverage", passCriteria: "No blind spots on test piece", unit: "", sortOrder: 3 },
    { category: "electrical", itemName: "Insulation Resistance", specification: "> 1 MOhm", passCriteria: "All circuits > 1 MOhm", unit: "MOhm", sortOrder: 4 },
    { category: "electrical", itemName: "Motor Current Draw", specification: "Per nameplate +/-10%", passCriteria: "Stable under load", unit: "A", sortOrder: 5 },
    { category: "electrical", itemName: "PLC I/O Verification", specification: "All signals active", passCriteria: "100% I/O points verified", unit: "", sortOrder: 6 },
    { category: "safety", itemName: "Emergency Stop Function", specification: "All E-stops operative", passCriteria: "Machine stops within 1 second", unit: "s", sortOrder: 7 },
    { category: "safety", itemName: "Safety Interlock Doors", specification: "All interlocks wired", passCriteria: "Machine stops when door opened", unit: "", sortOrder: 8 },
    { category: "performance", itemName: "Cycle Time (Cleaning)", specification: "<= 60 s/piece", passCriteria: "50 consecutive pieces within spec", unit: "s", sortOrder: 9 },
    { category: "performance", itemName: "Cleanliness Result", specification: "Per customer spec", passCriteria: "Residue < max allowed mg", unit: "mg", sortOrder: 10 },
    { category: "performance", itemName: "Noise Level", specification: "<= 85 dB(A)", passCriteria: "Measured at 1m distance", unit: "dB(A)", sortOrder: 11 },
  ];
  const satSpecificTestItems: Omit<AddTestItemInput, "planId">[] = [
    { category: "environmental", itemName: "Foundation Level Check", specification: "+/-2mm over 3m span", passCriteria: "Spirit level verification", unit: "mm", sortOrder: 12 },
    { category: "environmental", itemName: "Utility Connections Verification", specification: "All utilities connected per P and ID", passCriteria: "Water, compressed air, power verified", unit: "", sortOrder: 13 },
    { category: "environmental", itemName: "Drainage Flow Test", specification: "No pooling", passCriteria: "Water drains within 30 seconds", unit: "s", sortOrder: 14 },
    { category: "performance", itemName: "Site Cycle Time Verification", specification: "<= contract cycle time", passCriteria: "100 consecutive pieces on site", unit: "s", sortOrder: 15 },
    { category: "performance", itemName: "Integration with Customer Line", specification: "Handshake signals active", passCriteria: "Auto mode with upstream/downstream", unit: "", sortOrder: 16 },
  ];

  const allTestItems = [...standardTestItems, ...satSpecificTestItems];
  for (const item of allTestItems) {
    await addTestItem({ planId: plan.id, ...item });
  }

  const checklistTemplates: Omit<AddChecklistInput, "planId">[] = [
    { category: "mechanical", itemName: "All fasteners torqued to spec", sortOrder: 1 },
    { category: "mechanical", itemName: "Pipe connections leak-free", sortOrder: 2 },
    { category: "mechanical", itemName: "Conveyor alignment verified", sortOrder: 3 },
    { category: "electrical", itemName: "Cable routing per drawing", sortOrder: 4 },
    { category: "electrical", itemName: "Grounding continuity verified", sortOrder: 5 },
    { category: "electrical", itemName: "HMI screens match spec", sortOrder: 6 },
    { category: "safety", itemName: "CE / safety labels applied", sortOrder: 7 },
    { category: "safety", itemName: "Light curtain function tested", sortOrder: 8 },
    { category: "safety", itemName: "Lockout/tagout points marked", sortOrder: 9 },
    { category: "documentation", itemName: "Operation manual delivered", sortOrder: 10 },
    { category: "documentation", itemName: "Electrical schematic delivered", sortOrder: 11 },
    { category: "documentation", itemName: "Spare parts list delivered", sortOrder: 12 },
    { category: "documentation", itemName: "Training completed and signed", sortOrder: 13 },
  ];
  for (const cl of checklistTemplates) {
    await addChecklist({ planId: plan.id, ...cl });
  }

  const signoffTemplates: Omit<AddSignoffInput, "planId">[] = [
    { stepOrder: 1, stepName: "Internal QA Review", signerRole: "qa_engineer" },
    { stepOrder: 2, stepName: "Engineering Sign-off", signerRole: "project_engineer" },
    { stepOrder: 3, stepName: "Customer Representative Approval", signerRole: "customer_rep" },
    { stepOrder: 4, stepName: "Final Acceptance Sign-off", signerRole: "project_manager" },
  ];
  for (const so of signoffTemplates) {
    await addSignoff({ planId: plan.id, ...so });
  }

  return {
    plan,
    message: "SAT template initialized successfully.",
  };
}