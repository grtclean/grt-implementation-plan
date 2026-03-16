/**
 * Webhook trigger conditions and evaluation
 * Auto-decomposed from server/db.ts
 */
import { eq } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  webhookTriggerConditions, InsertWebhookTriggerCondition,
} from "../../drizzle/schema";

// ============================================
// v1.3.9 - Webhook Trigger Conditions
// ============================================

export async function getWebhookConditions(webhookId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select()
    .from(webhookTriggerConditions)
    .where(eq(webhookTriggerConditions.webhookId, webhookId))
    .orderBy(webhookTriggerConditions.sortOrder)
    .limit(1000);
}

export async function saveWebhookConditions(webhookId: number, conditions: InsertWebhookTriggerCondition[]) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  // Delete existing conditions
  await db.delete(webhookTriggerConditions)
    .where(eq(webhookTriggerConditions.webhookId, webhookId));
  
  // Insert new conditions
  if (conditions.length > 0) {
    const conditionsWithWebhookId = conditions.map((c, index) => ({
      ...c,
      webhookId,
      sortOrder: index
    }));
    await db.insert(webhookTriggerConditions).values(conditionsWithWebhookId);
  }
  
  return { success: true };
}

export async function deleteWebhookConditions(webhookId: number) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.delete(webhookTriggerConditions)
    .where(eq(webhookTriggerConditions.webhookId, webhookId));
  
  return { success: true };
}

// Condition evaluation engine
interface TriggerCondition {
  field: string;
  operator: string;
  value: string;
  logicOperator?: string;
}

export function evaluateCondition(condition: TriggerCondition, context: Record<string, any>): boolean {
  const fieldValue = context[condition.field];
  let conditionValue: any;
  
  try {
    conditionValue = JSON.parse(condition.value);
  } catch {
    conditionValue = condition.value;
  }
  
  switch (condition.operator) {
    case 'eq': return fieldValue === conditionValue;
    case 'ne': return fieldValue !== conditionValue;
    case 'gt': return Number(fieldValue) > Number(conditionValue);
    case 'lt': return Number(fieldValue) < Number(conditionValue);
    case 'gte': return Number(fieldValue) >= Number(conditionValue);
    case 'lte': return Number(fieldValue) <= Number(conditionValue);
    case 'in': 
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'between':
      if (Array.isArray(conditionValue) && conditionValue.length === 2) {
        const val = Number(fieldValue);
        return val >= Number(conditionValue[0]) && val <= Number(conditionValue[1]);
      }
      return false;
    case 'contains':
      return String(fieldValue).includes(String(conditionValue));
    case 'startsWith':
      return String(fieldValue).startsWith(String(conditionValue));
    case 'endsWith':
      return String(fieldValue).endsWith(String(conditionValue));
    default: 
      return true;
  }
}

export function evaluateAllConditions(conditions: TriggerCondition[], context: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  let result = evaluateCondition(conditions[0], context);
  
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateCondition(condition, context);
    
    if (condition.logicOperator === 'OR') {
      result = result || conditionResult;
    } else {
      result = result && conditionResult;
    }
  }
  
  return result;
}
