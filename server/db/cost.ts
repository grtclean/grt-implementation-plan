/**
 * Cost management — categories, budgets, records, estimates, labor costs, variance analysis
 * Auto-decomposed from server/db.ts
 */
import { eq, desc } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  projects, Project, costCategories, InsertCostCategory,
  projectBudgets, InsertProjectBudget, costRecords, InsertCostRecord,
  costEstimates, InsertCostEstimate, laborCosts, InsertLaborCost,
  costVarianceAnalysis, InsertCostVarianceAnalysis,
} from "../../drizzle/schema";

// ============================================
// v1.3 成本管理模块 (Cost Management Module)
// ============================================

// --- Cost Categories ---

export async function getCostCategories() {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costCategories).orderBy(costCategories.sortOrder).limit(1000);
}

export async function getCostCategoryById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(costCategories).where(eq(costCategories.id, id));
  return result[0] || null;
}

export async function createCostCategory(data: InsertCostCategory) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costCategories).values(data);
  return { id: result[0].insertId };
}

export async function updateCostCategory(id: number, data: Partial<InsertCostCategory>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(costCategories).set(data).where(eq(costCategories.id, id));
  return true;
}

// --- Project Budgets ---

export async function getProjectBudgets(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectBudgets).where(eq(projectBudgets.projectId, projectId)).limit(1000);
}

export async function createProjectBudget(data: InsertProjectBudget) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectBudgets).values(data);
  return { id: result[0].insertId };
}

export async function updateProjectBudget(id: number, data: Partial<InsertProjectBudget>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(projectBudgets).set(data).where(eq(projectBudgets.id, id));
  return true;
}

// --- Cost Records ---

export async function getCostRecords(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costRecords)
    .where(eq(costRecords.projectId, projectId))
    .orderBy(desc(costRecords.costDate))
    .limit(1000);
}

export async function getCostRecordById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(costRecords).where(eq(costRecords.id, id));
  return result[0] || null;
}

export async function createCostRecord(data: InsertCostRecord) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costRecords).values(data);
  return { id: result[0].insertId };
}

export async function updateCostRecord(id: number, data: Partial<InsertCostRecord>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(costRecords).set(data).where(eq(costRecords.id, id));
  return true;
}

// --- Cost Estimates ---

export async function getCostEstimates(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costEstimates).where(eq(costEstimates.projectId, projectId)).limit(1000);
}

export async function createCostEstimate(data: InsertCostEstimate) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costEstimates).values(data);
  return { id: result[0].insertId };
}

// --- Labor Costs ---

export async function getLaborCosts(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(laborCosts)
    .where(eq(laborCosts.projectId, projectId))
    .orderBy(desc(laborCosts.workDate))
    .limit(1000);
}

export async function createLaborCost(data: InsertLaborCost) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(laborCosts).values(data);
  return { id: result[0].insertId };
}

export async function updateLaborCost(id: number, data: Partial<InsertLaborCost>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(laborCosts).set(data).where(eq(laborCosts.id, id));
  return true;
}

// --- Cost Variance Analysis ---

export async function getCostVarianceAnalysis(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costVarianceAnalysis)
    .where(eq(costVarianceAnalysis.projectId, projectId))
    .orderBy(desc(costVarianceAnalysis.periodStart))
    .limit(1000);
}

export async function createCostVarianceAnalysis(data: InsertCostVarianceAnalysis) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costVarianceAnalysis).values(data);
  return { id: result[0].insertId };
}

// --- Cost Summary ---

export async function getProjectCostSummary(projectId: number) {
  const db = await requireDb();
  if (!db) return null;

  // Get project
  const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
  const project = projectResult[0];
  if (!project) return null;

  // Get all cost records
  const records = await db.select().from(costRecords).where(eq(costRecords.projectId, projectId)).limit(1000);

  // Get all labor costs
  const labor = await db.select().from(laborCosts).where(eq(laborCosts.projectId, projectId)).limit(1000);

  // Get budgets
  const budgets = await db.select().from(projectBudgets).where(eq(projectBudgets.projectId, projectId)).limit(1000);

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
  const totalCostRecords = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalLaborCost = labor.reduce((sum, l) => sum + Number(l.totalCost), 0);
  const totalActualCost = totalCostRecords + totalLaborCost;
  const variance = totalBudget - totalActualCost;
  const cpi = totalActualCost > 0 ? totalBudget / totalActualCost : 1;

  return {
    projectId,
    projectName: project.name,
    totalBudget,
    totalActualCost,
    costRecordsTotal: totalCostRecords,
    laborCostTotal: totalLaborCost,
    variance,
    cpi: Math.round(cpi * 100) / 100,
    budgetUtilization: totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0,
    recordsCount: records.length,
    laborEntriesCount: labor.length,
  };
}


// --- Cost Category Initialization ---

export async function initDefaultCostCategories() {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };

  // Check if categories already exist
  const existing = await db.select().from(costCategories).limit(1000);
  if (existing.length > 0) {
    return { success: true, message: "Cost categories already initialized", count: existing.length };
  }

  // Default cost categories for industrial equipment company
  const defaultCategories = [
    // Direct Costs (直接成本)
    { name: "材料费", code: "MAT", type: "direct" as const, description: "原材料、零部件、辅料等采购成本", sortOrder: 1 },
    { name: "人工费", code: "LAB", type: "direct" as const, description: "直接参与生产的人员工资、福利", sortOrder: 2 },
    { name: "设备费", code: "EQP", type: "direct" as const, description: "生产设备购置、租赁、维护费用", sortOrder: 3 },
    { name: "外协加工费", code: "OUT", type: "direct" as const, description: "外包加工、委托生产费用", sortOrder: 4 },
    { name: "运输费", code: "TRS", type: "direct" as const, description: "物流运输、仓储费用", sortOrder: 5 },
    { name: "安装调试费", code: "INS", type: "direct" as const, description: "现场安装、调试、培训费用", sortOrder: 6 },
    
    // Indirect Costs (间接成本)
    { name: "差旅费", code: "TRV", type: "indirect" as const, description: "出差交通、住宿、餐饮补贴", sortOrder: 10 },
    { name: "通讯费", code: "COM", type: "indirect" as const, description: "电话、网络、邮寄费用", sortOrder: 11 },
    { name: "办公费", code: "OFF", type: "indirect" as const, description: "办公用品、打印、复印费用", sortOrder: 12 },
    { name: "招待费", code: "ENT", type: "indirect" as const, description: "客户接待、商务宴请费用", sortOrder: 13 },
    { name: "培训费", code: "TRN", type: "indirect" as const, description: "员工培训、技能提升费用", sortOrder: 14 },
    { name: "咨询费", code: "CON", type: "indirect" as const, description: "专业咨询、法律服务费用", sortOrder: 15 },
    
    // Overhead Costs (管理费用)
    { name: "管理人员工资", code: "MGT", type: "overhead" as const, description: "管理层薪酬、奖金", sortOrder: 20 },
    { name: "租金", code: "RNT", type: "overhead" as const, description: "办公场地、厂房租金", sortOrder: 21 },
    { name: "水电费", code: "UTL", type: "overhead" as const, description: "水、电、气等公用事业费用", sortOrder: 22 },
    { name: "折旧费", code: "DEP", type: "overhead" as const, description: "固定资产折旧", sortOrder: 23 },
    { name: "保险费", code: "INR", type: "overhead" as const, description: "财产保险、责任保险费用", sortOrder: 24 },
    { name: "税费", code: "TAX", type: "overhead" as const, description: "各类税费、行政规费", sortOrder: 25 },
    { name: "其他费用", code: "OTH", type: "overhead" as const, description: "其他未分类费用", sortOrder: 99 },
  ];

  // Insert categories
  for (const category of defaultCategories) {
    await db.insert(costCategories).values({
      ...category,
      isActive: 1,
    });
  }

  return { 
    success: true, 
    message: `Successfully initialized ${defaultCategories.length} cost categories`,
    count: defaultCategories.length 
  };
}
