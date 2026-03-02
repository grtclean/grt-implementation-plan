/**
 * AI Model Performance & Explainability Router
 * 模型性能监控 + 解释性报告
 *
 * Data source: ai_assistant_dashboard table (DB-backed)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-model");

// ─── Bootstrap ───────────────────────────────────────────────────
let _aiModelReady = false;
async function ensureAiModelData() {
  if (_aiModelReady) return;
  _aiModelReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'ai_model'`);
    if ((rows[0] as any).cnt === 0) {
      const metrics = JSON.stringify([
        { modelType: "cost_prediction", modelVersion: "v1.2.0", totalCalls: 450, accuracy: 0.87, avgLatency: 380, p95Latency: 850, avgConfidence: 0.82, mae: 180, rmse: 245 },
        { modelType: "demand_forecast", modelVersion: "v1.1.3", totalCalls: 520, accuracy: 0.80, avgLatency: 420, p95Latency: 950, avgConfidence: 0.78, mae: 220, rmse: 310 },
        { modelType: "quality_prediction", modelVersion: "v2.0.1", totalCalls: 380, accuracy: 0.93, avgLatency: 350, p95Latency: 780, avgConfidence: 0.89, mae: 95, rmse: 140 },
        { modelType: "delivery_time_estimation", modelVersion: "v1.0.5", totalCalls: 610, accuracy: 0.83, avgLatency: 450, p95Latency: 1050, avgConfidence: 0.80, mae: 200, rmse: 280 },
        { modelType: "resource_allocation", modelVersion: "v0.9.2", totalCalls: 290, accuracy: 0.78, avgLatency: 520, p95Latency: 1200, avgConfidence: 0.75, mae: 260, rmse: 350 },
        { modelType: "anomaly_detection", modelVersion: "v1.3.0", totalCalls: 1200, accuracy: 0.90, avgLatency: 180, p95Latency: 420, avgConfidence: 0.86, mae: 120, rmse: 175 },
      ]);
      const health = JSON.stringify([
        { modelType: "cost_prediction", status: "healthy", issues: [], recommendations: [] },
        { modelType: "demand_forecast", status: "degraded", issues: [{ type: "accuracy_drop", severity: "warning", message: "准确率下降5%" }], recommendations: ["建议检查最近的输入数据分布"] },
        { modelType: "quality_prediction", status: "healthy", issues: [], recommendations: [] },
        { modelType: "delivery_time_estimation", status: "healthy", issues: [], recommendations: [] },
        { modelType: "resource_allocation", status: "critical", issues: [{ type: "latency_spike", severity: "critical", message: "响应时间超过阈值200%" }], recommendations: ["建议立即检查服务器负载", "考虑增加计算资源"] },
        { modelType: "anomaly_detection", status: "healthy", issues: [], recommendations: [] },
      ]);
      const report = JSON.stringify({
        selectedModel: { id: "linear", name: "线性回归", type: "linear" },
        selectionReason: {
          primaryReason: "数据呈现明显的线性增长趋势，线性回归模型能够最好地捕捉这种模式",
          supportingReasons: ["数据方差较低，适合简单模型", "样本量适中，避免过拟合风险", "无明显季节性波动"],
          dataCharacteristicsMatch: { "线性趋势": true, "低方差": true, "无季节性": true, "足够样本": true },
          confidenceScore: 0.87,
        },
        featureImportances: [
          { feature: "时间序列", importance: 0.45, direction: "positive", contribution: 0.45, rank: 1 },
          { feature: "使用量", importance: 0.30, direction: "positive", contribution: 0.30, rank: 2 },
          { feature: "历史均值", importance: 0.15, direction: "positive", contribution: 0.15, rank: 3 },
          { feature: "波动率", importance: 0.07, direction: "negative", contribution: -0.07, rank: 4 },
          { feature: "季节因子", importance: 0.03, direction: "positive", contribution: 0.03, rank: 5 },
        ],
        modelComparisons: [
          { modelId: "linear", modelName: "线性回归", modelType: "linear", metrics: { mae: 850, mse: 1200000, rmse: 1095, mape: 6.2, r2: 0.92 }, rank: 1, strengths: ["解释性强", "计算效率高"], weaknesses: ["无法捕捉非线性关系"], suitableFor: ["线性趋势数据"] },
          { modelId: "poly2", modelName: "二次多项式", modelType: "polynomial", metrics: { mae: 920, mse: 1350000, rmse: 1162, mape: 6.8, r2: 0.89 }, rank: 2, strengths: ["能捕捉曲线趋势"], weaknesses: ["可能过拟合"], suitableFor: ["加速/减速趋势"] },
          { modelId: "exp", modelName: "指数模型", modelType: "exponential", metrics: { mae: 1100, mse: 1800000, rmse: 1342, mape: 8.1, r2: 0.85 }, rank: 3, strengths: ["适合指数增长"], weaknesses: ["对初始值敏感"], suitableFor: ["指数增长数据"] },
          { modelId: "ma5", modelName: "移动平均(5期)", modelType: "moving_average", metrics: { mae: 1250, mse: 2100000, rmse: 1449, mape: 9.2, r2: 0.78 }, rank: 4, strengths: ["平滑噪声"], weaknesses: ["滞后于实际变化"], suitableFor: ["稳定趋势数据"] },
        ],
        dataCharacteristics: { size: 30, timeSpan: 30, trend: "increasing", seasonality: false, outlierRatio: 0.03, variance: 2500000, autocorrelation: 0.85, nonlinearity: 0.12 },
        recommendations: [
          "当前数据量适中，建议持续收集更多历史数据以提高预测准确性",
          "数据中存在少量异常值(3%)，建议定期检查数据质量",
          "线性模型表现良好，但建议定期重新评估模型以适应数据变化",
          "考虑添加更多特征（如季节因子、外部因素）以进一步提升预测精度",
        ],
        visualizationData: {
          metricsComparison: { labels: ["MAE", "RMSE", "MAPE(%)", "R²(%)"], datasets: [
            { modelName: "线性回归", values: [850, 1095, 6.2, 92] },
            { modelName: "二次多项式", values: [920, 1162, 6.8, 89] },
            { modelName: "指数模型", values: [1100, 1342, 8.1, 85] },
            { modelName: "移动平均", values: [1250, 1449, 9.2, 78] },
          ]},
          featureImportanceChart: { features: ["时间序列", "使用量", "历史均值", "波动率", "季节因子"], importances: [0.45, 0.30, 0.15, 0.07, 0.03], colors: ["#22c55e", "#22c55e", "#22c55e", "#ef4444", "#22c55e"] },
        },
      });
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('ai_model', 'performance_metrics', ${metrics}::jsonb),
        ('ai_model', 'health_status', ${health}::jsonb),
        ('ai_model', 'explainability_report', ${report}::jsonb)
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "AI model data bootstrap failed");
  }
}

// ─── Deterministic trend generator ──────────────────────────────
function generateTrend(modelType: string, period: string) {
  const baseCalls: Record<string, number> = {
    cost_prediction: 45, demand_forecast: 52, quality_prediction: 38,
    delivery_time_estimation: 61, resource_allocation: 29, anomaly_detection: 120,
  };
  const baseAccuracy: Record<string, number> = {
    cost_prediction: 0.87, demand_forecast: 0.80, quality_prediction: 0.93,
    delivery_time_estimation: 0.83, resource_allocation: 0.78, anomaly_detection: 0.90,
  };
  const pointCount = ({ hour: 12, day: 24, week: 7, month: 30 } as Record<string, number>)[period] ?? 24;
  const intervalMs = ({ hour: 5 * 60000, day: 3600000, week: 86400000, month: 86400000 } as Record<string, number>)[period] ?? 3600000;
  const now = Date.now();
  const bc = baseCalls[modelType] ?? 50;
  const ba = baseAccuracy[modelType] ?? 0.85;

  return Array.from({ length: pointCount }, (_, i) => ({
    timestamp: now - (pointCount - i - 1) * intervalMs,
    calls: Math.floor(bc + 10 * Math.sin(i * 0.5) + i * 0.5),
    accuracy: Number((ba + 0.02 * Math.sin(i * 0.3)).toFixed(4)),
    avgLatency: Math.floor(300 + 50 * Math.sin(i * 0.7) + i * 2),
  }));
}

// ============================================================================
// AI Model Router
// ============================================================================

export const aiModelRouter = router({
  /**
   * 模型性能仪表板 (DB-backed metrics + health)
   */
  getPerformanceDashboard: protectedProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureAiModelData();
      const db = await requireDb();
      const { rows } = await db.execute(sql`
        SELECT category, items FROM ai_assistant_dashboard
        WHERE assistant_type = 'ai_model' AND category IN ('performance_metrics', 'health_status')
      `);
      let metrics: any[] = [];
      let health: any[] = [];
      for (const r of rows as any[]) {
        if (r.category === "performance_metrics") metrics = r.items;
        if (r.category === "health_status") health = r.items;
      }
      const mult: Record<string, number> = { hour: 0.1, day: 1, week: 7, month: 30 };
      const m = mult[input?.period ?? "day"] ?? 1;
      return {
        metrics: metrics.map((x: any) => ({ ...x, totalCalls: Math.floor(x.totalCalls * m), period: input?.period ?? "day" })),
        health,
      };
    }),

  /**
   * 模型趋势数据 (deterministic computation)
   */
  getModelTrend: protectedProcedure
    .input(z.object({ modelType: z.string(), period: z.string() }))
    .query(({ input }) => {
      return generateTrend(input.modelType, input.period);
    }),

  /**
   * 模型解释性报告 (DB-backed)
   */
  getExplainabilityReport: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async () => {
      await ensureAiModelData();
      const db = await requireDb();
      const { rows } = await db.execute(sql`
        SELECT items FROM ai_assistant_dashboard
        WHERE assistant_type = 'ai_model' AND category = 'explainability_report'
      `);
      const report = (rows[0] as any)?.items ?? null;
      if (!report) return null;
      // Generate deterministic prediction comparison data
      const now = Date.now();
      const timestamps = Array.from({ length: 30 }, (_, i) => now - (29 - i) * 86400000);
      const actual = timestamps.map((_, i) => 10000 + i * 500 + 200 * Math.sin(i * 0.5));
      const predictions: Record<string, number[]> = {
        "线性回归": actual.map((v, i) => v + 150 * Math.sin(i * 0.3)),
        "二次多项式": actual.map((v, i) => v + 200 * Math.sin(i * 0.4)),
        "指数模型": actual.map((v, i) => v + 300 * Math.sin(i * 0.5)),
        "移动平均": actual.map((v, i) => v + 400 * Math.sin(i * 0.6)),
      };
      return {
        ...report,
        generatedAt: now,
        visualizationData: {
          ...(report.visualizationData ?? {}),
          predictionComparison: { timestamps, actual, predictions },
        },
      };
    }),
});
