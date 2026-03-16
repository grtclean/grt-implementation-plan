/**
 * Cost alert rule version management
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  costAlertRules, costAlertRuleVersions,
} from "../../drizzle/schema";

// ============================================
// v1.3.9 - Cost Alert Rule Version Management
// ============================================

export async function saveRuleVersion(ruleId: number, ruleData: any, changedBy?: number, changeSummary?: string) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  // Get current max version number
  const versions = await db.select({ versionNumber: costAlertRuleVersions.versionNumber })
    .from(costAlertRuleVersions)
    .where(eq(costAlertRuleVersions.ruleId, ruleId))
    .orderBy(desc(costAlertRuleVersions.versionNumber))
    .limit(1);
  
  const newVersionNumber = (versions[0]?.versionNumber || 0) + 1;
  
  await db.insert(costAlertRuleVersions).values({
    ruleId,
    versionNumber: newVersionNumber,
    ruleData: JSON.stringify(ruleData),
    changeSummary,
    changedBy
  });
  
  return { success: true, versionNumber: newVersionNumber };
}

export async function getRuleVersions(ruleId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select()
    .from(costAlertRuleVersions)
    .where(eq(costAlertRuleVersions.ruleId, ruleId))
    .orderBy(desc(costAlertRuleVersions.versionNumber))
    .limit(1000);
}

export async function getRuleVersion(ruleId: number, versionNumber: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const [version] = await db.select()
    .from(costAlertRuleVersions)
    .where(and(
      eq(costAlertRuleVersions.ruleId, ruleId),
      eq(costAlertRuleVersions.versionNumber, versionNumber)
    ))
    .limit(1000);

  return version || null;
}

export async function rollbackRuleToVersion(ruleId: number, versionNumber: number, userId?: number) {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const version = await getRuleVersion(ruleId, versionNumber);
  if (!version) {
    return { success: false, error: "版本不存在" };
  }
  
  const ruleData = JSON.parse(version.ruleData);
  
  // Update the rule
  await db.update(costAlertRules)
    .set({
      name: ruleData.name,
      description: ruleData.description,
      scope: ruleData.scope,
      projectId: ruleData.projectId,
      categoryId: ruleData.categoryId,
      alertType: ruleData.alertType,
      threshold: ruleData.threshold,
      alertLevel: ruleData.alertLevel,
      notifyType: ruleData.notifyType,
      notifyUserIds: ruleData.notifyUserIds,
      isActive: ruleData.isActive
    })
    .where(eq(costAlertRules.id, ruleId));
  
  // Save new version (rollback is also recorded as a new version)
  await saveRuleVersion(ruleId, ruleData, userId, `回滚到版本 ${versionNumber}`);
  
  return { success: true };
}

export function compareRuleVersions(oldVersionData: string, newVersionData: string) {
  const oldRule = JSON.parse(oldVersionData);
  const newRule = JSON.parse(newVersionData);
  
  const fieldLabels: Record<string, string> = {
    name: "规则名称",
    description: "描述",
    scope: "适用范围",
    projectId: "项目ID",
    categoryId: "类别ID",
    alertType: "预警类型",
    threshold: "阈值",
    alertLevel: "预警级别",
    notifyType: "通知方式",
    notifyUserIds: "通知用户",
    isActive: "启用状态"
  };
  
  const diffs: Array<{
    field: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'removed' | 'modified';
  }> = [];
  
  const allKeys = new Set([...Object.keys(oldRule), ...Object.keys(newRule)]);
  
  for (const key of Array.from(allKeys)) {
    const oldValue = oldRule[key];
    const newValue = newRule[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({
        field: key,
        fieldLabel: fieldLabels[key] || key,
        oldValue,
        newValue,
        changeType: oldValue === undefined ? 'added' : 
                    newValue === undefined ? 'removed' : 'modified'
      });
    }
  }
  
  return diffs;
}
