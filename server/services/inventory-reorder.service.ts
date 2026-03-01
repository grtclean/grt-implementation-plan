/**
 * Inventory Auto-Reorder Service
 *
 * Checks all materials where inventory falls below reorder point,
 * automatically creates purchase requests, and routes small-value
 * items (<50 元/件) through the small-value procurement flow.
 */
import { requireDb } from "../db";
import { inventory, materials } from "../../drizzle/material-schema";
import { purchaseRequests } from "../../drizzle/procurement-schema";
import { smallValueProcurements } from "../../drizzle/p2p-lifecycle-schema";
import { eq, lte, and, sql } from "drizzle-orm";

function generateCode(prefix: string) {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `${prefix}-${dateStr}-${rand}`;
}

export interface ReorderResult {
  checked: number;
  belowReorderPoint: number;
  purchaseRequestsCreated: number;
  smallValueCreated: number;
  skipped: number;
  errors: string[];
}

/**
 * Main reorder check — call from a cron job or manual trigger.
 *
 * 1. Query all inventory rows where quantityAvailable <= material.reorderPoint (fallback: safetyStockLevel)
 * 2. Skip materials that already have a pending purchase request
 * 3. For items with lastPurchasePrice < 50: route to smallValueProcurements
 * 4. For others: create a standard purchaseRequest
 */
export async function runInventoryReorderCheck(): Promise<ReorderResult> {
  const result: ReorderResult = {
    checked: 0,
    belowReorderPoint: 0,
    purchaseRequestsCreated: 0,
    smallValueCreated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const db = await requireDb();

    // Get all inventory rows
    const allInventory = await db.select().from(inventory).limit(1000);
    // Get all materials for reorder points
    const allMaterials = await db.select().from(materials).limit(1000);
    const materialMap = new Map(allMaterials.map(m => [m.id, m]));

    result.checked = allInventory.length;

    // Check existing pending purchase requests to avoid duplicates
    const pendingPRs = await db.select().from(purchaseRequests).limit(1000);
    const pendingMaterialIds = new Set(
      pendingPRs
        .filter(pr => pr.status === "draft" || pr.status === "pending" || pr.status === "submitted")
        .map(pr => pr.materialId)
    );

    for (const inv of allInventory) {
      const mat = materialMap.get(inv.materialId);
      if (!mat) continue;

      const available = inv.quantityAvailable ?? 0;
      const reorderPoint = mat.reorderPoint ?? mat.safetyStockLevel ?? 0;

      if (reorderPoint <= 0 || available > reorderPoint) continue;

      result.belowReorderPoint++;

      // Skip if there's already a pending PR for this material
      if (pendingMaterialIds.has(inv.materialId)) {
        result.skipped++;
        continue;
      }

      const maxStock = mat.maxStockLevel ?? reorderPoint * 3;
      const orderQty = Math.max(maxStock - available, 1);
      const unitPrice = Number(mat.lastPurchasePrice || 0);

      try {
        if (unitPrice > 0 && unitPrice < 50) {
          // Small value procurement flow
          await db.insert(smallValueProcurements).values({
            requestCode: generateCode("SVP"),
            materialName: mat.materialName,
            materialCode: mat.materialCode,
            quantity: orderQty,
            unit: "件",
            estimatedUnitPrice: unitPrice.toFixed(2),
            estimatedTotalAmount: (unitPrice * orderQty).toFixed(2),
            purpose: `自动补货: 库存${available}低于安全库存${reorderPoint}`,
            status: "pending_supervisor",
          });
          result.smallValueCreated++;
        } else {
          // Standard purchase request
          const requiredDate = new Date();
          requiredDate.setDate(requiredDate.getDate() + 7); // 7 day lead time default
          await db.insert(purchaseRequests).values({
            requestCode: generateCode("PR"),
            department: "仓库管理",
            requestedBy: 1, // System auto
            requiredDate: requiredDate.toISOString(),
            materialId: inv.materialId,
            quantity: orderQty,
            estimatedUnitPrice: unitPrice > 0 ? unitPrice.toFixed(2) : undefined,
            estimatedTotalAmount: unitPrice > 0 ? (unitPrice * orderQty).toFixed(2) : undefined,
            purpose: `自动补货: 库存${available}低于安全库存${reorderPoint}`,
            status: "draft",
          });
          result.purchaseRequestsCreated++;
        }
        pendingMaterialIds.add(inv.materialId);
      } catch (err: any) {
        result.errors.push(`Material ${mat.materialCode}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Service error: ${err.message}`);
  }

  return result;
}

/**
 * Get current reorder alerts without creating PRs — for dashboard display.
 */
export async function getReorderAlerts() {
  try {
    const db = await requireDb();
    const allInventory = await db.select().from(inventory).limit(1000);
    const allMaterials = await db.select().from(materials).limit(1000);
    const materialMap = new Map(allMaterials.map(m => [m.id, m]));

    const alerts = [];
    for (const inv of allInventory) {
      const mat = materialMap.get(inv.materialId);
      if (!mat) continue;
      const available = inv.quantityAvailable ?? 0;
      const reorderPoint = mat.reorderPoint ?? mat.safetyStockLevel ?? 0;
      if (reorderPoint > 0 && available <= reorderPoint) {
        alerts.push({
          materialId: inv.materialId,
          materialCode: mat.materialCode,
          materialName: mat.materialName,
          currentStock: available,
          safetyStock: reorderPoint,
          maxStock: mat.maxStockLevel ?? 0,
          suggestedOrderQty: Math.max((mat.maxStockLevel ?? reorderPoint * 3) - available, 1),
          unitPrice: mat.lastPurchasePrice,
          isSmallValue: Number(mat.lastPurchasePrice || 0) < 50 && Number(mat.lastPurchasePrice || 0) > 0,
        });
      }
    }
    return alerts;
  } catch {
    return [];
  }
}
