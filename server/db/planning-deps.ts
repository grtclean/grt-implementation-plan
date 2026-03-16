/**
 * Annual planning dependencies
 * Auto-decomposed from server/db.ts
 */
import { eq, and } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  annualPlanningDependencies, InsertAnnualPlanningDependency,
} from "../../drizzle/schema";

// ============================================
// v1.3.9 - Annual Planning Dependencies
// ============================================

export async function getItemDependencies(configId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select()
    .from(annualPlanningDependencies)
    .where(eq(annualPlanningDependencies.configId, configId))
    .limit(1000);
}

export async function addItemDependency(data: InsertAnnualPlanningDependency) {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Check for cyclic dependency
  const hasCycle = await checkCyclicDependency(data.configId, data.sourceItemId, data.targetItemId);
  if (hasCycle) {
    return { success: false, error: "检测到循环依赖，无法添加" };
  }
  
  // Check for duplicate
  const existing = await db.select()
    .from(annualPlanningDependencies)
    .where(and(
      eq(annualPlanningDependencies.sourceItemId, data.sourceItemId),
      eq(annualPlanningDependencies.targetItemId, data.targetItemId)
    ))
    .limit(1000);

  if (existing.length > 0) {
    return { success: false, error: "该依赖关系已存在" };
  }
  
  const result = await db.insert(annualPlanningDependencies).values(data) as any;
  return { success: true, id: result[0]?.insertId ?? result.insertId };
}

export async function removeItemDependency(id: number) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.delete(annualPlanningDependencies)
    .where(eq(annualPlanningDependencies.id, id));
  
  return { success: true };
}

// Cyclic dependency detection using DFS
async function checkCyclicDependency(configId: number, sourceId: number, targetId: number): Promise<boolean> {
  const dependencies = await getItemDependencies(configId);
  const graph = new Map<number, number[]>();
  
  // Build adjacency list
  for (const dep of dependencies) {
    if (!graph.has(dep.sourceItemId)) {
      graph.set(dep.sourceItemId, []);
    }
    graph.get(dep.sourceItemId)!.push(dep.targetItemId);
  }
  
  // Add the new edge
  if (!graph.has(sourceId)) {
    graph.set(sourceId, []);
  }
  graph.get(sourceId)!.push(targetId);
  
  // DFS to detect cycle
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function dfs(node: number): boolean {
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  for (const node of Array.from(graph.keys())) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }
  
  return false;
}
