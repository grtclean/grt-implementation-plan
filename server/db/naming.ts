/**
 * Naming rules change management
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, or, and, sql } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  Project, namingRuleApprovers, namingChangeRequests, namingChangeImplementations,
  namingChangeTests, namingVersions, equipmentModels, equipmentNameHistory,
  projectNumberCounters, projectConversionHistory,
} from "../../drizzle/schema";

// ============================================
// Naming Rules Change Management
// ============================================

// ============================================
// Naming Rule Approvers Management
// ============================================

/**
 * Get all naming rule approvers
 */
export async function getNamingRuleApprovers(filters?: {
  ruleType?: "equipment" | "project" | "material" | "all";
  changeType?: "add" | "modify" | "delete" | "correct" | "all";
  isActive?: boolean;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(namingRuleApprovers);
  
  const conditions = [];
  if (filters?.ruleType) {
    conditions.push(eq(namingRuleApprovers.ruleType, filters.ruleType));
  }
  if (filters?.changeType) {
    conditions.push(eq(namingRuleApprovers.changeType, filters.changeType));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(namingRuleApprovers.isActive, filters.isActive as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.limit(1000);
}

/**
 * Create naming rule approver
 */
export async function createNamingRuleApprover(data: {
  userId: number;
  ruleType: "equipment" | "project" | "material" | "all";
  changeType: "add" | "modify" | "delete" | "correct" | "all";
  approvalLevel?: number;
  remark?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(namingRuleApprovers).values(data as any) as any;
  return { id: result[0]?.insertId ?? result.insertId, ...data };
}

/**
 * Update naming rule approver
 */
export async function updateNamingRuleApprover(id: number, data: Partial<{
  ruleType: "equipment" | "project" | "material" | "all";
  changeType: "add" | "modify" | "delete" | "correct" | "all";
  approvalLevel: number;
  isActive: boolean;
  remark: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingRuleApprovers).set(data as any).where(eq(namingRuleApprovers.id, id));
  return { success: true };
}

/**
 * Delete naming rule approver
 */
export async function deleteNamingRuleApprover(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.delete(namingRuleApprovers).where(eq(namingRuleApprovers.id, id));
  return { success: true };
}

/**
 * Get approvers for a specific change request
 */
export async function getApproversForChange(
  ruleType: "equipment" | "project" | "material",
  changeType: "add" | "modify" | "delete" | "correct"
) {
  const db = await requireDb();
  if (!db) return [];
  
  // Get approvers that match the specific type or "all"
  const result = await db.select()
    .from(namingRuleApprovers)
    .where(and(
      or(
        eq(namingRuleApprovers.ruleType, ruleType),
        eq(namingRuleApprovers.ruleType, "all")
      ),
      or(
        eq(namingRuleApprovers.changeType, changeType),
        eq(namingRuleApprovers.changeType, "all")
      ),
      eq(namingRuleApprovers.isActive, true as any)
    ))
    .orderBy(namingRuleApprovers.approvalLevel)
    .limit(1000);

  return result;
}

// ============================================
// Naming Change Requests Management
// ============================================

/**
 * Generate change request code
 */
export async function generateChangeRequestCode(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  const db = await requireDb();
  if (!db) return `CR-${dateStr}-001`;
  
  // Find the max code for today
  const result = await db.select()
    .from(namingChangeRequests)
    .where(sql`${namingChangeRequests.requestCode} LIKE ${`CR-${dateStr}-%`}`)
    .orderBy(desc(namingChangeRequests.requestCode))
    .limit(1);
  
  if (result.length === 0) {
    return `CR-${dateStr}-001`;
  }
  
  const lastCode = result[0].requestCode;
  const lastSeq = parseInt(lastCode.split('-')[2], 10);
  const newSeq = (lastSeq + 1).toString().padStart(3, '0');
  
  return `CR-${dateStr}-${newSeq}`;
}

/**
 * Get all naming change requests
 */
export async function getNamingChangeRequests(filters?: {
  status?: "pending" | "approved" | "rejected" | "implementing" | "testing" | "completed" | "cancelled";
  ruleType?: "equipment" | "project" | "material";
  requestType?: "add" | "modify" | "delete" | "correct";
  requestorId?: number;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(namingChangeRequests);
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(namingChangeRequests.status, filters.status));
  }
  if (filters?.ruleType) {
    conditions.push(eq(namingChangeRequests.ruleType, filters.ruleType));
  }
  if (filters?.requestType) {
    conditions.push(eq(namingChangeRequests.requestType, filters.requestType));
  }
  if (filters?.requestorId) {
    conditions.push(eq(namingChangeRequests.requestorId, filters.requestorId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(desc(namingChangeRequests.createdAt)).limit(1000);
}

/**
 * Get naming change request by ID
 */
export async function getNamingChangeRequestById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(namingChangeRequests).where(eq(namingChangeRequests.id, id));
  return result[0] || null;
}

/**
 * Create naming change request
 */
export async function createNamingChangeRequest(data: {
  requestType: "add" | "modify" | "delete" | "correct";
  ruleType: "equipment" | "project" | "material";
  title: string;
  description: string;
  reason: string;
  impactScope?: string;
  requestorId: number;
  requestorName?: string;
  oldVersion?: string;
  newVersion?: string;
  effectiveDate?: string;
  changeData?: string;
  attachments?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const requestCode = await generateChangeRequestCode();
  
  // Get first approver
  const approvers = await getApproversForChange(data.ruleType, data.requestType);
  const firstApprover = approvers.length > 0 ? approvers[0] : null;
  
  const result = await db.insert(namingChangeRequests).values({
    ...data,
    requestCode,
    currentApproverId: firstApprover?.userId,
    status: "pending"
  });
  
  return { id: (result as any)[0].insertId, requestCode, ...data };
}

/**
 * Update naming change request
 */
export async function updateNamingChangeRequest(id: number, data: Partial<{
  title: string;
  description: string;
  reason: string;
  impactScope: string;
  status: "pending" | "approved" | "rejected" | "implementing" | "testing" | "completed" | "cancelled";
  currentApproverId: number;
  approverName: string;
  approvalDate: string;
  approvalNotes: string;
  oldVersion: string;
  newVersion: string;
  effectiveDate: string;
  changeData: string;
  attachments: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeRequests).set(data).where(eq(namingChangeRequests.id, id));
  return { success: true };
}

/**
 * Approve naming change request
 */
export async function approveNamingChangeRequest(id: number, approverId: number, approverName: string, notes?: string) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeRequests).set({
    status: "approved",
    approverName,
    approvalDate: new Date().toISOString(),
    approvalNotes: notes
  }).where(eq(namingChangeRequests.id, id));
  
  return { success: true };
}

/**
 * Reject naming change request
 */
export async function rejectNamingChangeRequest(id: number, approverId: number, approverName: string, notes: string) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeRequests).set({
    status: "rejected",
    approverName,
    approvalDate: new Date().toISOString(),
    approvalNotes: notes
  }).where(eq(namingChangeRequests.id, id));
  
  return { success: true };
}

// ============================================
// Naming Change Implementations Management
// ============================================

/**
 * Get implementations for a change request
 */
export async function getNamingChangeImplementations(requestId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(namingChangeImplementations)
    .where(eq(namingChangeImplementations.requestId, requestId))
    .orderBy(namingChangeImplementations.createdAt)
    .limit(1000);
}

/**
 * Create naming change implementation record
 */
export async function createNamingChangeImplementation(data: {
  requestId: number;
  phase: "development" | "testing" | "recording" | "release";
  executorId?: number;
  executorName?: string;
  startTime?: string;
  result?: string;
  notes?: string;
  attachments?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(namingChangeImplementations).values({
    ...data,
    startTime: data.startTime || new Date().toISOString(),
    status: "in_progress"
  });
  
  return { id: (result as any)[0].insertId, ...data };
}

/**
 * Update naming change implementation
 */
export async function updateNamingChangeImplementation(id: number, data: Partial<{
  endTime: string;
  status: "in_progress" | "completed" | "failed";
  result: string;
  notes: string;
  attachments: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeImplementations).set(data).where(eq(namingChangeImplementations.id, id));
  return { success: true };
}

// ============================================
// Naming Change Tests Management
// ============================================

/**
 * Get tests for a change request
 */
export async function getNamingChangeTests(requestId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(namingChangeTests)
    .where(eq(namingChangeTests.requestId, requestId))
    .orderBy(desc(namingChangeTests.testDate))
    .limit(1000);
}

/**
 * Create naming change test record
 */
export async function createNamingChangeTest(data: {
  requestId: number;
  testerId?: number;
  testerName?: string;
  testEnvironment?: string;
  testItems?: string;
  testResult: "pass" | "fail" | "partial";
  issues?: string;
  notes?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(namingChangeTests).values(data);
  return { id: (result as any)[0].insertId, ...data };
}

// ============================================
// Naming Versions Management
// ============================================

/**
 * Get all naming versions
 */
export async function getNamingVersions(ruleType?: "equipment" | "project" | "material") {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(namingVersions);
  
  if (ruleType) {
    query = query.where(eq(namingVersions.ruleType, ruleType)) as typeof query;
  }
  
  return query.orderBy(desc(namingVersions.effectiveDate)).limit(1000);
}

/**
 * Get current naming version
 */
export async function getCurrentNamingVersion(ruleType: "equipment" | "project" | "material") {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(namingVersions)
    .where(and(
      eq(namingVersions.ruleType, ruleType),
      eq(namingVersions.isCurrent, true as any)
    ))
    .limit(1000);

  return result[0] || null;
}

/**
 * Create naming version
 */
export async function createNamingVersion(data: {
  versionCode: string;
  versionName?: string;
  ruleType: "equipment" | "project" | "material";
  effectiveDate: string;
  changeType: "major" | "minor" | "patch";
  changeDescription?: string;
  changeRequestId?: number;
  isCurrent?: boolean;
  createdBy?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  // If this is set as current, unset other current versions
  if (data.isCurrent) {
    await db.update(namingVersions)
      .set({ isCurrent: false } as any)
      .where(eq(namingVersions.ruleType, data.ruleType));
  }
  
  const result = await db.insert(namingVersions).values(data as any) as any;
  return { id: result[0]?.insertId ?? result.insertId, ...data };
}

// ============================================
// Equipment Models Management
// ============================================

/**
 * Get all equipment models
 */
export async function getEquipmentModels(filters?: {
  categoryCode?: string;
  status?: "active" | "deprecated" | "obsolete";
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(equipmentModels);
  
  const conditions = [];
  if (filters?.categoryCode) {
    conditions.push(eq(equipmentModels.categoryCode, filters.categoryCode));
  }
  if (filters?.status) {
    conditions.push(eq(equipmentModels.status, filters.status));
  }
  if (filters?.search) {
    conditions.push(or(
      sql`${equipmentModels.numericCode} LIKE ${`%${filters.search}%`}`,
      sql`${equipmentModels.fullName} LIKE ${`%${filters.search}%`}`,
      sql`${equipmentModels.chineseName} LIKE ${`%${filters.search}%`}`
    ));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(equipmentModels.numericCode).limit(1000);
}

/**
 * Get equipment model by ID
 */
export async function getEquipmentModelById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(equipmentModels).where(eq(equipmentModels.id, id));
  return result[0] || null;
}

/**
 * Get equipment model by numeric code
 */
export async function getEquipmentModelByCode(numericCode: string) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(equipmentModels).where(eq(equipmentModels.numericCode, numericCode)).limit(1000);
  return result[0] || null;
}

/**
 * Create equipment model
 */
export async function createEquipmentModel(data: {
  numericCode: string;
  functionCode: string;
  categoryCode: string;
  fullName: string;
  chineseName: string;
  displayName?: string;
  chamberCount?: number;
  processType?: string;
  configLevel?: string;
  applicableIndustry?: string;
  namingVersion?: string;
  effectiveDate: string;
  remark?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(equipmentModels).values(data);
  return { id: (result as any)[0].insertId, ...data };
}

/**
 * Update equipment model
 */
export async function updateEquipmentModel(id: number, data: Partial<{
  fullName: string;
  chineseName: string;
  displayName: string;
  chamberCount: number;
  processType: string;
  configLevel: string;
  applicableIndustry: string;
  namingVersion: string;
  status: "active" | "deprecated" | "obsolete";
  remark: string;
}>, userId?: number, changeReason?: string) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get current data for history
  const current = await getEquipmentModelById(id);
  if (!current) return null;
  
  // If name changed, record history
  if (data.fullName || data.chineseName || data.displayName) {
    await db.insert(equipmentNameHistory).values({
      equipmentId: id,
      numericCode: current.numericCode,
      oldName: current.fullName,
      newName: data.fullName || current.fullName,
      oldChineseName: current.chineseName,
      newChineseName: data.chineseName || current.chineseName,
      changeReason: changeReason || "手动调整",
      changeType: "manual",
      namingVersion: data.namingVersion || current.namingVersion,
      effectiveDate: new Date().toISOString(),
      createdBy: userId
    });
  }
  
  await db.update(equipmentModels).set(data).where(eq(equipmentModels.id, id));
  return { success: true };
}

/**
 * Get equipment name history
 */
export async function getEquipmentNameHistoryByCode(numericCode: string) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(equipmentNameHistory)
    .where(eq(equipmentNameHistory.numericCode, numericCode))
    .orderBy(desc(equipmentNameHistory.createdAt))
    .limit(1000);
}

// ============================================
// Project Number Management
// ============================================

/**
 * Get project number counter
 */
export async function getProjectNumberCounter(prefix: string) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(projectNumberCounters).where(eq(projectNumberCounters.prefix, prefix)).limit(1000);
  return result[0] || null;
}

/**
 * Initialize project number counters
 */
export async function initProjectNumberCounters() {
  const db = await requireDb();
  if (!db) return null;
  
  // Initialize T counter (starting from current max ~500)
  const tCounter = await getProjectNumberCounter("T");
  if (!tCounter) {
    await db.insert(projectNumberCounters).values({
      prefix: "T",
      currentMax: 500,
      nextAvailable: 501,
      formatDigits: 3
    });
  }
  
  // Initialize GRT counter (starting from current max ~500)
  const grtCounter = await getProjectNumberCounter("GRT");
  if (!grtCounter) {
    await db.insert(projectNumberCounters).values({
      prefix: "GRT",
      currentMax: 500,
      nextAvailable: 501,
      formatDigits: 3
    });
  }
  
  return { success: true };
}

/**
 * Generate next project number
 */
export async function generateNextProjectNumber(prefix: "T" | "GRT"): Promise<string> {
  const db = await requireDb();
  if (!db) return `${prefix}001`;
  
  let counter = await getProjectNumberCounter(prefix);
  
  // Initialize if not exists
  if (!counter) {
    await initProjectNumberCounters();
    counter = await getProjectNumberCounter(prefix);
  }
  
  if (!counter) return `${prefix}001`;
  
  const nextNum = counter.nextAvailable;
  let formatDigits = counter.formatDigits;
  
  // Auto-upgrade from 3 to 4 digits when reaching 999
  if (nextNum > 999 && formatDigits === 3) {
    formatDigits = 4;
  }
  
  const paddedNum = nextNum.toString().padStart(formatDigits, '0');
  const newCode = `${prefix}${paddedNum}`;
  
  // Update counter
  await db.update(projectNumberCounters).set({
    currentMax: nextNum,
    nextAvailable: nextNum + 1,
    formatDigits
  }).where(eq(projectNumberCounters.prefix, prefix));
  
  return newCode;
}

/**
 * Convert temporary project to formal project
 */
export async function convertProjectNumber(
  tempCode: string,
  contractNo?: string,
  userId?: number,
  remark?: string
): Promise<{ formalCode: string; success: boolean }> {
  const db = await requireDb();
  if (!db) return { formalCode: "", success: false };
  
  // Generate formal GRT number
  const formalCode = await generateNextProjectNumber("GRT");
  
  // Get current version
  const currentVersion = await getCurrentNamingVersion("project");
  
  // Record conversion
  await db.insert(projectConversionHistory).values({
    tempProjectCode: tempCode,
    formalProjectCode: formalCode,
    conversionDate: new Date().toISOString(),
    contractNo,
    numberingVersion: currentVersion?.versionCode || "V1.0",
    remark,
    createdBy: userId
  });
  
  return { formalCode, success: true };
}

/**
 * Get project conversion history
 */
export async function getProjectConversionHistory(filters?: {
  tempCode?: string;
  formalCode?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(projectConversionHistory);
  
  const conditions = [];
  if (filters?.tempCode) {
    conditions.push(eq(projectConversionHistory.tempProjectCode, filters.tempCode));
  }
  if (filters?.formalCode) {
    conditions.push(eq(projectConversionHistory.formalProjectCode, filters.formalCode));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(desc(projectConversionHistory.conversionDate)).limit(1000);
}

// ============================================
// Initialize Default Data
// ============================================

/**
 * Initialize default naming versions
 */
export async function initDefaultNamingVersions() {
  const db = await requireDb();
  if (!db) return null;
  
  const ruleTypes: Array<"equipment" | "project" | "material"> = ["equipment", "project", "material"];
  
  for (const ruleType of ruleTypes) {
    const existing = await getCurrentNamingVersion(ruleType);
    if (!existing) {
      await createNamingVersion({
        versionCode: `${ruleType.toUpperCase()}-V1.0`,
        versionName: `${ruleType === "equipment" ? "设备" : ruleType === "project" ? "项目" : "物料"}命名规则V1.0`,
        ruleType,
        effectiveDate: new Date("2026-01-17").toISOString(),
        changeType: "major",
        changeDescription: "初始版本，建立命名体系",
        isCurrent: true
      });
    }
  }
  
  return { success: true };
}

/**
 * Initialize sample equipment models
 */
export async function initSampleEquipmentModels() {
  const db = await requireDb();
  if (!db) return null;
  
  const sampleModels = [
    // 8XX - Chamber series
    { numericCode: "801", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 801", chineseName: "超声波腔体清洗机", chamberCount: 1, processType: "超声波", configLevel: "标准" },
    { numericCode: "802", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 802", chineseName: "超声波腔体清洗机", chamberCount: 2, processType: "超声波", configLevel: "标准" },
    { numericCode: "811", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 811", chineseName: "超声波增强腔体清洗机", chamberCount: 1, processType: "超声波增强", configLevel: "增强" },
    { numericCode: "821", functionCode: "SP", categoryCode: "8", fullName: "Spray 821", chineseName: "喷淋腔体清洗机", chamberCount: 1, processType: "高压喷淋", configLevel: "标准" },
    { numericCode: "831", functionCode: "VC", categoryCode: "8", fullName: "Vacuum 831", chineseName: "真空腔体清洗机", chamberCount: 1, processType: "真空清洗", configLevel: "标准" },
    { numericCode: "851", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 851", chineseName: "大型超声波腔体清洗机", chamberCount: 1, processType: "超声波", configLevel: "大型" },
    // 5XXX - Passline series
    { numericCode: "5000", functionCode: "PL", categoryCode: "5", fullName: "Passline 5000", chineseName: "通过式清洗线", processType: "标准节拍", configLevel: "基础" },
    { numericCode: "5010", functionCode: "PL", categoryCode: "5", fullName: "Passline 5010", chineseName: "通过式清洗线", processType: "标准节拍", configLevel: "标准" },
    { numericCode: "5100", functionCode: "PL", categoryCode: "5", fullName: "Passline 5100", chineseName: "高速通过式清洗线", processType: "高速节拍", configLevel: "基础" },
    // 2XX - Standard series
    { numericCode: "200", functionCode: "US", categoryCode: "2", fullName: "Ultrasonic 200", chineseName: "超声波清洗机", processType: "超声波", configLevel: "基础" },
    { numericCode: "201", functionCode: "US", categoryCode: "2", fullName: "Ultrasonic 201", chineseName: "超声波清洗机", processType: "超声波", configLevel: "标准" },
    // 3XX - Specialized series
    { numericCode: "300", functionCode: "AU", categoryCode: "3", fullName: "Auto 300", chineseName: "汽车零部件清洗机", applicableIndustry: "汽车", processType: "综合", configLevel: "基础" },
    { numericCode: "310", functionCode: "NE", categoryCode: "3", fullName: "NEV 310", chineseName: "新能源零部件清洗机", applicableIndustry: "新能源", processType: "综合", configLevel: "基础" },
  ];
  
  let created = 0;
  for (const model of sampleModels) {
    const existing = await getEquipmentModelByCode(model.numericCode);
    if (!existing) {
      await createEquipmentModel({
        ...model,
        effectiveDate: new Date("2026-01-17").toISOString(),
        namingVersion: "V1.0"
      });
      created++;
    }
  }
  
  return { created };
}
