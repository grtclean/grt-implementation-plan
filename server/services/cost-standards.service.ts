/**
 * Cost Standards Service - 成本标准与产品配置服务
 * 成本标准CRUD, 产品配置管理, 产品成本计算
 */
import { requireDb } from "../db";
import { eq, desc, and, like, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

// ============================================
// Cost Standards
// ============================================

interface ListCostStandardsOpts {
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listCostStandards(opts: ListCostStandardsOpts) {
  const db = await requireDb();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.category) {
    conditions.push(eq(schema.costStandards.category, opts.category));
  }
  if (opts.isActive !== undefined) {
    conditions.push(eq(schema.costStandards.isActive, opts.isActive));
  }
  if (opts.search) {
    conditions.push(like(schema.costStandards.name, `%${opts.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(schema.costStandards)
    .where(where)
    .orderBy(schema.costStandards.sortOrder, desc(schema.costStandards.id))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.costStandards)
    .where(where);

  const total = Number(countResult[0]?.count ?? 0);

  return { items, total, page, pageSize };
}

interface UpdateCostStandardData {
  id: number;
  name?: string;
  nameEn?: string;
  hourlyRate?: string;
  dailyRate?: string;
  overtimeMultiplier?: string;
  monthlyAmount?: string;
  allocationBase?: string;
  allocationRate?: string;
  allocationUnit?: string;
  markupPercent?: string;
  minMarkup?: string;
  applyTo?: string;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function updateCostStandard(data: UpdateCostStandardData) {
  const db = await requireDb();
  const { id, ...updates } = data;

  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.nameEn !== undefined) updatePayload.nameEn = updates.nameEn;
  if (updates.hourlyRate !== undefined) updatePayload.hourlyRate = updates.hourlyRate;
  if (updates.dailyRate !== undefined) updatePayload.dailyRate = updates.dailyRate;
  if (updates.overtimeMultiplier !== undefined) updatePayload.overtimeMultiplier = updates.overtimeMultiplier;
  if (updates.monthlyAmount !== undefined) updatePayload.monthlyAmount = updates.monthlyAmount;
  if (updates.allocationBase !== undefined) updatePayload.allocationBase = updates.allocationBase;
  if (updates.allocationRate !== undefined) updatePayload.allocationRate = updates.allocationRate;
  if (updates.allocationUnit !== undefined) updatePayload.allocationUnit = updates.allocationUnit;
  if (updates.markupPercent !== undefined) updatePayload.markupPercent = updates.markupPercent;
  if (updates.minMarkup !== undefined) updatePayload.minMarkup = updates.minMarkup;
  if (updates.applyTo !== undefined) updatePayload.applyTo = updates.applyTo;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.effectiveFrom !== undefined) updatePayload.effectiveFrom = updates.effectiveFrom;
  if (updates.effectiveTo !== undefined) updatePayload.effectiveTo = updates.effectiveTo;
  if (updates.isActive !== undefined) updatePayload.isActive = updates.isActive;
  if (updates.sortOrder !== undefined) updatePayload.sortOrder = updates.sortOrder;

  const result = await db
    .update(schema.costStandards)
    .set(updatePayload)
    .where(eq(schema.costStandards.id, id))
    .returning();

  return result[0] ?? null;
}

interface CreateCostStandardData {
  category: string;
  code: string;
  name: string;
  nameEn?: string;
  hourlyRate?: string;
  dailyRate?: string;
  overtimeMultiplier?: string;
  monthlyAmount?: string;
  allocationBase?: string;
  allocationRate?: string;
  allocationUnit?: string;
  markupPercent?: string;
  minMarkup?: string;
  applyTo?: string;
  description?: string;
  effectiveFrom?: string;
  sortOrder?: number;
}

export async function createCostStandard(data: CreateCostStandardData) {
  const db = await requireDb();

  const result = await db
    .insert(schema.costStandards)
    .values({
      category: data.category,
      code: data.code,
      name: data.name,
      nameEn: data.nameEn,
      hourlyRate: data.hourlyRate,
      dailyRate: data.dailyRate,
      overtimeMultiplier: data.overtimeMultiplier ?? "1.50",
      monthlyAmount: data.monthlyAmount,
      allocationBase: data.allocationBase,
      allocationRate: data.allocationRate,
      allocationUnit: data.allocationUnit,
      markupPercent: data.markupPercent,
      minMarkup: data.minMarkup,
      applyTo: data.applyTo,
      description: data.description,
      effectiveFrom: data.effectiveFrom,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();

  return result[0];
}

// ============================================
// Product Configurations
// ============================================

interface ListProductConfigsOpts {
  search?: string;
  equipmentType?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listProductConfigs(opts: ListProductConfigsOpts) {
  const db = await requireDb();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.search) {
    conditions.push(like(schema.productConfigurations.productName, `%${opts.search}%`));
  }
  if (opts.equipmentType) {
    conditions.push(eq(schema.productConfigurations.equipmentType, opts.equipmentType));
  }
  if (opts.isActive !== undefined) {
    conditions.push(eq(schema.productConfigurations.isActive, opts.isActive));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(schema.productConfigurations)
    .where(where)
    .orderBy(desc(schema.productConfigurations.id))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.productConfigurations)
    .where(where);

  const total = Number(countResult[0]?.count ?? 0);

  return { items, total, page, pageSize };
}

interface CreateProductConfigData {
  modelCode: string;
  productName: string;
  productNameEn?: string;
  bomCode?: string;
  bomId?: number;
  materialCost?: string;
  laborCost?: string;
  overheadCost?: string;
  otherCost?: string;
  basePrice?: string;
  marginPercent?: string;
  equipmentType?: string;
  description?: string;
}

export async function createProductConfig(data: CreateProductConfigData) {
  const db = await requireDb();

  const result = await db
    .insert(schema.productConfigurations)
    .values({
      modelCode: data.modelCode,
      productName: data.productName,
      productNameEn: data.productNameEn,
      bomCode: data.bomCode,
      bomId: data.bomId,
      materialCost: data.materialCost ?? "0",
      laborCost: data.laborCost ?? "0",
      overheadCost: data.overheadCost ?? "0",
      otherCost: data.otherCost ?? "0",
      basePrice: data.basePrice ?? "0",
      marginPercent: data.marginPercent,
      equipmentType: data.equipmentType,
      description: data.description,
    })
    .returning();

  return result[0];
}

export async function updateProductConfig(data: { id: number } & Partial<CreateProductConfigData>) {
  const db = await requireDb();
  const { id, ...updates } = data;

  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      updatePayload[key] = value;
    }
  }

  const result = await db
    .update(schema.productConfigurations)
    .set(updatePayload)
    .where(eq(schema.productConfigurations.id, id))
    .returning();

  return result[0] ?? null;
}

/**
 * 计算产品成本: 基于关联BOM的物料成本 + 人工标准 + 制造费用分摊
 * 返回成本分解明细
 */
export async function calculateProductCost(configId: number) {
  const db = await requireDb();

  // Fetch the product configuration
  const configs = await db
    .select()
    .from(schema.productConfigurations)
    .where(eq(schema.productConfigurations.id, configId))
    .limit(1);

  const config = configs[0];
  if (!config) {
    throw new Error(`Product configuration not found: ${configId}`);
  }

  // Fetch active labor rates
  const laborStandards = await db
    .select()
    .from(schema.costStandards)
    .where(and(
      eq(schema.costStandards.category, "labor"),
      eq(schema.costStandards.isActive, true),
    ));

  // Fetch active overhead rates
  const overheadStandards = await db
    .select()
    .from(schema.costStandards)
    .where(and(
      eq(schema.costStandards.category, "overhead"),
      eq(schema.costStandards.isActive, true),
    ));

  // Fetch material markup rates
  const markupStandards = await db
    .select()
    .from(schema.costStandards)
    .where(and(
      eq(schema.costStandards.category, "material_markup"),
      eq(schema.costStandards.isActive, true),
    ));

  const materialCost = Number(config.materialCost) || 0;
  const laborCost = Number(config.laborCost) || 0;
  const overheadCost = Number(config.overheadCost) || 0;
  const otherCost = Number(config.otherCost) || 0;
  const totalCost = materialCost + laborCost + overheadCost + otherCost;
  const basePrice = Number(config.basePrice) || 0;
  const margin = basePrice > 0 ? ((basePrice - totalCost) / basePrice) * 100 : 0;

  return {
    configId: config.id,
    modelCode: config.modelCode,
    productName: config.productName,
    bomCode: config.bomCode,
    costBreakdown: {
      materialCost,
      laborCost,
      overheadCost,
      otherCost,
      totalCost,
    },
    basePrice,
    calculatedMargin: Math.round(margin * 10) / 10,
    laborStandardsCount: laborStandards.length,
    overheadStandardsCount: overheadStandards.length,
    markupRulesCount: markupStandards.length,
    calculatedAt: new Date().toISOString(),
  };
}
