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
 * Route: /supply-chain/smart-inventory
 */

import React, { useState, useMemo } from "react";

// ─── Types (mirrors server) ──────────────────────────────────────

type ForecastTrend = "HIGH_GROWTH" | "MODERATE_GROWTH" | "STABLE" | "DECLINING" | "STEEP_DECLINE";
type StockHealth = "OVERSTOCK" | "ADEQUATE" | "LOW" | "SHORTAGE_RISK" | "STOCKOUT";
type InventoryAction = "INCREASE_STOCK" | "DECREASE_STOCK" | "EXPEDITE" | "HOLD" | "REBALANCE";

interface DynamicStockResult {
  partNumber: string;
  partName: string;
  category: string;
  currentStock: number;
  staticMin: number;
  dynamicSafetyStock: number;
  forecastTrend: ForecastTrend;
  stockHealth: StockHealth;
  action: InventoryAction;
  reason: string;
  potentialSavings: number;
  demandNext3Months: number;
  unitCost: number;
  leadTimeDays: number;
}

interface ProductForecast {
  productCode: string;
  productName: string;
  trend: ForecastTrend;
  months: { month: string; forecastedQty: number; confidenceLevel: number }[];
}

// ─── Engine (same logic as server for mock rendering) ─────────────

function analyzeTrend(fcs: { forecastedQty: number; month: string }[]): ForecastTrend {
  if (fcs.length < 2) return "STABLE";
  const sorted = [...fcs].sort((a, b) => a.month.localeCompare(b.month));
  const first = sorted[0].forecastedQty;
  const last = sorted[sorted.length - 1].forecastedQty;
  if (first === 0) return last > 0 ? "HIGH_GROWTH" : "STABLE";
  const pct = ((last - first) / first) * 100;
  if (pct > 20) return "HIGH_GROWTH";
  if (pct > 5) return "MODERATE_GROWTH";
  if (pct >= -5) return "STABLE";
  if (pct >= -20) return "DECLINING";
  return "STEEP_DECLINE";
}

// ─── Mock Data ────────────────────────────────────────────────────

const PRODUCTS: ProductForecast[] = [
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", trend: "HIGH_GROWTH",
    months: [{ month: "2026-03", forecastedQty: 50, confidenceLevel: 85 }, { month: "2026-04", forecastedQty: 60, confidenceLevel: 80 }, { month: "2026-05", forecastedQty: 75, confidenceLevel: 72 }] },
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", trend: "STABLE",
    months: [{ month: "2026-03", forecastedQty: 30, confidenceLevel: 90 }, { month: "2026-04", forecastedQty: 32, confidenceLevel: 88 }, { month: "2026-05", forecastedQty: 31, confidenceLevel: 85 }] },
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", trend: "STEEP_DECLINE",
    months: [{ month: "2026-03", forecastedQty: 40, confidenceLevel: 78 }, { month: "2026-04", forecastedQty: 25, confidenceLevel: 75 }, { month: "2026-05", forecastedQty: 15, confidenceLevel: 70 }] },
];

const MOCK_RESULTS: DynamicStockResult[] = [
  { partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", category: "RAW", currentStock: 2000, staticMin: 500, dynamicSafetyStock: 750, forecastTrend: "HIGH_GROWTH", stockHealth: "OVERSTOCK", action: "HOLD", reason: "CASH TRAP: 2000 units on hand but dynamic safety only requires 750.", potentialSavings: 106875, demandNext3Months: 1665, unitCost: 85.50, leadTimeDays: 21 },
  { partNumber: "PUMP-HP-15KW", partName: "High-Pressure Pump 15kW", category: "COMPONENT", currentStock: 8, staticMin: 20, dynamicSafetyStock: 30, forecastTrend: "HIGH_GROWTH", stockHealth: "SHORTAGE_RISK", action: "EXPEDITE", reason: "SHORTAGE RISK: Only 8 units, need 30 minimum.", potentialSavings: -281600, demandNext3Months: 185, unitCost: 12800, leadTimeDays: 45 },
  { partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", category: "COMPONENT", currentStock: 300, staticMin: 200, dynamicSafetyStock: 300, forecastTrend: "HIGH_GROWTH", stockHealth: "ADEQUATE", action: "HOLD", reason: "Stock level 300 is adequate for dynamic safety stock 300.", potentialSavings: 0, demandNext3Months: 1170, unitCost: 145, leadTimeDays: 14 },
  { partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", category: "RAW", currentStock: 1500, staticMin: 500, dynamicSafetyStock: 750, forecastTrend: "HIGH_GROWTH", stockHealth: "ADEQUATE", action: "HOLD", reason: "Stock level adequate.", potentialSavings: 13875, demandNext3Months: 3900, unitCost: 18.50, leadTimeDays: 7 },
  { partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", category: "COMPONENT", currentStock: 15, staticMin: 10, dynamicSafetyStock: 15, forecastTrend: "HIGH_GROWTH", stockHealth: "ADEQUATE", action: "HOLD", reason: "Stock level adequate.", potentialSavings: 0, demandNext3Months: 278, unitCost: 4200, leadTimeDays: 60 },
  { partNumber: "TRANSDUCER-40KHZ", partName: "Ultrasonic Transducer 40kHz", category: "COMPONENT", currentStock: 200, staticMin: 100, dynamicSafetyStock: 100, forecastTrend: "STABLE", stockHealth: "ADEQUATE", action: "HOLD", reason: "Stock level adequate.", potentialSavings: 68000, demandNext3Months: 744, unitCost: 680, leadTimeDays: 30 },
  { partNumber: "HEATER-3KW", partName: "Immersion Heater 3kW", category: "COMPONENT", currentStock: 50, staticMin: 30, dynamicSafetyStock: 30, forecastTrend: "STABLE", stockHealth: "ADEQUATE", action: "HOLD", reason: "Stock level adequate.", potentialSavings: 7000, demandNext3Months: 186, unitCost: 350, leadTimeDays: 14 },
  { partNumber: "PUMP-LP-5KW", partName: "Low-Pressure Pump 5kW", category: "COMPONENT", currentStock: 35, staticMin: 15, dynamicSafetyStock: 8, forecastTrend: "STEEP_DECLINE", stockHealth: "OVERSTOCK", action: "DECREASE_STOCK", reason: "CASH TRAP: 35 units on hand but dynamic safety only requires 8. ¥86,400 trapped.", potentialSavings: 86400, demandNext3Months: 80, unitCost: 3200, leadTimeDays: 30 },
];

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

function actionLabel(a: InventoryAction): string {
  return { INCREASE_STOCK: "BUY", DECREASE_STOCK: "SELL/HOLD", EXPEDITE: "RUSH ORDER", HOLD: "HOLD", REBALANCE: "MOVE" }[a];
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

// ─── Component ────────────────────────────────────────────────────

export default function SmartInventoryDashboard() {
  const [tab, setTab] = useState<"overview" | "forecasts" | "details">("overview");

  const results = MOCK_RESULTS;
  const products = PRODUCTS;

  // Derived stats
  const overstockItems = useMemo(() => results.filter(r => r.stockHealth === "OVERSTOCK"), [results]);
  const shortageItems = useMemo(() => results.filter(r => r.stockHealth === "SHORTAGE_RISK" || r.stockHealth === "STOCKOUT"), [results]);
  const totalCashTrapped = useMemo(() => overstockItems.reduce((s, r) => s + Math.max(0, r.potentialSavings), 0), [overstockItems]);
  const totalCashNeeded = useMemo(() => shortageItems.reduce((s, r) => s + Math.abs(Math.min(0, r.potentialSavings)), 0), [shortageItems]);
  const adequateCount = useMemo(() => results.filter(r => r.stockHealth === "ADEQUATE").length, [results]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Smart Inventory Dashboard
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>
            Phase 3.3 — CFO & SCM Joint View: Dynamic Safety Stock & Cash Flow Optimization
          </p>
        </div>
        <span style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20,
          padding: "6px 14px", fontSize: 12, color: "#2563eb",
        }}>MOCK DATA</span>
      </div>

      {/* ── CFO Headline Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {/* Cash Release */}
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "2px solid #86efac", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: 1 }}>
            Potential Cash Release
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
            {fmtMoney(totalCashTrapped)}
          </div>
          <div style={{ fontSize: 12, color: "#4ade80", marginTop: 2 }}>
            {overstockItems.length} overstocked parts to liquidate
          </div>
        </div>

        {/* Shortage Risk */}
        <div style={{
          background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
          border: "2px solid #fca5a5", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", textTransform: "uppercase", letterSpacing: 1 }}>
            Shortage Risk Exposure
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>
            {fmtMoney(totalCashNeeded)}
          </div>
          <div style={{ fontSize: 12, color: "#f87171", marginTop: 2 }}>
            {shortageItems.length} critical part{shortageItems.length !== 1 ? "s" : ""} to expedite
          </div>
        </div>

        {/* Net Cash Impact */}
        <div style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: "2px solid #93c5fd", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1 }}>
            Net Working Capital Impact
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
            {totalCashTrapped - totalCashNeeded > 0 ? "+" : ""}{fmtMoney(totalCashTrapped - totalCashNeeded)}
          </div>
          <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 2 }}>
            Potential net optimization
          </div>
        </div>

        {/* Health Summary */}
        <div style={{
          background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>
            Inventory Health
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{adequateCount}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>OK</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{overstockItems.length}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Over</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{shortageItems.length}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Risk</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {(["overview", "forecasts", "details"] as const).map((t, i) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            background: tab === t ? "#1e40af" : "#f1f5f9",
            color: tab === t ? "white" : "#475569",
            border: "1px solid #cbd5e1",
            borderRadius: i === 0 ? "8px 0 0 8px" : i === 2 ? "0 8px 8px 0" : "0",
          }}>
            {t === "overview" ? "Cash Flow Analysis" : t === "forecasts" ? "Sales Forecasts" : "Part Details"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Top 5 Cash Traps */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b", margin: "0 0 16px" }}>
              Top Cash Traps — Liquidate
            </h3>
            {overstockItems.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 5).map(item => (
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
                    <div style={{ fontSize: 11, color: "#92400e" }}>trapped</div>
                  </div>
                </div>
                {/* Static vs Dynamic bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11 }}>
                  <span style={{ color: "#94a3b8", minWidth: 60 }}>Stock: {item.currentStock}</span>
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
                  <span style={{ color: "#94a3b8", minWidth: 40 }}>Dyn: {item.dynamicSafetyStock}</span>
                </div>
              </div>
            ))}
            {overstockItems.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>No overstock items.</div>
            )}
          </div>

          {/* Top 5 Shortage Risks */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", margin: "0 0 16px" }}>
              Top Shortage Risks — Buy Now
            </h3>
            {shortageItems.sort((a, b) => a.potentialSavings - b.potentialSavings).slice(0, 5).map(item => (
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
                    <div style={{ fontSize: 11, color: "#b91c1c" }}>needed</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "#64748b" }}>
                  <span>On hand: <strong style={{ color: "#dc2626" }}>{item.currentStock}</strong></span>
                  <span>Dynamic min: <strong>{item.dynamicSafetyStock}</strong></span>
                  <span>Lead time: <strong>{item.leadTimeDays}d</strong></span>
                  <span>3M demand: <strong>{item.demandNext3Months}</strong></span>
                </div>
              </div>
            ))}
            {shortageItems.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>No shortage risks.</div>
            )}
          </div>
        </div>
      )}

      {/* ── FORECASTS TAB ── */}
      {tab === "forecasts" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {products.map(p => (
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
                {p.months.map((m, i) => {
                  const maxQty = Math.max(...p.months.map(x => x.forecastedQty));
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
                Avg confidence: {Math.round(p.months.reduce((s, m) => s + m.confidenceLevel, 0) / p.months.length)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DETAILS TAB ── */}
      {tab === "details" && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Part", "Category", "Stock", "Static Min", "Dynamic Min", "Health", "Action", "Cash Impact"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
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
                        ({r.dynamicSafetyStock > r.staticMin ? "+" : ""}{Math.round(((r.dynamicSafetyStock - r.staticMin) / r.staticMin) * 100)}%)
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
                      {actionLabel(r.action)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: r.potentialSavings > 0 ? "#16a34a" : r.potentialSavings < 0 ? "#dc2626" : "#475569" }}>
                    {r.potentialSavings > 0 ? "+" : ""}{fmtMoney(r.potentialSavings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Architecture Diagram ── */}
      <div style={{ marginTop: 24, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, textAlign: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          Inventory Intelligence Architecture
        </h3>
        <svg viewBox="0 0 900 140" style={{ maxWidth: 800, width: "100%" }}>
          {[
            { x: 10, label1: "FORECAST", label2: "3-Month Demand", color: "#3b82f6" },
            { x: 190, label1: "BOM EXPLODE", label2: "Product → Parts", color: "#8b5cf6" },
            { x: 370, label1: "OPTIMIZE", label2: "Dynamic Safety", color: "#f59e0b" },
            { x: 550, label1: "CLASSIFY", label2: "Health Check", color: "#22c55e" },
            { x: 730, label1: "ACT", label2: "Buy / Sell / Hold", color: "#ef4444" },
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
