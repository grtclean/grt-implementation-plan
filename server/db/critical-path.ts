/**
 * Critical path calculation for annual planning
 * Auto-decomposed from server/db.ts
 */
import { eq } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  annualPlanningItems, annualPlanningDependencies,
} from "../../drizzle/schema";

// ============================================
// v1.3.11 - Critical Path Calculation
// ============================================

export interface CriticalPathItem {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  duration: number; // days
  earliestStart: number; // days from project start
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  totalFloat: number; // total slack
  freeFloat: number; // free slack
  isCritical: boolean;
}

export interface CriticalPathResult {
  criticalPath: number[]; // item IDs on critical path
  items: CriticalPathItem[];
  projectDuration: number; // total project duration in days
  criticalPathLength: number; // critical path duration
}

/**
 * Calculate critical path for annual planning items
 * Uses Forward Pass and Backward Pass algorithm
 */
export async function calculateCriticalPath(configId: number): Promise<CriticalPathResult> {
  const db = await requireDb();
  if (!db) {
    return { criticalPath: [], items: [], projectDuration: 0, criticalPathLength: 0 };
  }
  
  // Get all items for this config
  const items = await db.select()
    .from(annualPlanningItems)
    .where(eq(annualPlanningItems.configId, configId))
    .limit(1000);

  // Get all dependencies
  const dependencies = await getItemDependencies(configId);
  
  if (items.length === 0) {
    return { criticalPath: [], items: [], projectDuration: 0, criticalPathLength: 0 };
  }
  
  // Calculate duration for each item (in days)
  const itemMap = new Map<number, CriticalPathItem>();
  let projectStartDate: Date | null = null;
  
  for (const item of items) {
    if (!item.startDate || !item.endDate) continue;
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (!projectStartDate || startDate < projectStartDate) {
      projectStartDate = startDate;
    }
    
    itemMap.set(item.id, {
      id: item.id,
      name: item.name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false
    });
  }
  
  if (!projectStartDate) {
    return { criticalPath: [], items: [], projectDuration: 0, criticalPathLength: 0 };
  }
  
  // Calculate earliest start relative to project start
  for (const [id, item] of Array.from(itemMap.entries())) {
    const daysDiff = Math.ceil((new Date(item.startDate).getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
    item.earliestStart = daysDiff;
    item.earliestFinish = daysDiff + item.duration - 1;
  }
  
  // Build dependency graph (predecessor -> successors)
  const successors = new Map<number, number[]>();
  const predecessors = new Map<number, number[]>();
  
  for (const dep of dependencies) {
    if (!successors.has(dep.sourceItemId)) {
      successors.set(dep.sourceItemId, []);
    }
    successors.get(dep.sourceItemId)!.push(dep.targetItemId);
    
    if (!predecessors.has(dep.targetItemId)) {
      predecessors.set(dep.targetItemId, []);
    }
    predecessors.get(dep.targetItemId)!.push(dep.sourceItemId);
  }
  
  // Forward Pass - Calculate Earliest Start/Finish considering dependencies
  // Topological sort
  const inDegree = new Map<number, number>();
  for (const [id] of Array.from(itemMap.entries())) {
    inDegree.set(id, (predecessors.get(id) || []).length);
  }
  
  const queue: number[] = [];
  for (const [id, degree] of Array.from(inDegree.entries())) {
    if (degree === 0) {
      queue.push(id);
    }
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = itemMap.get(currentId)!;
    
    // Update successors' earliest start based on this item's finish
    const succs = successors.get(currentId) || [];
    for (const succId of succs) {
      const succ = itemMap.get(succId)!;
      const newEarliestStart = current.earliestFinish + 1;
      if (newEarliestStart > succ.earliestStart) {
        succ.earliestStart = newEarliestStart;
        succ.earliestFinish = newEarliestStart + succ.duration - 1;
      }
      
      inDegree.set(succId, inDegree.get(succId)! - 1);
      if (inDegree.get(succId) === 0) {
        queue.push(succId);
      }
    }
  }
  
  // Find project duration (maximum earliest finish)
  let projectDuration = 0;
  for (const [, item] of Array.from(itemMap.entries())) {
    if (item.earliestFinish > projectDuration) {
      projectDuration = item.earliestFinish;
    }
  }
  
  // Backward Pass - Calculate Latest Start/Finish
  // Initialize latest finish to project duration for items with no successors
  for (const [id, item] of Array.from(itemMap.entries())) {
    const succs = successors.get(id) || [];
    if (succs.length === 0) {
      item.latestFinish = projectDuration;
      item.latestStart = item.latestFinish - item.duration + 1;
    } else {
      item.latestFinish = Infinity;
      item.latestStart = Infinity;
    }
  }
  
  // Reverse topological order
  const outDegree = new Map<number, number>();
  for (const [id] of Array.from(itemMap.entries())) {
    outDegree.set(id, (successors.get(id) || []).length);
  }
  
  const reverseQueue: number[] = [];
  for (const [id, degree] of Array.from(outDegree.entries())) {
    if (degree === 0) {
      reverseQueue.push(id);
    }
  }
  
  while (reverseQueue.length > 0) {
    const currentId = reverseQueue.shift()!;
    const current = itemMap.get(currentId)!;
    
    // Update predecessors' latest finish based on this item's start
    const preds = predecessors.get(currentId) || [];
    for (const predId of preds) {
      const pred = itemMap.get(predId)!;
      const newLatestFinish = current.latestStart - 1;
      if (newLatestFinish < pred.latestFinish) {
        pred.latestFinish = newLatestFinish;
        pred.latestStart = pred.latestFinish - pred.duration + 1;
      }
      
      outDegree.set(predId, outDegree.get(predId)! - 1);
      if (outDegree.get(predId) === 0) {
        reverseQueue.push(predId);
      }
    }
  }
  
  // Calculate Float and identify critical path
  const criticalPath: number[] = [];
  
  for (const [id, item] of Array.from(itemMap.entries())) {
    // Total Float = Latest Start - Earliest Start
    item.totalFloat = item.latestStart - item.earliestStart;
    
    // Free Float = Min(Earliest Start of successors) - Earliest Finish - 1
    const succs = successors.get(id) || [];
    if (succs.length > 0) {
      let minSuccEarliestStart = Infinity;
      for (const succId of succs) {
        const succ = itemMap.get(succId)!;
        if (succ.earliestStart < minSuccEarliestStart) {
          minSuccEarliestStart = succ.earliestStart;
        }
      }
      item.freeFloat = minSuccEarliestStart - item.earliestFinish - 1;
    } else {
      item.freeFloat = projectDuration - item.earliestFinish;
    }
    
    // Item is critical if total float is 0
    item.isCritical = item.totalFloat === 0;
    if (item.isCritical) {
      criticalPath.push(id);
    }
  }
  
  // Sort critical path by earliest start
  criticalPath.sort((a, b) => {
    const itemA = itemMap.get(a)!;
    const itemB = itemMap.get(b)!;
    return itemA.earliestStart - itemB.earliestStart;
  });
  
  // Calculate critical path length
  let criticalPathLength = 0;
  for (const id of criticalPath) {
    const item = itemMap.get(id)!;
    criticalPathLength = Math.max(criticalPathLength, item.earliestFinish);
  }
  
  return {
    criticalPath,
    items: Array.from(itemMap.values()),
    projectDuration: projectDuration + 1, // Convert to 1-based
    criticalPathLength: criticalPathLength + 1
  };
}

/**
 * Get items on the critical path
 */
export async function getCriticalPathItems(configId: number): Promise<CriticalPathItem[]> {
  const result = await calculateCriticalPath(configId);
  return result.items.filter(item => item.isCritical);
}

/**
 * Check if adding a dependency would affect the critical path
 */
export async function checkCriticalPathImpact(
  configId: number, 
  sourceItemId: number, 
  targetItemId: number
): Promise<{
  wouldAffectCriticalPath: boolean;
  currentCriticalPath: number[];
  newCriticalPath: number[];
  durationChange: number;
}> {
  // Get current critical path
  const currentResult = await calculateCriticalPath(configId);
  
  // Temporarily add the dependency and recalculate
  const db = await requireDb();
  if (!db) {
    return {
      wouldAffectCriticalPath: false,
      currentCriticalPath: [],
      newCriticalPath: [],
      durationChange: 0
    };
  }
  
  // Add temporary dependency
  const tempDep = await db.insert(annualPlanningDependencies).values({
    configId,
    sourceItemId,
    targetItemId,
    dependencyType: 'FS'
  });
  
  // Calculate new critical path
  const newResult = await calculateCriticalPath(configId);
  
  // Remove temporary dependency
  await db.delete(annualPlanningDependencies)
    .where(eq(annualPlanningDependencies.id, (tempDep as any)[0]?.insertId ?? (tempDep as any).insertId));
  
  // Compare results
  const currentSet = new Set(currentResult.criticalPath);
  const newSet = new Set(newResult.criticalPath);
  
  const wouldAffectCriticalPath = 
    currentResult.criticalPath.length !== newResult.criticalPath.length ||
    !currentResult.criticalPath.every(id => newSet.has(id));
  
  return {
    wouldAffectCriticalPath,
    currentCriticalPath: currentResult.criticalPath,
    newCriticalPath: newResult.criticalPath,
    durationChange: newResult.projectDuration - currentResult.projectDuration
  };
}
