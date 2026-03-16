/**
 * Cost alert rule templates
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  costAlertRules, costAlertRuleTemplates, CostAlertRuleTemplate, InsertCostAlertRuleTemplate,
} from "../../drizzle/schema";

// ============================================
// v1.3.11 - Cost Alert Rule Templates
// ============================================

/**
 * Get all alert rule templates
 */
export async function getAlertRuleTemplates(filters?: {
  category?: "budget" | "performance" | "cost" | "risk";
  templateType?: "builtin" | "custom";
}): Promise<CostAlertRuleTemplate[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const conditions = [eq(costAlertRuleTemplates.isActive, 1)];
  
  if (filters?.category) {
    conditions.push(eq(costAlertRuleTemplates.category, filters.category));
  }
  if (filters?.templateType) {
    conditions.push(eq(costAlertRuleTemplates.templateType, filters.templateType));
  }
  
  return db.select()
    .from(costAlertRuleTemplates)
    .where(and(...conditions))
    .orderBy(desc(costAlertRuleTemplates.usageCount), costAlertRuleTemplates.name)
    .limit(1000);
}

/**
 * Get template by ID
 */
export async function getAlertRuleTemplateById(id: number): Promise<CostAlertRuleTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(costAlertRuleTemplates)
    .where(eq(costAlertRuleTemplates.id, id));
  
  return result[0] || null;
}

/**
 * Create a new template
 */
export async function createAlertRuleTemplate(data: InsertCostAlertRuleTemplate): Promise<CostAlertRuleTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(costAlertRuleTemplates).values(data) as any;
  const insertId = result[0]?.insertId ?? result.insertId;

  return getAlertRuleTemplateById(insertId);
}

/**
 * Update a template
 */
export async function updateAlertRuleTemplate(
  id: number, 
  data: Partial<InsertCostAlertRuleTemplate>
): Promise<CostAlertRuleTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(costAlertRuleTemplates)
    .set(data)
    .where(eq(costAlertRuleTemplates.id, id));
  
  return getAlertRuleTemplateById(id);
}

/**
 * Delete a template (soft delete by setting isActive to 0)
 */
export async function deleteAlertRuleTemplate(id: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  await db.update(costAlertRuleTemplates)
    .set({ isActive: 0 })
    .where(eq(costAlertRuleTemplates.id, id));
  
  return true;
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await requireDb();
  if (!db) return;
  
  const template = await getAlertRuleTemplateById(id);
  if (template) {
    await db.update(costAlertRuleTemplates)
      .set({ usageCount: template.usageCount + 1 })
      .where(eq(costAlertRuleTemplates.id, id));
  }
}

/**
 * Create rule from template
 */
export async function createRuleFromTemplate(templateId: number, overrides?: {
  name?: string;
  projectId?: number;
  categoryId?: number;
}): Promise<{ success: boolean; ruleId?: number; error?: string }> {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const template = await getAlertRuleTemplateById(templateId);
  if (!template) {
    return { success: false, error: "Template not found" };
  }
  
  try {
    const config = JSON.parse(template.ruleConfig);
    
    const result = await db.insert(costAlertRules).values({
      name: overrides?.name || `${template.name} (从模板创建)`,
      description: template.description,
      scope: config.scope || "all",
      projectId: overrides?.projectId || config.projectId || null,
      categoryId: overrides?.categoryId || config.categoryId || null,
      alertType: config.alertType,
      threshold: config.threshold,
      alertLevel: config.alertLevel,
      notifyType: config.notifyType || "system",
      notifyUserIds: config.notifyUserIds || null,
      isActive: 1,
    } as any) as any;

    // Increment usage count
    await incrementTemplateUsage(templateId);

    return { success: true, ruleId: result[0]?.insertId ?? result.insertId };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create rule from template" };
  }
}

/**
 * Save current rule as template
 */
export async function saveRuleAsTemplate(
  ruleId: number, 
  templateName: string,
  category: "budget" | "performance" | "cost" | "risk",
  description?: string,
  userId?: number
): Promise<{ success: boolean; templateId?: number; error?: string }> {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const rule = await getCostAlertRuleById(ruleId);
  if (!rule) {
    return { success: false, error: "Rule not found" };
  }
  
  const ruleConfig = JSON.stringify({
    scope: rule.scope,
    alertType: rule.alertType,
    threshold: rule.threshold,
    alertLevel: rule.alertLevel,
    notifyType: rule.notifyType,
    notifyUserIds: rule.notifyUserIds,
  });
  
  const result = await db.insert(costAlertRuleTemplates).values({
    name: templateName,
    description: description || rule.description,
    templateType: "custom",
    category,
    ruleConfig,
    usageCount: 0,
    isActive: 1,
    createdBy: userId || null,
  } as any) as any;

  return { success: true, templateId: result[0]?.insertId ?? result.insertId };
}

/**
 * Initialize built-in templates
 */
export async function initializeBuiltinTemplates(): Promise<{ created: number; skipped: number }> {
  const db = await requireDb();
  if (!db) return { created: 0, skipped: 0 };
  
  const builtinTemplates = [
    // Budget category
    {
      name: "预算使用80%预警",
      description: "当项目预算使用达到80%时触发警告级别预警",
      templateType: "builtin" as const,
      category: "budget" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "budget_percent",
        threshold: 80,
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "预算使用95%预警",
      description: "当项目预算使用达到95%时触发严重级别预警",
      templateType: "builtin" as const,
      category: "budget" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "budget_percent",
        threshold: 95,
        alertLevel: "critical",
        notifyType: "both"
      })
    },
    {
      name: "预算超支预警",
      description: "当项目预算使用超过100%时触发紧急级别预警",
      templateType: "builtin" as const,
      category: "budget" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "emergency",
        notifyType: "both"
      })
    },
    // Performance category
    {
      name: "CPI低于0.9预警",
      description: "当成本绩效指数(CPI)低于0.9时触发警告，表示成本效率较低",
      templateType: "builtin" as const,
      category: "performance" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "cpi",
        threshold: 90, // stored as 90 for 0.9
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "CPI低于0.8预警",
      description: "当成本绩效指数(CPI)低于0.8时触发严重预警，表示成本严重超支",
      templateType: "builtin" as const,
      category: "performance" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "cpi",
        threshold: 80, // stored as 80 for 0.8
        alertLevel: "critical",
        notifyType: "both"
      })
    },
    // Cost category
    {
      name: "单笔支出超10万预警",
      description: "当单笔成本支出超过10万元时触发预警",
      templateType: "builtin" as const,
      category: "cost" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "absolute_amount",
        threshold: 10000000, // 10万元 = 10000000分
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "单笔支出超50万预警",
      description: "当单笔成本支出超过50万元时触发严重预警",
      templateType: "builtin" as const,
      category: "cost" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "absolute_amount",
        threshold: 50000000, // 50万元 = 50000000分
        alertLevel: "critical",
        notifyType: "both"
      })
    },
    // Risk category
    {
      name: "材料成本超预算预警",
      description: "当材料成本类别超过预算时触发预警",
      templateType: "builtin" as const,
      category: "risk" as const,
      ruleConfig: JSON.stringify({
        scope: "category",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "人工成本超预算预警",
      description: "当人工成本类别超过预算时触发预警",
      templateType: "builtin" as const,
      category: "risk" as const,
      ruleConfig: JSON.stringify({
        scope: "category",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "差旅费超预算预警",
      description: "当差旅费用超过预算时触发预警",
      templateType: "builtin" as const,
      category: "risk" as const,
      ruleConfig: JSON.stringify({
        scope: "category",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "warning",
        notifyType: "system"
      })
    }
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const template of builtinTemplates) {
    // Check if template already exists
    const existing = await db.select()
      .from(costAlertRuleTemplates)
      .where(and(
        eq(costAlertRuleTemplates.name, template.name),
        eq(costAlertRuleTemplates.templateType, "builtin")
      ))
      .limit(1000);

    if (existing.length > 0) {
      skipped++;
      continue;
    }
    
    await db.insert(costAlertRuleTemplates).values(template);
    created++;
  }
  
  return { created, skipped };
}
