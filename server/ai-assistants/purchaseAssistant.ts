/**
 * AI Purchase Assistant - 采购助手
 * 供应商推荐、价格比较、采购策略、采购计划、供应商风险评估
 */
import { requireDb } from "../db";
import { suppliers, purchaseOrders, purchaseReceipts } from "../../drizzle/procurement-schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================
export interface SupplierRecommendation {
  supplierId: number; supplierCode: string; supplierName: string;
  overallScore: number; priceScore: number; qualityScore: number; deliveryScore: number;
  isPreferred: boolean; highlights: string[];
  avgUnitPrice: number | null; avgLeadTimeDays: number | null;
}
export interface PriceComparisonEntry {
  supplierId: number; supplierName: string;
  currentUnitPrice: number; historicalAvgPrice: number;
  minPrice: number; maxPrice: number; orderCount: number;
  trend: "rising" | "stable" | "falling"; lastOrderDate: string | null;
}
export interface PriceComparisonMatrix {
  materialId: number; comparedAt: string; entries: PriceComparisonEntry[];
  cheapestSupplier: string; bestValueSupplier: string;
}
export interface PurchaseStrategyRecommendation {
  projectId: number; strategy: "jit" | "bulk" | "framework_contract" | "mixed";
  strategyName: string; rationale: string; estimatedSavings: number; risks: string[];
  materialBreakdown: Array<{ materialName: string; recommendedStrategy: string; reason: string }>;
}
export interface PurchasePlanLineItem {
  materialId: number; materialName: string; quantity: number;
  estimatedUnitPrice: number; estimatedTotal: number;
  suggestedSupplierId: number | null; suggestedSupplierName: string;
  requiredDate: string; priority: "urgent" | "high" | "medium" | "low";
}
export interface PurchasePlan {
  planId: string; bomId: number; createdAt: string; totalEstimatedCost: number;
  lineItems: PurchasePlanLineItem[];
  summary: { totalItems: number; urgentItems: number; estimatedLeadTime: number; suggestedSupplierCount: number };
}
export interface SupplierRiskAssessment {
  supplierId: number; supplierName: string; assessedAt: string;
  overallRisk: "low" | "medium" | "high" | "critical"; overallRiskScore: number;
  deliveryRisk: { score: number; level: string; onTimeRate: number; avgDelayDays: number; details: string[] };
  qualityRisk: { score: number; level: string; passRate: number; defectRate: number; details: string[] };
  financialRisk: { score: number; level: string; creditLimit: number; outstandingAmount: number; details: string[] };
  mitigationActions: string[];
}

// ============================================================================
// Helpers
// ============================================================================
function ratingToScore(rating: string | null): number {
  return ({ A: 95, B: 80, C: 65, D: 40 } as Record<string, number>)[rating || "C"] || 65;
}
function riskLevel(score: number): string {
  if (score <= 25) return "low"; if (score <= 50) return "medium";
  if (score <= 75) return "high"; return "critical";
}
function dateOffset(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0];
}
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// ============================================================================
// Core Functions
// ============================================================================
export async function recommendSupplier(
  materialId: number,
  requirements: { maxPrice?: number; minQualityRating?: string; maxLeadTimeDays?: number; preferDomestic?: boolean }
): Promise<SupplierRecommendation[]> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const orderData = await db.select({
    supplierId: purchaseOrders.supplierId, supplierCode: purchaseOrders.supplierCode,
    supplierName: purchaseOrders.supplierName,
    avgPrice: sql<string>`AVG(${purchaseOrders.unitPrice})`,
    orderCount: sql<number>`COUNT(*)`,
  }).from(purchaseOrders).where(eq(purchaseOrders.materialId, materialId))
    .groupBy(purchaseOrders.supplierId, purchaseOrders.supplierCode, purchaseOrders.supplierName);

  const activeSuppliers = await db.select().from(suppliers).where(eq(suppliers.status, "active"));
  const supplierMap = new Map(activeSuppliers.map((s) => [s.id, s]));

  return orderData.filter((od) => supplierMap.has(od.supplierId)).map((od) => {
    const s = supplierMap.get(od.supplierId)!;
    const ps = requirements.maxPrice ? Math.min(100, (requirements.maxPrice / Number(od.avgPrice)) * 80) : 70;
    const qs = ratingToScore(s.qualityRating), ds = ratingToScore(s.deliveryRating);
    const overall = ps * 0.35 + qs * 0.35 + ds * 0.30;
    const hl: string[] = [];
    if (s.isPreferred === "yes") hl.push("首选供应商");
    if (qs >= 90) hl.push("质量评级优秀");
    if (ds >= 90) hl.push("交付准时率高");
    if (od.orderCount > 10) hl.push(`合作${od.orderCount}次`);
    return {
      supplierId: od.supplierId, supplierCode: od.supplierCode, supplierName: od.supplierName,
      overallScore: Math.round(overall * 100) / 100, priceScore: Math.round(ps * 100) / 100,
      qualityScore: qs, deliveryScore: ds, isPreferred: s.isPreferred === "yes",
      highlights: hl, avgUnitPrice: Number(od.avgPrice) || null, avgLeadTimeDays: null,
    };
  }).sort((a, b) => b.overallScore - a.overallScore);
}

export async function compareSupplierPrices(materialId: number, supplierIds: number[]): Promise<PriceComparisonMatrix> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const entries: PriceComparisonEntry[] = [];
  for (const sid of supplierIds) {
    const orders = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.materialId, materialId), eq(purchaseOrders.supplierId, sid)))
      .orderBy(desc(purchaseOrders.poDate));
    if (orders.length === 0) continue;
    const prices = orders.map((o) => Number(o.unitPrice));
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    let trend: PriceComparisonEntry["trend"] = "stable";
    if (orders.length >= 2) {
      const pct = (Number(orders[0].unitPrice) - Number(orders[orders.length - 1].unitPrice)) / Number(orders[orders.length - 1].unitPrice);
      if (pct > 0.05) trend = "rising"; else if (pct < -0.05) trend = "falling";
    }
    entries.push({ supplierId: sid, supplierName: orders[0].supplierName,
      currentUnitPrice: Number(orders[0].unitPrice), historicalAvgPrice: Math.round(avg * 100) / 100,
      minPrice: Math.min(...prices), maxPrice: Math.max(...prices),
      orderCount: orders.length, trend, lastOrderDate: orders[0].poDate });
  }
  entries.sort((a, b) => a.currentUnitPrice - b.currentUnitPrice);
  const bv = [...entries].sort((a, b) => {
    const f = (e: PriceComparisonEntry) => e.currentUnitPrice * (e.trend === "falling" ? 0.9 : e.trend === "rising" ? 1.1 : 1.0);
    return f(a) - f(b);
  })[0];
  return { materialId, comparedAt: new Date().toISOString(), entries,
    cheapestSupplier: entries[0]?.supplierName || "N/A", bestValueSupplier: bv?.supplierName || "N/A" };
}

export async function suggestPurchaseStrategy(projectId: number): Promise<PurchaseStrategyRecommendation> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const recentOrders = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.poDate)).limit(200);
  const totalSpend = recentOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const uniqueMats = Array.from(new Set(recentOrders.map((o) => o.materialId)));
  const matSpend = new Map<number, { name: string; total: number; count: number }>();
  for (const o of recentOrders) {
    const e = matSpend.get(o.materialId);
    if (e) { e.total += Number(o.totalAmount); e.count += 1; }
    else matSpend.set(o.materialId, { name: o.materialName, total: Number(o.totalAmount), count: 1 });
  }
  const sorted = Array.from(matSpend.entries()).sort((a, b) => b[1].total - a[1].total);
  const breakdown = sorted.slice(0, 10).map(([_, info]) => {
    if (info.total > totalSpend * 0.2) return { materialName: info.name, recommendedStrategy: "框架合同", reason: `高价值(占${((info.total / totalSpend) * 100).toFixed(1)}%)` };
    if (info.count >= 5) return { materialName: info.name, recommendedStrategy: "批量采购", reason: `高频(${info.count}次)` };
    return { materialName: info.name, recommendedStrategy: "JIT准时采购", reason: "低频低量" };
  });
  const hvCount = sorted.filter(([_, i]) => i.total > totalSpend * 0.1).length;
  let strategy: PurchaseStrategyRecommendation["strategy"], name: string, rationale: string;
  if (hvCount >= 3) { strategy = "framework_contract"; name = "框架合同为主"; rationale = `${hvCount}种高价值物料，建议框架合同锁定价格`; }
  else if (uniqueMats.length > 20) { strategy = "mixed"; name = "混合策略"; rationale = `${uniqueMats.length}种物料，高中低分层采购`; }
  else { strategy = "bulk"; name = "批量采购"; rationale = "物料集中，批量议价"; }
  return { projectId, strategy, strategyName: name, rationale, estimatedSavings: Math.round(totalSpend * 0.08),
    risks: ["框架合同需求变更风险", "批量采购库存成本", "供应商产能波动"], materialBreakdown: breakdown };
}

export async function generatePurchasePlan(bomId: number): Promise<PurchasePlan> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const bomItems = [
    { materialId: 1, materialName: "不锈钢板材 SUS304", quantity: 20, requiredDate: dateOffset(14) },
    { materialId: 2, materialName: "超声波换能器", quantity: 8, requiredDate: dateOffset(21) },
    { materialId: 3, materialName: "高压泵 15MPa", quantity: 2, requiredDate: dateOffset(28) },
    { materialId: 4, materialName: "PLC控制器 S7-1500", quantity: 1, requiredDate: dateOffset(35) },
    { materialId: 5, materialName: "过滤系统组件", quantity: 4, requiredDate: dateOffset(21) },
  ];
  const lineItems: PurchasePlanLineItem[] = []; let totalCost = 0; let urgentCount = 0;
  for (const item of bomItems) {
    const hist = await db.select().from(purchaseOrders).where(eq(purchaseOrders.materialId, item.materialId)).orderBy(desc(purchaseOrders.poDate)).limit(5);
    const price = hist.length > 0 ? Number(hist[0].unitPrice) : 10000;
    const suppId = hist.length > 0 ? hist[0].supplierId : null;
    const suppName = hist.length > 0 ? hist[0].supplierName : "待定";
    const total = price * item.quantity; totalCost += total;
    const days = Math.ceil((new Date(item.requiredDate).getTime() - Date.now()) / 86400000);
    let pri: PurchasePlanLineItem["priority"] = "medium";
    if (days <= 7) { pri = "urgent"; urgentCount++; } else if (days <= 14) pri = "high"; else if (days > 30) pri = "low";
    lineItems.push({ materialId: item.materialId, materialName: item.materialName, quantity: item.quantity,
      estimatedUnitPrice: price, estimatedTotal: total, suggestedSupplierId: suppId,
      suggestedSupplierName: suppName, requiredDate: item.requiredDate, priority: pri });
  }
  const uniqSupp = Array.from(new Set(lineItems.map((l) => l.suggestedSupplierName).filter((n) => n !== "待定")));
  return { planId: genId("PP"), bomId, createdAt: new Date().toISOString(),
    totalEstimatedCost: Math.round(totalCost * 100) / 100, lineItems,
    summary: { totalItems: lineItems.length, urgentItems: urgentCount, estimatedLeadTime: 35, suggestedSupplierCount: uniqSupp.length } };
}

export async function assessSupplierRisk(supplierId: number): Promise<SupplierRiskAssessment> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  if (rows.length === 0) throw new Error(`Supplier ${supplierId} not found`);
  const supplier = rows[0];
  const orders = await db.select().from(purchaseOrders).where(eq(purchaseOrders.supplierId, supplierId)).orderBy(desc(purchaseOrders.poDate));
  let onTime = 0, delaySum = 0, delivered = 0;
  for (const o of orders) {
    if (o.actualDeliveryDate && o.expectedDeliveryDate) {
      delivered++;
      const diff = (new Date(o.actualDeliveryDate).getTime() - new Date(o.expectedDeliveryDate).getTime()) / 86400000;
      if (diff <= 0) onTime++; else delaySum += diff;
    }
  }
  const onTimeRate = delivered > 0 ? (onTime / delivered) * 100 : 50;
  const avgDelay = delivered > 0 ? delaySum / delivered : 0;
  const receipts = await db.select().from(purchaseReceipts)
    .where(sql`${purchaseReceipts.purchaseOrderId} IN (SELECT ${purchaseOrders.id} FROM ${purchaseOrders} WHERE ${purchaseOrders.supplierId} = ${supplierId})`);
  let pass = 0, totQty = 0, defQty = 0;
  for (const r of receipts) { totQty += r.receivedQuantity; defQty += r.defectiveQuantity || 0; if (r.qualityStatus === "passed") pass++; }
  const passRate = receipts.length > 0 ? (pass / receipts.length) * 100 : 50;
  const defRate = totQty > 0 ? (defQty / totQty) * 100 : 0;
  const drs = Math.max(0, Math.min(100, 100 - onTimeRate + avgDelay * 5));
  const qrs = Math.max(0, Math.min(100, 100 - passRate + defRate * 10));
  const cl = Number(supplier.creditLimit) || 0;
  const outstanding = orders.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + Number(o.totalAmount), 0);
  const frs = cl > 0 ? Math.min(100, (outstanding / cl) * 100) : 30;
  const overall = Math.round(drs * 0.35 + qrs * 0.40 + frs * 0.25);
  const dd: string[] = [], qd: string[] = [], fd: string[] = [], ma: string[] = [];
  if (onTimeRate < 80) dd.push(`准时交付率: ${onTimeRate.toFixed(1)}%`);
  if (avgDelay > 3) dd.push(`平均延迟${avgDelay.toFixed(1)}天`);
  if (passRate < 90) qd.push(`质量通过率: ${passRate.toFixed(1)}%`);
  if (defRate > 2) qd.push(`缺陷率: ${defRate.toFixed(2)}%`);
  if (outstanding > cl * 0.8) fd.push("应付账款接近信用额度上限");
  if (drs > 50) ma.push("增加备选供应商"); if (qrs > 50) ma.push("加强来料检验");
  if (frs > 50) ma.push("调整付款条件"); ma.push("建立定期供应商绩效评审");
  return { supplierId, supplierName: supplier.supplierName, assessedAt: new Date().toISOString(),
    overallRisk: riskLevel(overall) as SupplierRiskAssessment["overallRisk"], overallRiskScore: overall,
    deliveryRisk: { score: Math.round(drs), level: riskLevel(drs), onTimeRate: Math.round(onTimeRate * 10) / 10, avgDelayDays: Math.round(avgDelay * 10) / 10, details: dd },
    qualityRisk: { score: Math.round(qrs), level: riskLevel(qrs), passRate: Math.round(passRate * 10) / 10, defectRate: Math.round(defRate * 100) / 100, details: qd },
    financialRisk: { score: Math.round(frs), level: riskLevel(frs), creditLimit: cl, outstandingAmount: Math.round(outstanding * 100) / 100, details: fd },
    mitigationActions: ma };
}

// ============================================================================
// Export
// ============================================================================
export const PurchaseAssistant = { recommendSupplier, compareSupplierPrices, suggestPurchaseStrategy, generatePurchasePlan, assessSupplierRisk };
export default PurchaseAssistant;
