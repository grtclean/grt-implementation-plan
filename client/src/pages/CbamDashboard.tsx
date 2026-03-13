/**
 * CBAM Dashboard — ESG & Compliance Control Tower
 * Phase 3.4 — Product Carbon Footprint Tracking (产品碳足迹追踪)
 *
 * Features:
 *   - Product footprint cards with CO₂e totals and CBAM status
 *   - SVG carbon breakdown visualization (Material vs Energy split)
 *   - Per-material and per-machine CO₂ detail tables
 *   - Green Steel ECO simulation (what-if analysis)
 *   - CBAM customs declaration generation button
 *   - AT_RISK / NON_COMPLIANT products highlighted in red
 *
 * Route: /esg/cbam-dashboard
 */

import React, { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types (mirrors server) ──────────────────────────────────────

type CbamStatus = "COMPLIANT" | "AT_RISK" | "NON_COMPLIANT";

interface MaterialCarbonResult {
  partNumber: string;
  partName: string;
  weightKg: number;
  co2PerKg: number;
  totalCo2: number;
  percentOfTotal: number;
}

interface EnergyCarbonResult {
  machineCode: string;
  machineName: string;
  durationHours: number;
  kwPerHour: number;
  gridCo2Factor: number;
  energyKwh: number;
  totalCo2: number;
  percentOfTotal: number;
}

interface ProductFootprint {
  productCode: string;
  productName: string;
  materialCo2: number;
  energyCo2: number;
  totalCo2: number;
  euThreshold: number;
  status: CbamStatus;
  materialBreakdown: MaterialCarbonResult[];
  energyBreakdown: EnergyCarbonResult[];
  materialPercent: number;
  energyPercent: number;
}

interface BomMaterial {
  partNumber: string;
  partName: string;
  qtyPerUnit: number;
  weightKg: number;
}

interface MaterialCarbonFactor {
  partNumber: string;
  partName: string;
  materialType: string;
  co2PerKg: number;
  region: string;
}

interface MachineEnergyProfile {
  machineCode: string;
  machineName: string;
  kwPerHour: number;
  gridCo2Factor: number;
}

interface MachiningStep {
  machineCode: string;
  machineName: string;
  durationHours: number;
}

// ─── Engine (same logic as server for mock rendering) ─────────────

function calculateMaterialLineCo2(qty: number, wKg: number, co2Kg: number): number {
  return Math.round(qty * wKg * co2Kg * 100) / 100;
}

function calculateMaterialCarbon(bom: BomMaterial[], factors: MaterialCarbonFactor[]) {
  const fMap = new Map(factors.map(f => [f.partNumber, f]));
  let total = 0;
  const breakdown: MaterialCarbonResult[] = [];
  for (const b of bom) {
    const f = fMap.get(b.partNumber);
    if (!f) continue;
    const co2 = calculateMaterialLineCo2(b.qtyPerUnit, b.weightKg, f.co2PerKg);
    total += co2;
    breakdown.push({ partNumber: b.partNumber, partName: b.partName, weightKg: b.weightKg * b.qtyPerUnit, co2PerKg: f.co2PerKg, totalCo2: co2, percentOfTotal: 0 });
  }
  for (const item of breakdown) item.percentOfTotal = total > 0 ? Math.round((item.totalCo2 / total) * 10000) / 100 : 0;
  return { total: Math.round(total * 100) / 100, breakdown };
}

function calculateEnergyCarbon(steps: MachiningStep[], profiles: MachineEnergyProfile[]) {
  const pMap = new Map(profiles.map(p => [p.machineCode, p]));
  let total = 0;
  const breakdown: EnergyCarbonResult[] = [];
  for (const s of steps) {
    const p = pMap.get(s.machineCode);
    if (!p) continue;
    const kWh = s.durationHours * p.kwPerHour;
    const co2 = Math.round(s.durationHours * p.kwPerHour * p.gridCo2Factor * 100) / 100;
    total += co2;
    breakdown.push({ machineCode: s.machineCode, machineName: s.machineName, durationHours: s.durationHours, kwPerHour: p.kwPerHour, gridCo2Factor: p.gridCo2Factor, energyKwh: Math.round(kWh * 100) / 100, totalCo2: co2, percentOfTotal: 0 });
  }
  for (const item of breakdown) item.percentOfTotal = total > 0 ? Math.round((item.totalCo2 / total) * 10000) / 100 : 0;
  return { total: Math.round(total * 100) / 100, breakdown };
}

function classifyCbamStatus(totalCo2: number, euThreshold: number): CbamStatus {
  if (totalCo2 > euThreshold) return "NON_COMPLIANT";
  if (totalCo2 > euThreshold * 0.9) return "AT_RISK";
  return "COMPLIANT";
}

function calculateProductFootprint(code: string, name: string, bom: BomMaterial[], factors: MaterialCarbonFactor[], steps: MachiningStep[], profiles: MachineEnergyProfile[], threshold: number): ProductFootprint {
  const mat = calculateMaterialCarbon(bom, factors);
  const eng = calculateEnergyCarbon(steps, profiles);
  const totalCo2 = Math.round((mat.total + eng.total) * 100) / 100;
  return {
    productCode: code, productName: name,
    materialCo2: mat.total, energyCo2: eng.total, totalCo2,
    euThreshold: threshold, status: classifyCbamStatus(totalCo2, threshold),
    materialBreakdown: mat.breakdown, energyBreakdown: eng.breakdown,
    materialPercent: totalCo2 > 0 ? Math.round((mat.total / totalCo2) * 10000) / 100 : 0,
    energyPercent: totalCo2 > 0 ? Math.round((eng.total / totalCo2) * 10000) / 100 : 0,
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────

const PRODUCTS = [
  { code: "GWM-3000", name: "GRT Spray Wash Machine 3000", euThreshold: 2000 },
  { code: "GUC-500",  name: "GRT Ultrasonic Cleaner 500",  euThreshold: 2000 },
  { code: "GSC-200",  name: "GRT Custom Wash System 200",  euThreshold: 5000 },
];

const CARBON_FACTORS: MaterialCarbonFactor[] = [
  { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",  materialType: "Stainless Steel 316L", co2PerKg: 6.15, region: "CN" },
  { partNumber: "CS-FRAME",       partName: "Carbon Steel Frame Section",  materialType: "Carbon Steel Q235B",   co2PerKg: 2.33, region: "CN" },
  { partNumber: "PUMP-HIGH-P",    partName: "High-Pressure Wash Pump",     materialType: "Cast Iron + Steel",    co2PerKg: 3.80, region: "CN" },
  { partNumber: "NOZZLE-SS",      partName: "SS Spray Nozzle Assembly",    materialType: "Stainless Steel 304",  co2PerKg: 5.50, region: "CN" },
  { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",        materialType: "Inconel + Copper",     co2PerKg: 8.20, region: "CN" },
  { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",         materialType: "Electronics",          co2PerKg: 20.00, region: "DE" },
  { partNumber: "TRANSDUCER-40K", partName: "40kHz Ultrasonic Transducer", materialType: "Piezo Ceramic + SS",   co2PerKg: 12.50, region: "CN" },
];

const ENERGY_PROFILES: MachineEnergyProfile[] = [
  { machineCode: "CNC-001",       machineName: "CNC Machining Center #1", kwPerHour: 25.0, gridCo2Factor: 0.581 },
  { machineCode: "CNC-002",       machineName: "CNC Machining Center #2", kwPerHour: 25.0, gridCo2Factor: 0.581 },
  { machineCode: "WLD-TIG-001",   machineName: "TIG Welding Station",     kwPerHour: 18.0, gridCo2Factor: 0.581 },
  { machineCode: "LASER-001",     machineName: "Fiber Laser Cutter",      kwPerHour: 40.0, gridCo2Factor: 0.581 },
  { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",         kwPerHour: 30.0, gridCo2Factor: 0.581 },
  { machineCode: "PAINT-001",     machineName: "Powder Coating Line",     kwPerHour: 15.0, gridCo2Factor: 0.581 },
];

const PRODUCT_BOMS: Record<string, BomMaterial[]> = {
  "GWM-3000": [
    { partNumber: "SS316-PLATE", partName: "Stainless Steel 316L Plate", qtyPerUnit: 8, weightKg: 25.0 },
    { partNumber: "CS-FRAME",    partName: "Carbon Steel Frame Section", qtyPerUnit: 4, weightKg: 30.0 },
    { partNumber: "PUMP-HIGH-P", partName: "High-Pressure Wash Pump",    qtyPerUnit: 2, weightKg: 15.0 },
    { partNumber: "NOZZLE-SS",   partName: "SS Spray Nozzle Assembly",   qtyPerUnit: 12, weightKg: 0.8 },
    { partNumber: "HEATER-6KW",  partName: "Immersion Heater 6kW",       qtyPerUnit: 2, weightKg: 5.0 },
    { partNumber: "PLC-SIEMENS", partName: "Siemens S7-1200 PLC",        qtyPerUnit: 1, weightKg: 1.2 },
  ],
  "GUC-500": [
    { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",  qtyPerUnit: 4, weightKg: 15.0 },
    { partNumber: "TRANSDUCER-40K", partName: "40kHz Ultrasonic Transducer", qtyPerUnit: 8, weightKg: 2.0 },
    { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",        qtyPerUnit: 1, weightKg: 5.0 },
    { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",         qtyPerUnit: 1, weightKg: 1.2 },
  ],
  "GSC-200": [
    { partNumber: "SS316-PLATE",    partName: "Stainless Steel 316L Plate",  qtyPerUnit: 20, weightKg: 25.0 },
    { partNumber: "CS-FRAME",       partName: "Carbon Steel Frame Section",  qtyPerUnit: 12, weightKg: 30.0 },
    { partNumber: "PUMP-HIGH-P",    partName: "High-Pressure Wash Pump",     qtyPerUnit: 6, weightKg: 15.0 },
    { partNumber: "NOZZLE-SS",      partName: "SS Spray Nozzle Assembly",    qtyPerUnit: 40, weightKg: 0.8 },
    { partNumber: "TRANSDUCER-40K", partName: "40kHz Ultrasonic Transducer", qtyPerUnit: 20, weightKg: 2.0 },
    { partNumber: "HEATER-6KW",     partName: "Immersion Heater 6kW",        qtyPerUnit: 6, weightKg: 5.0 },
    { partNumber: "PLC-SIEMENS",    partName: "Siemens S7-1200 PLC",         qtyPerUnit: 2, weightKg: 1.2 },
  ],
};

const PRODUCT_STEPS: Record<string, MachiningStep[]> = {
  "GWM-3000": [
    { machineCode: "LASER-001",     machineName: "Fiber Laser Cutter",   durationHours: 6.0 },
    { machineCode: "CNC-001",       machineName: "CNC Machining Center", durationHours: 8.0 },
    { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      durationHours: 3.0 },
    { machineCode: "WLD-TIG-001",   machineName: "TIG Welding Station",  durationHours: 12.0 },
    { machineCode: "PAINT-001",     machineName: "Powder Coating Line",  durationHours: 4.0 },
  ],
  "GUC-500": [
    { machineCode: "LASER-001",    machineName: "Fiber Laser Cutter",   durationHours: 3.0 },
    { machineCode: "CNC-001",      machineName: "CNC Machining Center", durationHours: 4.0 },
    { machineCode: "WLD-TIG-001",  machineName: "TIG Welding Station",  durationHours: 6.0 },
    { machineCode: "PAINT-001",    machineName: "Powder Coating Line",  durationHours: 2.0 },
  ],
  "GSC-200": [
    { machineCode: "LASER-001",     machineName: "Fiber Laser Cutter",   durationHours: 16.0 },
    { machineCode: "CNC-001",       machineName: "CNC Machining Center", durationHours: 20.0 },
    { machineCode: "CNC-002",       machineName: "CNC Machining Center", durationHours: 12.0 },
    { machineCode: "HYD-BENCH-001", machineName: "Hydraulic Press",      durationHours: 8.0 },
    { machineCode: "WLD-TIG-001",   machineName: "TIG Welding Station",  durationHours: 24.0 },
    { machineCode: "PAINT-001",     machineName: "Powder Coating Line",  durationHours: 8.0 },
  ],
};

// ─── Component ───────────────────────────────────────────────────────

export default function CbamDashboard() {
  const { t, tpl } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<string>("GWM-3000");
  const [activeTab, setActiveTab] = useState<"overview" | "materials" | "energy" | "eco-sim">("overview");
  const [showDeclaration, setShowDeclaration] = useState(false);

  // Calculate all product footprints
  const allFootprints = useMemo(() => {
    return PRODUCTS.map(p => {
      const bom = PRODUCT_BOMS[p.code] ?? [];
      const steps = PRODUCT_STEPS[p.code] ?? [];
      return calculateProductFootprint(p.code, p.name, bom, CARBON_FACTORS, steps, ENERGY_PROFILES, p.euThreshold);
    });
  }, []);

  const selectedFootprint = allFootprints.find(f => f.productCode === selectedProduct) ?? allFootprints[0];

  const summary = useMemo(() => ({
    totalCo2: allFootprints.reduce((s, f) => s + f.totalCo2, 0),
    compliant: allFootprints.filter(f => f.status === "COMPLIANT").length,
    atRisk: allFootprints.filter(f => f.status === "AT_RISK").length,
    nonCompliant: allFootprints.filter(f => f.status === "NON_COMPLIANT").length,
  }), [allFootprints]);

  const statusColor = (status: CbamStatus) => {
    switch (status) {
      case "COMPLIANT": return { bg: "#dcfce7", text: "#166534", border: "#16a34a" };
      case "AT_RISK": return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" };
      case "NON_COMPLIANT": return { bg: "#fecaca", text: "#991b1b", border: "#ef4444" };
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <span style={{ fontSize: "32px" }}>🌱</span>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>{t("admin.cbam.title")}</h1>
        </div>
        <p style={{ color: "#6b7280", margin: 0 }}>
          {t("admin.cbam.subtitle")}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>{t("admin.cbam.totalPortfolioCo2")}</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#166534" }}>{summary.totalCo2.toLocaleString()} kg</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>{tpl("admin.cbam.productsTracked", { count: String(allFootprints.length) })}</div>
        </div>
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>{t("admin.cbam.compliant")}</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#166534" }}>{summary.compliant}</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>{t("admin.cbam.readyForExport")}</div>
        </div>
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#92400e", fontWeight: 600, textTransform: "uppercase" }}>{t("admin.cbam.atRisk")}</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#92400e" }}>{summary.atRisk}</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>{t("admin.cbam.within10Pct")}</div>
        </div>
        <div style={{ background: summary.nonCompliant > 0 ? "#fecaca" : "#f3f4f6", border: `1px solid ${summary.nonCompliant > 0 ? "#fca5a5" : "#d1d5db"}`, borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", color: summary.nonCompliant > 0 ? "#991b1b" : "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{t("admin.cbam.nonCompliant")}</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: summary.nonCompliant > 0 ? "#991b1b" : "#374151" }}>{summary.nonCompliant}</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>{t("admin.cbam.blockedExport")}</div>
        </div>
      </div>

      {/* Product Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {allFootprints.map(fp => {
          const sc = statusColor(fp.status);
          const isSelected = fp.productCode === selectedProduct;
          return (
            <div
              key={fp.productCode}
              onClick={() => setSelectedProduct(fp.productCode)}
              style={{
                border: `2px solid ${isSelected ? sc.border : "#e5e7eb"}`,
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
                background: isSelected ? sc.bg : "#fff",
                transition: "all 0.2s",
                position: "relative",
                ...(fp.status === "NON_COMPLIANT" ? { animation: "criticalPulse 2s infinite" } : {}),
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>{fp.productCode}</div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>{fp.productName}</div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700,
                  background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                }}>
                  {fp.status}
                </span>
              </div>

              {/* CO₂ Bar */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600 }}>{fp.totalCo2.toLocaleString()} kg CO₂e</span>
                  <span style={{ color: "#6b7280" }}>{tpl("admin.cbam.kgLimit", { limit: fp.euThreshold.toLocaleString() })}</span>
                </div>
                <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min((fp.totalCo2 / fp.euThreshold) * 100, 100)}%`,
                    background: fp.status === "COMPLIANT" ? "#22c55e" : fp.status === "AT_RISK" ? "#f59e0b" : "#ef4444",
                    borderRadius: "4px",
                    transition: "width 0.5s ease",
                  }} />
                </div>
              </div>

              {/* Split indicator */}
              <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
                <span style={{ color: "#2563eb" }}>● {tpl("admin.cbam.materials", { pct: String(fp.materialPercent) })}</span>
                <span style={{ color: "#d97706" }}>● {tpl("admin.cbam.energy", { pct: String(fp.energyPercent) })}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Section */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", background: "#fff" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
          {(["overview", "materials", "energy", "eco-sim"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 24px", border: "none", background: activeTab === tab ? "#fff" : "#f9fafb",
                borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
                fontWeight: activeTab === tab ? 700 : 400, cursor: "pointer", fontSize: "14px",
                color: activeTab === tab ? "#2563eb" : "#6b7280",
              }}
            >
              {tab === "overview" ? t("admin.cbam.tabOverview") : tab === "materials" ? t("admin.cbam.tabMaterials") : tab === "energy" ? t("admin.cbam.tabEnergy") : t("admin.cbam.tabEcoSim")}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px" }}>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div>
              <h3 style={{ marginTop: 0, fontSize: "18px" }}>{selectedFootprint.productCode}: {t("admin.cbam.carbonBreakdown")}</h3>

              {/* SVG Pie-like visual */}
              <div style={{ display: "flex", gap: "40px", alignItems: "center", marginBottom: "24px" }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="30" />
                  {/* Material arc (Scope 3) */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#3b82f6" strokeWidth="30"
                    strokeDasharray={`${selectedFootprint.materialPercent * 5.027} ${502.7 - selectedFootprint.materialPercent * 5.027}`}
                    strokeDashoffset="125.7"
                    strokeLinecap="round" />
                  {/* Energy arc (Scope 2) */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#f59e0b" strokeWidth="30"
                    strokeDasharray={`${selectedFootprint.energyPercent * 5.027} ${502.7 - selectedFootprint.energyPercent * 5.027}`}
                    strokeDashoffset={`${125.7 - selectedFootprint.materialPercent * 5.027}`}
                    strokeLinecap="round" />
                  {/* Center text */}
                  <text x="100" y="92" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">
                    {selectedFootprint.totalCo2.toLocaleString()}
                  </text>
                  <text x="100" y="112" textAnchor="middle" fontSize="12" fill="#6b7280">kg CO₂e</text>
                </svg>

                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#3b82f6", display: "inline-block" }} />
                      <span style={{ fontWeight: 600 }}>{t("admin.cbam.scope3Materials")}</span>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#3b82f6" }}>
                      {selectedFootprint.materialCo2.toLocaleString()} kg CO₂e
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>{tpl("admin.cbam.upstreamSupplyChain", { pct: String(selectedFootprint.materialPercent) })}</div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#f59e0b", display: "inline-block" }} />
                      <span style={{ fontWeight: 600 }}>{t("admin.cbam.scope2Energy")}</span>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#d97706" }}>
                      {selectedFootprint.energyCo2.toLocaleString()} kg CO₂e
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>{tpl("admin.cbam.mfgElectricity", { pct: String(selectedFootprint.energyPercent) })}</div>
                  </div>
                </div>
              </div>

              {/* EU CBAM Threshold Bar */}
              <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>{t("admin.cbam.euCbamThreshold")}</span>
                  <span style={{ fontWeight: 700, color: statusColor(selectedFootprint.status).text }}>
                    {selectedFootprint.status === "COMPLIANT" ? t("admin.cbam.statusCompliant") : selectedFootprint.status === "AT_RISK" ? t("admin.cbam.statusAtRisk") : t("admin.cbam.statusNonCompliant")}
                  </span>
                </div>
                <div style={{ height: "24px", background: "#e5e7eb", borderRadius: "12px", position: "relative", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min((selectedFootprint.totalCo2 / selectedFootprint.euThreshold) * 100, 100)}%`,
                    background: `linear-gradient(90deg, #22c55e 0%, #22c55e 80%, #f59e0b 90%, #ef4444 100%)`,
                    borderRadius: "12px",
                    transition: "width 0.5s",
                  }} />
                  {/* 90% warning line */}
                  <div style={{
                    position: "absolute", top: 0, bottom: 0, left: "90%",
                    borderLeft: "2px dashed #6b7280", zIndex: 1,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11px", color: "#9ca3af" }}>
                  <span>0</span>
                  <span style={{ marginLeft: "80%" }}>{t("admin.cbam.ninetyPctLine")}</span>
                  <span>{selectedFootprint.euThreshold.toLocaleString()} kg</span>
                </div>
              </div>

              {/* CBAM Declaration Button */}
              <button
                onClick={() => setShowDeclaration(true)}
                style={{
                  width: "100%", padding: "16px", borderRadius: "8px", border: "none",
                  background: selectedFootprint.status === "COMPLIANT" ? "#166534" : "#6b7280",
                  color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer",
                  opacity: selectedFootprint.status === "COMPLIANT" ? 1 : 0.6,
                }}
              >
                {t("admin.cbam.generateDeclaration")}
              </button>
              {selectedFootprint.status !== "COMPLIANT" && (
                <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px", textAlign: "center" }}>
                  {t("admin.cbam.mustBeCompliant")}
                </p>
              )}
            </div>
          )}

          {/* MATERIALS TAB (Scope 3) */}
          {activeTab === "materials" && (
            <div>
              <h3 style={{ marginTop: 0 }}>{tpl("admin.cbam.materialBreakdownTitle", { code: selectedFootprint.productCode })}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>{t("admin.cbam.thPart")}</th>
                    <th style={{ padding: "8px 12px" }}>{t("admin.cbam.thMaterial")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thWeight")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thCo2PerKg")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thTotalCo2e")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thShare")}</th>
                    <th style={{ padding: "8px 12px" }}>{t("admin.cbam.thImpact")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFootprint.materialBreakdown
                    .sort((a, b) => b.totalCo2 - a.totalCo2)
                    .map(item => {
                      const factor = CARBON_FACTORS.find(f => f.partNumber === item.partNumber);
                      return (
                        <tr key={item.partNumber} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.partNumber}</td>
                          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{factor?.materialType ?? item.partName}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.weightKg.toFixed(1)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.co2PerKg.toFixed(2)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{item.totalCo2.toLocaleString()}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.percentOfTotal.toFixed(1)}%</td>
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ height: "8px", width: "100px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${item.percentOfTotal}%`, background: item.percentOfTotal > 40 ? "#ef4444" : item.percentOfTotal > 20 ? "#f59e0b" : "#22c55e", borderRadius: "4px" }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #111827", fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: "8px 12px" }}>{t("admin.cbam.totalScope3")}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#3b82f6" }}>{selectedFootprint.materialCo2.toLocaleString()} kg</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>100%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ENERGY TAB (Scope 2) */}
          {activeTab === "energy" && (
            <div>
              <h3 style={{ marginTop: 0 }}>{tpl("admin.cbam.energyBreakdownTitle", { code: selectedFootprint.productCode })}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>{t("admin.cbam.thMachine")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thDuration")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thPower")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thEnergy")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thGridFactor")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thCo2e")}</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>{t("admin.cbam.thShare")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFootprint.energyBreakdown
                    .sort((a, b) => b.totalCo2 - a.totalCo2)
                    .map(item => (
                      <tr key={item.machineCode} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ fontWeight: 600 }}>{item.machineCode}</div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>{item.machineName}</div>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.durationHours}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.kwPerHour}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.energyKwh.toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.gridCo2Factor}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>{item.totalCo2.toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.percentOfTotal.toFixed(1)}%</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #111827", fontWeight: 700 }}>
                    <td colSpan={5} style={{ padding: "8px 12px" }}>{t("admin.cbam.totalScope2")}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#d97706" }}>{selectedFootprint.energyCo2.toFixed(2)} kg</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>100%</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ marginTop: "16px", padding: "12px", background: "#fffbeb", borderRadius: "8px", fontSize: "13px", color: "#92400e" }}>
                {t("admin.cbam.gridFactorNote")}
              </div>
            </div>
          )}

          {/* ECO SIMULATION TAB */}
          {activeTab === "eco-sim" && (
            <EcoSimulationTab footprint={selectedFootprint} />
          )}
        </div>
      </div>

      {/* Architecture Diagram */}
      <div style={{ marginTop: "24px", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", background: "#fafafa" }}>
        <h3 style={{ marginTop: 0, fontSize: "16px" }}>{t("admin.cbam.architectureTitle")}</h3>
        <svg viewBox="0 0 900 220" style={{ width: "100%", maxWidth: "900px" }}>
          {/* Step boxes */}
          {[
            { x: 10,  label: "① BOM Explosion",   sub: "Product → Parts × Qty", color: "#3b82f6" },
            { x: 190, label: "② Scope 3 Calc",     sub: "Weight × CO₂/kg Factor", color: "#3b82f6" },
            { x: 370, label: "③ Scope 2 Calc",     sub: "kWh × Grid CO₂ Factor",  color: "#f59e0b" },
            { x: 550, label: "④ Aggregate",         sub: "Scope 2 + Scope 3",      color: "#8b5cf6" },
            { x: 730, label: "⑤ CBAM Classify",    sub: "vs EU Threshold",         color: "#166534" },
          ].map((step, i) => (
            <g key={i}>
              <rect x={step.x} y="60" width="155" height="80" rx="8" fill={step.color} opacity="0.1" stroke={step.color} strokeWidth="2" />
              <text x={step.x + 78} y="92" textAnchor="middle" fontSize="13" fontWeight="700" fill={step.color}>{step.label}</text>
              <text x={step.x + 78} y="118" textAnchor="middle" fontSize="10" fill="#6b7280">{step.sub}</text>
              {i < 4 && <path d={`M${step.x + 160} 100 L${step.x + 185} 100`} stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow)" />}
            </g>
          ))}
          {/* Arrow marker */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
            </marker>
          </defs>
          {/* Result labels */}
          <text x="808" y="170" textAnchor="middle" fontSize="11" fill="#166534" fontWeight="700">COMPLIANT → ✅ Ship</text>
          <text x="808" y="190" textAnchor="middle" fontSize="11" fill="#92400e" fontWeight="700">AT_RISK → ⚠ Alert</text>
          <text x="808" y="210" textAnchor="middle" fontSize="11" fill="#991b1b" fontWeight="700">NON_COMP → 🛑 Block</text>
        </svg>
      </div>

      {/* Declaration Modal */}
      {showDeclaration && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "600px", width: "100%" }}>
            <h2 style={{ marginTop: 0 }}>{t("admin.cbam.declarationTitle")}</h2>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <table style={{ width: "100%", fontSize: "14px" }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.declarationId")}</td><td style={{ fontWeight: 600 }}>CBAM-{selectedFootprint.productCode}-{Date.now()}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.product")}</td><td style={{ fontWeight: 600 }}>{selectedFootprint.productName}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.totalCo2e")}</td><td style={{ fontWeight: 600 }}>{selectedFootprint.totalCo2.toLocaleString()} kg</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.scope3Label")}</td><td>{selectedFootprint.materialCo2.toLocaleString()} kg</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.scope2Label")}</td><td>{selectedFootprint.energyCo2.toLocaleString()} kg</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.euThreshold")}</td><td>{selectedFootprint.euThreshold.toLocaleString()} kg</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.status")}</td><td style={{ fontWeight: 700, color: statusColor(selectedFootprint.status).text }}>{selectedFootprint.status}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.date")}</td><td>{new Date().toISOString().split("T")[0]}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "4px 0" }}>{t("admin.cbam.certifiedBy")}</td><td>{t("admin.cbam.esgComplianceOfficer")}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => { alert(t("admin.cbam.pdfGenerated")); setShowDeclaration(false); }}
                style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "#166534", color: "#fff", fontWeight: 700, cursor: "pointer" }}
              >
                {t("admin.cbam.downloadPdf")}
              </button>
              <button
                onClick={() => setShowDeclaration(false)}
                style={{ padding: "12px 24px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
              >
                {t("admin.cbam.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

// ─── ECO Simulation Sub-component ────────────────────────────────────

function EcoSimulationTab({ footprint }: { footprint: ProductFootprint }) {
  const { t, tpl } = useLanguage();
  const [swapResult, setSwapResult] = useState<{
    beforeTotalCo2: number; afterTotalCo2: number; co2Reduction: number;
    reductionPercent: number; beforeStatus: CbamStatus; afterStatus: CbamStatus;
  } | null>(null);

  const runSimulation = () => {
    // Simulate: SS316-PLATE (6.15 CO₂/kg) → Green Steel H2-DRI (2.5 CO₂/kg)
    const ss316 = footprint.materialBreakdown.find(b => b.partNumber === "SS316-PLATE");
    if (!ss316) return;

    const savedCo2 = Math.round((ss316.co2PerKg - 2.5) * ss316.weightKg * 100) / 100;
    const afterTotal = Math.round((footprint.totalCo2 - savedCo2) * 100) / 100;

    setSwapResult({
      beforeTotalCo2: footprint.totalCo2,
      afterTotalCo2: afterTotal,
      co2Reduction: savedCo2,
      reductionPercent: Math.round((savedCo2 / footprint.totalCo2) * 10000) / 100,
      beforeStatus: footprint.status,
      afterStatus: classifyCbamStatus(afterTotal, footprint.euThreshold),
    });
  };

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{tpl("admin.cbam.ecoSimTitle", { code: footprint.productCode })}</h3>
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, marginBottom: "8px" }}>{t("admin.cbam.proposedEco")}</div>
        <div style={{ fontSize: "14px", color: "#374151" }}>
          {t("admin.cbam.ecoDescription")}
        </div>
      </div>

      <button
        onClick={runSimulation}
        style={{
          padding: "12px 24px", borderRadius: "8px", border: "none",
          background: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "15px",
          marginBottom: "24px",
        }}
      >
        {t("admin.cbam.runSimulation")}
      </button>

      {swapResult && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: "16px", alignItems: "center", marginBottom: "24px" }}>
            {/* Before */}
            <div style={{
              border: `2px solid ${swapResult.beforeStatus === "COMPLIANT" ? "#22c55e" : swapResult.beforeStatus === "AT_RISK" ? "#f59e0b" : "#ef4444"}`,
              borderRadius: "12px", padding: "20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{t("admin.cbam.beforeEco")}</div>
              <div style={{ fontSize: "28px", fontWeight: 700 }}>{swapResult.beforeTotalCo2.toLocaleString()}</div>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>kg CO₂e</div>
              <span style={{
                display: "inline-block", marginTop: "8px", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700,
                background: swapResult.beforeStatus === "COMPLIANT" ? "#dcfce7" : swapResult.beforeStatus === "AT_RISK" ? "#fef3c7" : "#fecaca",
                color: swapResult.beforeStatus === "COMPLIANT" ? "#166534" : swapResult.beforeStatus === "AT_RISK" ? "#92400e" : "#991b1b",
              }}>
                {swapResult.beforeStatus}
              </span>
            </div>

            {/* Arrow */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px" }}>→</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#16a34a" }}>-{swapResult.reductionPercent}%</div>
            </div>

            {/* After */}
            <div style={{
              border: `2px solid ${swapResult.afterStatus === "COMPLIANT" ? "#22c55e" : swapResult.afterStatus === "AT_RISK" ? "#f59e0b" : "#ef4444"}`,
              borderRadius: "12px", padding: "20px", textAlign: "center",
              background: swapResult.afterStatus === "COMPLIANT" ? "#f0fdf4" : undefined,
            }}>
              <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{t("admin.cbam.afterEco")}</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#166534" }}>{swapResult.afterTotalCo2.toLocaleString()}</div>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>kg CO₂e</div>
              <span style={{
                display: "inline-block", marginTop: "8px", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700,
                background: swapResult.afterStatus === "COMPLIANT" ? "#dcfce7" : swapResult.afterStatus === "AT_RISK" ? "#fef3c7" : "#fecaca",
                color: swapResult.afterStatus === "COMPLIANT" ? "#166534" : swapResult.afterStatus === "AT_RISK" ? "#92400e" : "#991b1b",
              }}>
                {swapResult.afterStatus}
              </span>
            </div>
          </div>

          {/* Savings summary */}
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "20px", border: "1px solid #86efac" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#166534", marginBottom: "8px" }}>
              {tpl("admin.cbam.co2Reduction", { amount: swapResult.co2Reduction.toLocaleString(), pct: String(swapResult.reductionPercent) })}
            </div>
            <div style={{ fontSize: "13px", color: "#374151" }}>
              {tpl("admin.cbam.savingsDescription", { amount: swapResult.co2Reduction.toLocaleString(), annual: (swapResult.co2Reduction * 50).toLocaleString() })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
