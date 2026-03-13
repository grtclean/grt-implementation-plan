/**
 * Smart Inventory Dashboard — CFO & SCM Joint Dashboard
 * Phase 3.3 — Dynamic Safety Stock & Cash Flow Optimization
 *
 * Features:
 *   - Metric 1: "Potential Cash Release" (overstock value)
 *   - Metric 2: "Shortage Risks" (items needed for big orders)
 *   - Visual: Static vs Dynamic safety stock comparison bars
 *   - Top 5 "Cash Traps" to liquidate
 *   - Top 5 "Shortage Risks" to buy now
 *   - Forecast trend cards per product
 *
 * Data source: trpc.smartInventory.dashboard / forecasts (DB-backed)
 * Route: /supply-chain/smart-inventory
 */

import React, { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// ─── Types (mirrors server) ──────────────────────────────────────

type ForecastTrend = "HIGH_GROWTH" | "MODERATE_GROWTH" | "STABLE" | "DECLINING" | "STEEP_DECLINE";
type StockHealth = "OVERSTOCK" | "ADEQUATE" | "LOW" | "SHORTAGE_RISK" | "STOCKOUT";
type InventoryAction = "INCREASE_STOCK" | "DECREASE_STOCK" | "EXPEDITE" | "HOLD" | "REBALANCE";

// ─── Helpers ──────────────────────────────────────────────────────

function trendColor(trend: ForecastTrend): string {
  return { HIGH_GROWTH: "#22c55e", MODERATE_GROWTH: "#86efac", STABLE: "#3b82f6", DECLINING: "#f59e0b", STEEP_DECLINE: "#ef4444" }[trend];
}

function trendArrow(trend: ForecastTrend): string {
  return { HIGH_GROWTH: "++", MODERATE_GROWTH: "+", STABLE: "=", DECLINING: "-", STEEP_DECLINE: "--" }[trend];
}

function healthColor(h: StockHealth): string {
  return { OVERSTOCK: "#f59e0b", ADEQUATE: "#22c55e", LOW: "#06b6d4", SHORTAGE_RISK: "#ef4444", STOCKOUT: "#dc2626" }[h];
}

function healthBg(h: StockHealth): string {
  return { OVERSTOCK: "#fffbeb", ADEQUATE: "#f0fdf4", LOW: "#ecfeff", SHORTAGE_RISK: "#fef2f2", STOCKOUT: "#fef2f2" }[h];
}

function actionLabelKey(a: InventoryAction): string {
  return {
    INCREASE_STOCK: "manufacturing.inventory.actionBuy",
    DECREASE_STOCK: "manufacturing.inventory.actionSellHold",
    EXPEDITE: "manufacturing.inventory.actionRushOrder",
    HOLD: "manufacturing.inventory.actionHold",
    REBALANCE: "manufacturing.inventory.actionMove",
  }[a];
}

function actionColor(a: InventoryAction): string {
  return { INCREASE_STOCK: "#22c55e", DECREASE_STOCK: "#f59e0b", EXPEDITE: "#ef4444", HOLD: "#6b7280", REBALANCE: "#8b5cf6" }[a];
}

function fmtMoney(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1000000) return `¥${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `¥${(abs / 1000).toFixed(1)}K`;
  return `¥${abs.toFixed(0)}`;
}

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ─── Component ────────────────────────────────────────────────────

export default function SmartInventoryDashboard() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"overview" | "forecasts" | "details">("overview");

  // ─── tRPC Queries ───
  const dashboardQuery = trpc.smartInventory.dashboard.useQuery(undefined, QUERY_OPTS);
  const forecastsQuery = trpc.smartInventory.forecasts.useQuery(undefined, QUERY_OPTS);

  const results = dashboardQuery.data?.results ?? [];
  const summaryData = dashboardQuery.data?.summary;
  const topCashTraps = dashboardQuery.data?.topCashTraps ?? [];
  const topShortageRisks = dashboardQuery.data?.topShortageRisks ?? [];
  const products = forecastsQuery.data?.products ?? [];
  const dataSource = dashboardQuery.data?.dataSource ?? "seed";

  const isLoading = dashboardQuery.isLoading;

  // Derived stats
  const overstockCount = summaryData?.overstock ?? 0;
  const adequateCount = summaryData?.adequate ?? 0;
  const shortageCount = (summaryData?.shortageRisk ?? 0) + (summaryData?.stockout ?? 0);
  const totalCashTrapped = summaryData?.totalCashTrapped ?? 0;
  const totalCashNeeded = summaryData?.totalCashNeeded ?? 0;

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>{t("manufacturing.inventory.title")}</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 100, background: "#f1f5f9", borderRadius: 14, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ height: 300, background: "#f1f5f9", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            {t("manufacturing.inventory.title")}
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>
            {t("manufacturing.inventory.subtitle")}
          </p>
        </div>
        <span style={{
          background: dataSource === "database" ? "#f0fdf4" : "#eff6ff",
          border: `1px solid ${dataSource === "database" ? "#86efac" : "#bfdbfe"}`,
          borderRadius: 20, padding: "6px 14px", fontSize: 12,
          color: dataSource === "database" ? "#16a34a" : "#2563eb",
        }}>
          {dataSource === "database" ? t("manufacturing.inventory.liveData") : t("manufacturing.inventory.seedData")}
        </span>
      </div>

      {/* ── CFO Headline Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {/* Cash Release */}
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "2px solid #86efac", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: 1 }}>
            {t("manufacturing.inventory.potentialCashRelease")}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
            {fmtMoney(totalCashTrapped)}
          </div>
          <div style={{ fontSize: 12, color: "#4ade80", marginTop: 2 }}>
            {overstockCount} {t("manufacturing.inventory.overstockedPartsToLiquidate")}
          </div>
        </div>

        {/* Shortage Risk */}
        <div style={{
          background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
          border: "2px solid #fca5a5", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", textTransform: "uppercase", letterSpacing: 1 }}>
            {t("manufacturing.inventory.shortageRiskExposure")}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>
            {fmtMoney(totalCashNeeded)}
          </div>
          <div style={{ fontSize: 12, color: "#f87171", marginTop: 2 }}>
            {shortageCount} {t("manufacturing.inventory.criticalPartsToExpedite")}
          </div>
        </div>

        {/* Net Cash Impact */}
        <div style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: "2px solid #93c5fd", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1 }}>
            {t("manufacturing.inventory.netWorkingCapitalImpact")}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
            {totalCashTrapped - totalCashNeeded > 0 ? "+" : ""}{fmtMoney(totalCashTrapped - totalCashNeeded)}
          </div>
          <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 2 }}>
            {t("manufacturing.inventory.potentialNetOptimization")}
          </div>
        </div>

        {/* Health Summary */}
        <div style={{
          background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>
            {t("manufacturing.inventory.inventoryHealth")}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{adequateCount}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>OK</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{overstockCount}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Over</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{shortageCount}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Risk</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {(["overview", "forecasts", "details"] as const).map((tabKey, i) => (
          <button key={tabKey} onClick={() => setTab(tabKey)} style={{
            padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            background: tab === tabKey ? "#1e40af" : "#f1f5f9",
            color: tab === tabKey ? "white" : "#475569",
            border: "1px solid #cbd5e1",
            borderRadius: i === 0 ? "8px 0 0 8px" : i === 2 ? "0 8px 8px 0" : "0",
          }}>
            {tabKey === "overview" ? t("manufacturing.inventory.tabCashFlow") : tabKey === "forecasts" ? t("manufacturing.inventory.tabForecasts") : t("manufacturing.inventory.tabPartDetails")}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Top 5 Cash Traps */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b", margin: "0 0 16px" }}>
              {t("manufacturing.inventory.topCashTraps")}
            </h3>
            {topCashTraps.map((item: any) => (
              <div key={item.partNumber} style={{
                padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                background: "#fffbeb", border: "1px solid #fde68a",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{item.partNumber}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{item.partName}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706" }}>{fmtMoney(item.potentialSavings)}</div>
                    <div style={{ fontSize: 11, color: "#92400e" }}>{t("manufacturing.inventory.trapped")}</div>
                  </div>
                </div>
                {/* Static vs Dynamic bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11 }}>
                  <span style={{ color: "#94a3b8", minWidth: 60 }}>{t("manufacturing.inventory.colStock")}: {item.currentStock}</span>
                  <div style={{ flex: 1, height: 12, background: "#e2e8f0", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    {/* Dynamic level marker */}
                    <div style={{
                      position: "absolute", left: `${Math.min(95, (item.dynamicSafetyStock / item.currentStock) * 100)}%`,
                      top: 0, bottom: 0, width: 2, background: "#ef4444", zIndex: 2,
                    }} />
                    {/* Static level marker */}
                    <div style={{
                      position: "absolute", left: `${Math.min(95, (item.staticMin / item.currentStock) * 100)}%`,
                      top: 0, bottom: 0, width: 2, background: "#94a3b8", zIndex: 1,
                    }} />
                    {/* Current fill */}
                    <div style={{ width: "100%", height: "100%", background: "#fbbf24", borderRadius: 6 }} />
                  </div>
                  <span style={{ color: "#94a3b8", minWidth: 40 }}>{t("manufacturing.inventory.dynamicMin")}: {item.dynamicSafetyStock}</span>
                </div>
              </div>
            ))}
            {topCashTraps.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>{t("manufacturing.inventory.noOverstockItems")}</div>
            )}
          </div>

          {/* Top 5 Shortage Risks */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", margin: "0 0 16px" }}>
              {t("manufacturing.inventory.topShortageRisks")}
            </h3>
            {topShortageRisks.map((item: any) => (
              <div key={item.partNumber} style={{
                padding: "12px 14px", borderRadius: 8, marginBottom: 8,
                background: "#fef2f2", border: "1px solid #fca5a5",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{item.partNumber}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{item.partName}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{fmtMoney(Math.abs(item.potentialSavings))}</div>
                    <div style={{ fontSize: 11, color: "#b91c1c" }}>{t("manufacturing.inventory.needed")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "#64748b" }}>
                  <span>{t("manufacturing.inventory.onHand")}: <strong style={{ color: "#dc2626" }}>{item.currentStock}</strong></span>
                  <span>{t("manufacturing.inventory.dynamicMin")}: <strong>{item.dynamicSafetyStock}</strong></span>
                  <span>{t("manufacturing.inventory.leadTime")}: <strong>{item.leadTimeDays}d</strong></span>
                  <span>{t("manufacturing.inventory.demand3M")}: <strong>{item.demandNext3Months}</strong></span>
                </div>
              </div>
            ))}
            {topShortageRisks.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>{t("manufacturing.inventory.noShortageRisks")}</div>
            )}
          </div>
        </div>
      )}

      {/* ── FORECASTS TAB ── */}
      {tab === "forecasts" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {products.map((p: any) => (
            <div key={p.productCode} style={{
              background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20,
              borderTop: `4px solid ${trendColor(p.trend)}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{p.productCode}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{p.productName}</div>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: trendColor(p.trend) + "20", color: trendColor(p.trend),
                }}>
                  {trendArrow(p.trend)} {p.trend.replace(/_/g, " ")}
                </span>
              </div>
              {/* Mini bar chart */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
                {(p.months ?? []).map((m: any, i: number) => {
                  const maxQty = Math.max(...(p.months ?? []).map((x: any) => x.forecastedQty));
                  const barH = maxQty > 0 ? (m.forecastedQty / maxQty) * 60 : 0;
                  return (
                    <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                        {m.forecastedQty}
                      </div>
                      <div style={{
                        height: barH, background: trendColor(p.trend),
                        borderRadius: "4px 4px 0 0", minHeight: 4, opacity: 0.5 + (i * 0.2),
                      }} />
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                        {m.month.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                {t("manufacturing.inventory.avgConfidence")}: {Math.round((p.months ?? []).reduce((s: number, m: any) => s + m.confidenceLevel, 0) / ((p.months ?? []).length || 1))}%
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "#94a3b8" }}>
              {t("manufacturing.inventory.noForecastData")}
            </div>
          )}
        </div>
      )}

      {/* ── DETAILS TAB ── */}
      {tab === "details" && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {[
                  t("manufacturing.inventory.colPart"),
                  t("manufacturing.inventory.colCategory"),
                  t("manufacturing.inventory.colStock"),
                  t("manufacturing.inventory.colStaticMin"),
                  t("manufacturing.inventory.colDynamicMin"),
                  t("manufacturing.inventory.colHealth"),
                  t("manufacturing.inventory.colAction"),
                  t("manufacturing.inventory.colCashImpact"),
                ].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.partNumber} style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: r.stockHealth === "SHORTAGE_RISK" || r.stockHealth === "STOCKOUT" ? "#fef2f2" :
                              r.stockHealth === "OVERSTOCK" ? "#fffbeb" : "white",
                }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.partNumber}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.partName}</div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#f1f5f9", color: "#475569" }}>
                      {r.category}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{r.currentStock}</td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{r.staticMin}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700, color: r.dynamicSafetyStock > r.staticMin ? "#22c55e" : r.dynamicSafetyStock < r.staticMin ? "#ef4444" : "#475569" }}>
                      {r.dynamicSafetyStock}
                    </span>
                    {r.dynamicSafetyStock !== r.staticMin && (
                      <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>
                        ({r.dynamicSafetyStock > r.staticMin ? "+" : ""}{r.staticMin > 0 ? Math.round(((r.dynamicSafetyStock - r.staticMin) / r.staticMin) * 100) : 0}%)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: healthBg(r.stockHealth), color: healthColor(r.stockHealth),
                      border: `1px solid ${healthColor(r.stockHealth)}40`,
                    }}>
                      {r.stockHealth.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: actionColor(r.action) + "15",
                      color: actionColor(r.action),
                    }}>
                      {t(actionLabelKey(r.action))}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: r.potentialSavings > 0 ? "#16a34a" : r.potentialSavings < 0 ? "#dc2626" : "#475569" }}>
                    {r.potentialSavings > 0 ? "+" : ""}{fmtMoney(r.potentialSavings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>{t("manufacturing.inventory.noInventoryData")}</div>
          )}
        </div>
      )}

      {/* ── Architecture Diagram ── */}
      <div style={{ marginTop: 24, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, textAlign: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          {t("manufacturing.inventory.architectureTitle")}
        </h3>
        <svg viewBox="0 0 900 140" style={{ maxWidth: 800, width: "100%" }}>
          {[
            { x: 10, label1: t("manufacturing.inventory.archForecast"), label2: t("manufacturing.inventory.archDemand3M"), color: "#3b82f6" },
            { x: 190, label1: t("manufacturing.inventory.archBomExplode"), label2: t("manufacturing.inventory.archProductParts"), color: "#8b5cf6" },
            { x: 370, label1: t("manufacturing.inventory.archOptimize"), label2: t("manufacturing.inventory.archDynamicSafety"), color: "#f59e0b" },
            { x: 550, label1: t("manufacturing.inventory.archClassify"), label2: t("manufacturing.inventory.archHealthCheck"), color: "#22c55e" },
            { x: 730, label1: t("manufacturing.inventory.archAct"), label2: t("manufacturing.inventory.archBuySellHold"), color: "#ef4444" },
          ].map((box, i) => (
            <g key={i}>
              <rect x={box.x} y={20} width={150} height={80} rx={12} fill={box.color + "15"} stroke={box.color} strokeWidth={2} />
              <text x={box.x + 75} y={50} textAnchor="middle" fontSize={13} fontWeight={700} fill={box.color}>{box.label1}</text>
              <text x={box.x + 75} y={70} textAnchor="middle" fontSize={10} fill="#475569">{box.label2}</text>
              <text x={box.x + 75} y={115} textAnchor="middle" fontSize={18} fill={box.color}>
                {["1", "2", "3", "4", "5"][i]}
              </text>
            </g>
          ))}
          {[170, 350, 530, 710].map((x, i) => (
            <polygon key={i} points={`${x},55 ${x + 12},60 ${x},65`} fill="#94a3b8" />
          ))}
        </svg>
      </div>
    </div>
  );
}
