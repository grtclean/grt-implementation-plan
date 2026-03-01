/**
 * AI Purchase Assistant tRPC Routes
 * 采购助手API路由
 *
 * Data source: trpc.purchaseAssistant.getDashboard (DB-backed)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { PurchaseAssistant } from "./purchaseAssistant";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ─── Dashboard Bootstrap ─────────────────────────────────────────
let _purchaseDashReady = false;
async function ensurePurchaseDashboard() {
  if (_purchaseDashReady) return;
  _purchaseDashReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'purchase'`);
    if ((rows[0] as any).cnt === 0) {
      const suppliers = JSON.stringify([
        { id: 1, name: "精密轴承(苏州)有限公司", score: 95, rating: "A+", deliveryDays: 7, qualityRate: 99.8, location: "苏州" },
        { id: 2, name: "宁波永力电机制造", score: 91, rating: "A", deliveryDays: 10, qualityRate: 99.5, location: "宁波" },
        { id: 3, name: "上海汇通不锈钢材料", score: 88, rating: "A", deliveryDays: 5, qualityRate: 99.2, location: "上海" },
        { id: 4, name: "深圳鑫达传感器科技", score: 85, rating: "B+", deliveryDays: 14, qualityRate: 98.8, location: "深圳" },
        { id: 5, name: "东莞锐丰密封件厂", score: 82, rating: "B+", deliveryDays: 8, qualityRate: 98.5, location: "东莞" },
      ]);
      const prices = JSON.stringify([
        { material: "不锈钢304板材 2mm", unit: "kg", suppliers: [
          { name: "上海汇通", price: 28.5, moq: 500, leadTime: "3天" },
          { name: "无锡宝钢", price: 29.8, moq: 1000, leadTime: "5天" },
          { name: "佛山联众", price: 27.2, moq: 2000, leadTime: "7天" },
          { name: "太原太钢", price: 30.1, moq: 500, leadTime: "10天" },
        ]},
        { material: "超声波换能器 40kHz", unit: "个", suppliers: [
          { name: "深圳新超声", price: 680, moq: 10, leadTime: "14天" },
          { name: "北京声科", price: 720, moq: 5, leadTime: "10天" },
          { name: "济南超声", price: 650, moq: 20, leadTime: "21天" },
          { name: "杭州声辰", price: 710, moq: 10, leadTime: "7天" },
        ]},
        { material: "西门子PLC S7-1200", unit: "台", suppliers: [
          { name: "上海西门子", price: 3800, moq: 1, leadTime: "3天" },
          { name: "北京天拓", price: 3650, moq: 1, leadTime: "5天" },
          { name: "广州正通", price: 3720, moq: 1, leadTime: "3天" },
        ]},
      ]);
      const strategies = JSON.stringify([
        { id: "s1", title: "JIT准时制采购 - 标准件", type: "JIT", description: "对螺栓、垫圈等标准件采用JIT模式，与供应商签订VMI协议，由供应商管理库存，按需配送。", saving: "库存成本降低30%", risk: "低" },
        { id: "s2", title: "批量采购 - 不锈钢板材", type: "bulk", description: "不锈钢板材按季度集中采购，利用批量折扣。建议Q2集中下单，预计节省8-12%。", saving: "采购成本降低10%", risk: "中（库存占用）" },
        { id: "s3", title: "框架协议 - 电气元件", type: "framework", description: "与西门子、施耐德签订年度框架协议，锁定价格和交期。适用于PLC、变频器等高价值电气件。", saving: "价格锁定，交期保障", risk: "低" },
        { id: "s4", title: "国产替代 - 传感器类", type: "bulk", description: "对非关键传感器推进国产替代，建议试用深圳鑫达产品，已通过3个月可靠性测试。", saving: "单件成本降低40%", risk: "中（需验证）" },
      ]);
      const planItems = JSON.stringify([
        { id: 1, material: "不锈钢304板材", qty: 2000, supplier: "上海汇通", orderDate: "2026-01-15", deliveryDate: "2026-01-20", status: "已下单" },
        { id: 2, material: "超声波换能器", qty: 24, supplier: "深圳新超声", orderDate: "2026-01-10", deliveryDate: "2026-01-24", status: "生产中" },
        { id: 3, material: "西门子PLC", qty: 2, supplier: "北京天拓", orderDate: "2026-01-20", deliveryDate: "2026-01-25", status: "待下单" },
        { id: 4, material: "高压泵组", qty: 1, supplier: "格兰富(上海)", orderDate: "2026-01-05", deliveryDate: "2026-02-15", status: "已下单" },
        { id: 5, material: "不锈钢管路组件", qty: 50, supplier: "无锡管业", orderDate: "2026-01-18", deliveryDate: "2026-01-28", status: "待下单" },
      ]);
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('purchase', 'suppliers', ${suppliers}::jsonb),
        ('purchase', 'prices', ${prices}::jsonb),
        ('purchase', 'strategies', ${strategies}::jsonb),
        ('purchase', 'plan', ${planItems}::jsonb)
      `);
    }
  } catch (e: any) {
    console.warn("purchase dashboard bootstrap:", e.message);
  }
}

// ============================================================================
// Purchase Assistant Routes
// ============================================================================

export const purchaseAssistantRouter = router({
  /**
   * 推荐供应商
   */
  recommendSupplier: protectedProcedure
    .input(z.object({
      materialId: z.number(),
      requirements: z.object({
        maxPrice: z.number().optional(),
        minQualityRating: z.string().optional(),
        maxLeadTimeDays: z.number().optional(),
        preferDomestic: z.boolean().optional(),
      }),
    }))
    .query(async ({ input }) => {
      const recommendations = await PurchaseAssistant.recommendSupplier(
        input.materialId,
        input.requirements
      );
      return { success: true, data: recommendations };
    }),

  /**
   * 供应商价格比较
   */
  compareSupplierPrices: protectedProcedure
    .input(z.object({
      materialId: z.number(),
      supplierIds: z.array(z.number()).min(1),
    }))
    .query(async ({ input }) => {
      const matrix = await PurchaseAssistant.compareSupplierPrices(
        input.materialId,
        input.supplierIds
      );
      return { success: true, data: matrix };
    }),

  /**
   * 建议采购策略
   */
  suggestPurchaseStrategy: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const strategy = await PurchaseAssistant.suggestPurchaseStrategy(
        input.projectId
      );
      return { success: true, data: strategy };
    }),

  /**
   * 从BOM生成采购计划
   */
  generatePurchasePlan: protectedProcedure
    .input(z.object({
      bomId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const plan = await PurchaseAssistant.generatePurchasePlan(input.bomId);
      return { success: true, data: plan };
    }),

  /**
   * 供应商风险评估
   */
  assessSupplierRisk: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
    }))
    .query(async ({ input }) => {
      const assessment = await PurchaseAssistant.assessSupplierRisk(
        input.supplierId
      );
      return { success: true, data: assessment };
    }),

  /**
   * 采购助手仪表板数据 (DB-backed)
   */
  getDashboard: protectedProcedure.query(async () => {
    await ensurePurchaseDashboard();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT category, items FROM ai_assistant_dashboard WHERE assistant_type = 'purchase'`);
    const data: Record<string, any[]> = { suppliers: [], prices: [], strategies: [], plan: [] };
    for (const r of rows as any[]) {
      data[r.category] = r.items;
    }
    return data;
  }),
});
