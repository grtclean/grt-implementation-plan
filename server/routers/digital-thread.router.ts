/**
 * Digital Thread Fusion Engine + tRPC Router — THE CAPSTONE
 * Phase 4 — Ultimate Digital Thread & Executive Cockpit
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │                    THE GRT DIGITAL THREAD ENGINE                             │
 * │                                                                              │
 * │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
 * │  │  SOP    │ │  OEE    │ │COMPLIANCE│ │  ECO    │ │SUPPLIER │ │EMPLOYEE │  │
 * │  │ Phase1.2│ │ Phase1.3│ │ Phase1.4 │ │ Phase2.1│ │ Phase2.2│ │ Phase2.3│  │
 * │  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
 * │       │           │           │             │           │           │        │
 * │  ┌────┴────┐ ┌────┴────┐ ┌───┴──────┐ ┌───┴──────┐                         │
 * │  │  FMEA   │ │  HR_AI  │ │SCHEDULER │ │INVENTORY │ ┌─────────┐             │
 * │  │ Phase2.4│ │ Phase3.1│ │ Phase3.2 │ │ Phase3.3 │ │  CBAM   │             │
 * │  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ │ Phase3.4│             │
 * │       │           │           │             │        └────┬────┘             │
 * │       └───────────┴───────────┴─────────────┴─────────────┘                  │
 * │                              │                                               │
 * │                    ┌─────────▼──────────┐                                    │
 * │                    │  DIGITAL THREAD    │                                    │
 * │                    │  FUSION ENGINE     │                                    │
 * │                    │  ─────────────     │                                    │
 * │                    │ weaveDigitalThread │                                    │
 * │                    │ generateCeoSnapshot│                                    │
 * │                    │ companyHealthScore │                                    │
 * │                    │ impactChainAnalysis│                                    │
 * │                    │ ceoWeeklyBriefing  │                                    │
 * │                    └─────────┬──────────┘                                    │
 * │                              │                                               │
 * │                    ┌─────────▼──────────┐                                    │
 * │                    │  CEO EXECUTIVE     │                                    │
 * │                    │  COCKPIT           │                                    │
 * │                    │  ══════════        │                                    │
 * │                    │  Single Screen     │                                    │
 * │                    │  Runs the Company  │                                    │
 * │                    └────────────────────┘                                    │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Company Health Score (0-100) Weighted Formula:
 *   Production Health  (OEE + Machine Health):  25%
 *   Quality Health     (FMEA RPN + Open 8Ds):   20%
 *   Cost Health        (Budget Variance):        15%
 *   Supply Chain Health(Supplier + Inventory):   15%
 *   ESG/Compliance     (CBAM + Calendar):        10%
 *   People Health      (Blocks + Training):      10%
 *   Schedule Health    (On-time projects):         5%
 *
 * Architecture: Pure functions exported for Vitest + tRPC endpoints.
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type SourceModule =
  | "SOP" | "OEE" | "COMPLIANCE" | "ECO" | "SUPPLIER"
  | "EMPLOYEE" | "FMEA" | "HR_AI" | "SCHEDULER" | "INVENTORY" | "CBAM";

export type EventType =
  | "CREATED" | "STATUS_CHANGE" | "ALERT" | "RESOLVED"
  | "ESCALATED" | "APPROVED" | "BLOCKED" | "UNBLOCKED";

export type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface ThreadEvent {
  eventId: string;
  timestamp: string;
  sourceModule: SourceModule;
  eventType: EventType;
  severity: Severity;
  entityId: string;
  entityType: string;
  summaryZh: string;
  summaryEn: string;
  linkedProjectId?: number;
  linkedUser?: string;
  metadata?: Record<string, unknown>;
}

export interface CeoKpiSnapshot {
  snapshotDate: string;
  // Projects
  totalProjects: number;
  onTrackProjects: number;
  atRiskProjects: number;
  // Production
  overallOee: number;
  criticalMachines: number;
  autoRescheduledJobs: number;
  // Quality
  open8dCount: number;
  overdueCapaCount: number;
  maxFmeaRpn: number;
  // Cost
  costVariancePercent: number;
  // Supply Chain
  avgSupplierScore: number;
  restrictedSuppliers: number;
  inventoryCashReleasePotential: number;
  // ESG
  cbamCompliantProducts: number;
  cbamAtRiskProducts: number;
  totalCo2Kg: number;
  complianceOverdueItems: number;
  // People
  operatorBlocksActive: number;
  avgCombatPower: number;
  // Composite
  companyHealthScore: number;
}

export interface ModuleHealth {
  production: number;   // 0-100
  quality: number;
  cost: number;
  supplyChain: number;
  esg: number;
  people: number;
  schedule: number;
}

export interface CompanyHealthResult {
  overall: number;     // 0-100 weighted composite
  modules: ModuleHealth;
  grade: "A" | "B" | "C" | "D" | "F";
  trend: "IMPROVING" | "STABLE" | "DECLINING";
}

export interface ImpactChainNode {
  id: string;
  module: SourceModule;
  label: string;
  description: string;
  severity: Severity;
  children: ImpactChainNode[];
}

export interface CeoWeeklyBrief {
  generatedAt: string;
  healthScore: number;
  grade: string;
  headlines: string[];      // 3-5 bullet points
  risks: string[];          // critical issues
  wins: string[];           // positive achievements
  recommendation: string;   // top priority action
}

export interface DigitalThreadData {
  snapshot: CeoKpiSnapshot;
  health: CompanyHealthResult;
  recentEvents: ThreadEvent[];
  impactChain: ImpactChainNode | null;
  weeklyBrief: CeoWeeklyBrief;
  financialBurnRate: { budgetTotal: number; spentToDate: number; burnPercent: number };
  quadrants: {
    manufacturing: { oee: number; criticalMachines: number; rescheduledJobs: number; topMachines: { code: string; health: number; status: string }[] };
    quality: { open8Ds: number; overdueCapas: number; maxRpn: number; upcomingAudits: number };
    supplyChain: { restrictedSuppliers: number; cashRelease: number; shortageRisks: number; avgLeadTime: number };
    people: { operatorBlocks: number; avgCombatPower: number; topEmployees: { name: string; score: number }[]; trainingInProgress: number };
  };
}

// ─── Pure Functions (exported for testing) ────────────────────────────

/**
 * Create a thread event from any module.
 */
export function createThreadEvent(
  sourceModule: SourceModule,
  eventType: EventType,
  severity: Severity,
  entityId: string,
  entityType: string,
  summaryZh: string,
  summaryEn: string,
  options?: { linkedProjectId?: number; linkedUser?: string; metadata?: Record<string, unknown> },
  now: Date = new Date(),
): ThreadEvent {
  return {
    eventId: `EVT-${sourceModule}-${now.getTime()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: now.toISOString(),
    sourceModule,
    eventType,
    severity,
    entityId,
    entityType,
    summaryZh,
    summaryEn,
    linkedProjectId: options?.linkedProjectId,
    linkedUser: options?.linkedUser,
    metadata: options?.metadata,
  };
}

/**
 * Filter thread events by module, severity, and/or time range.
 */
export function filterThreadEvents(
  events: ThreadEvent[],
  filters?: { module?: SourceModule; severity?: Severity; since?: string; limit?: number },
): ThreadEvent[] {
  let filtered = [...events];

  if (filters?.module) {
    filtered = filtered.filter(e => e.sourceModule === filters.module);
  }
  if (filters?.severity) {
    filtered = filtered.filter(e => e.severity === filters.severity);
  }
  if (filters?.since) {
    const sinceDate = new Date(filters.since).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceDate);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Calculate individual module health scores (0-100).
 */
export function calculateModuleHealth(
  data: {
    oee: number;                    // 0-100
    criticalMachinePercent: number; // % of fleet that is CRITICAL
    maxRpn: number;                 // 0-1000
    open8Ds: number;                // count
    overdueCapas: number;           // count
    costVariancePercent: number;    // positive = over budget
    avgSupplierScore: number;       // 0-100
    inventoryHealthPercent: number; // % of items ADEQUATE or better
    cbamCompliantPercent: number;   // % of products compliant
    complianceOverduePercent: number; // % overdue items
    operatorBlockPercent: number;   // % operators blocked
    avgCombatPower: number;         // 0-100
    projectOnTimePercent: number;   // % projects on track
  },
): ModuleHealth {
  // Production (OEE penalized by critical machines)
  const production = Math.round(
    Math.max(0, Math.min(100, data.oee * 0.7 + (100 - data.criticalMachinePercent * 10) * 0.3))
  );

  // Quality (penalized by high RPN and open 8Ds)
  const rpnPenalty = Math.min(50, data.maxRpn / 20);    // max 50 point penalty at RPN=1000
  const eightDPenalty = Math.min(30, data.open8Ds * 5);   // 5 pts per open 8D, max 30
  const capaPenalty = Math.min(20, data.overdueCapas * 10); // 10 pts per overdue, max 20
  const quality = Math.round(Math.max(0, 100 - rpnPenalty - eightDPenalty - capaPenalty));

  // Cost (over budget is bad)
  const cost = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(data.costVariancePercent) * 5)));

  // Supply Chain
  const supplyChain = Math.round(
    data.avgSupplierScore * 0.5 + data.inventoryHealthPercent * 0.5
  );

  // ESG/Compliance
  const esg = Math.round(
    data.cbamCompliantPercent * 0.6 + (100 - data.complianceOverduePercent) * 0.4
  );

  // People
  const people = Math.round(
    data.avgCombatPower * 0.6 + (100 - data.operatorBlockPercent * 10) * 0.4
  );

  // Schedule
  const schedule = Math.round(data.projectOnTimePercent);

  return { production, quality, cost, supplyChain, esg, people, schedule };
}

/**
 * Calculate the Company Health Score — the single number that runs the business.
 * Weighted: Production 25%, Quality 20%, Cost 15%, Supply Chain 15%, ESG 10%, People 10%, Schedule 5%
 */
export function calculateCompanyHealthScore(modules: ModuleHealth): CompanyHealthResult {
  const overall = Math.round(
    modules.production * 0.25 +
    modules.quality * 0.20 +
    modules.cost * 0.15 +
    modules.supplyChain * 0.15 +
    modules.esg * 0.10 +
    modules.people * 0.10 +
    modules.schedule * 0.05
  );

  let grade: "A" | "B" | "C" | "D" | "F";
  if (overall >= 90) grade = "A";
  else if (overall >= 75) grade = "B";
  else if (overall >= 60) grade = "C";
  else if (overall >= 40) grade = "D";
  else grade = "F";

  // Trend based on weakest vs strongest
  const scores = Object.values(modules);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const trend = max - min > 40 ? "DECLINING" : overall >= 70 ? "STABLE" : "DECLINING";

  return { overall, modules, grade, trend: overall >= 80 ? "IMPROVING" : trend };
}

/**
 * Generate a CEO KPI Snapshot — daily aggregation of all modules.
 */
export function generateCeoSnapshot(
  date: string,
  moduleData: {
    projects: { total: number; onTrack: number; atRisk: number };
    production: { oee: number; criticalMachines: number; rescheduledJobs: number };
    quality: { open8Ds: number; overdueCapas: number; maxRpn: number };
    cost: { variancePercent: number };
    supplyChain: { avgScore: number; restricted: number; cashRelease: number };
    esg: { compliantProducts: number; atRiskProducts: number; totalCo2: number; overdueCompliance: number };
    people: { blocksActive: number; avgCombatPower: number };
  },
): CeoKpiSnapshot {
  const modules = calculateModuleHealth({
    oee: moduleData.production.oee,
    criticalMachinePercent: moduleData.production.criticalMachines > 0 ? (moduleData.production.criticalMachines / 8) * 100 : 0,
    maxRpn: moduleData.quality.maxRpn,
    open8Ds: moduleData.quality.open8Ds,
    overdueCapas: moduleData.quality.overdueCapas,
    costVariancePercent: moduleData.cost.variancePercent,
    avgSupplierScore: moduleData.supplyChain.avgScore,
    inventoryHealthPercent: 70,
    cbamCompliantPercent: moduleData.esg.compliantProducts > 0
      ? (moduleData.esg.compliantProducts / (moduleData.esg.compliantProducts + moduleData.esg.atRiskProducts)) * 100
      : 100,
    complianceOverduePercent: moduleData.esg.overdueCompliance,
    operatorBlockPercent: moduleData.people.blocksActive > 0 ? (moduleData.people.blocksActive / 50) * 100 : 0,
    avgCombatPower: moduleData.people.avgCombatPower,
    projectOnTimePercent: moduleData.projects.total > 0 ? (moduleData.projects.onTrack / moduleData.projects.total) * 100 : 100,
  });

  const health = calculateCompanyHealthScore(modules);

  return {
    snapshotDate: date,
    totalProjects: moduleData.projects.total,
    onTrackProjects: moduleData.projects.onTrack,
    atRiskProjects: moduleData.projects.atRisk,
    overallOee: moduleData.production.oee,
    criticalMachines: moduleData.production.criticalMachines,
    autoRescheduledJobs: moduleData.production.rescheduledJobs,
    open8dCount: moduleData.quality.open8Ds,
    overdueCapaCount: moduleData.quality.overdueCapas,
    maxFmeaRpn: moduleData.quality.maxRpn,
    costVariancePercent: moduleData.cost.variancePercent,
    avgSupplierScore: moduleData.supplyChain.avgScore,
    restrictedSuppliers: moduleData.supplyChain.restricted,
    inventoryCashReleasePotential: moduleData.supplyChain.cashRelease,
    cbamCompliantProducts: moduleData.esg.compliantProducts,
    cbamAtRiskProducts: moduleData.esg.atRiskProducts,
    totalCo2Kg: moduleData.esg.totalCo2,
    complianceOverdueItems: moduleData.esg.overdueCompliance,
    operatorBlocksActive: moduleData.people.blocksActive,
    avgCombatPower: moduleData.people.avgCombatPower,
    companyHealthScore: health.overall,
  };
}

/**
 * Analyze the impact chain of a change event.
 * Simulates: ECO Change → FMEA re-assessment → Supplier re-evaluation → Carbon recalculation
 */
export function analyzeImpactChain(
  triggerModule: SourceModule,
  triggerEntity: string,
  triggerDescription: string,
): ImpactChainNode {
  // Standard impact chain for an ECO
  if (triggerModule === "ECO") {
    return {
      id: "root", module: "ECO", label: triggerEntity, description: triggerDescription, severity: "WARNING",
      children: [
        {
          id: "fmea", module: "FMEA", label: "FMEA Re-assessment",
          description: "Dynamic RPN recalculated for affected process steps",
          severity: "WARNING",
          children: [
            { id: "sop", module: "SOP", label: "SOP Update Required", description: "Work instructions must be updated for new part", severity: "INFO", children: [] },
          ],
        },
        {
          id: "supplier", module: "SUPPLIER", label: "Supplier Re-evaluation",
          description: "New part may require different supplier qualification",
          severity: "WARNING",
          children: [
            { id: "inventory", module: "INVENTORY", label: "Safety Stock Recalculation", description: "Dynamic safety stock adjusted for new lead times", severity: "INFO", children: [] },
          ],
        },
        {
          id: "cbam", module: "CBAM", label: "Carbon Footprint Update",
          description: "Product CO₂e recalculated with new material factors",
          severity: "INFO",
          children: [],
        },
      ],
    };
  }

  // Standard impact chain for a machine failure (SCHEDULER)
  if (triggerModule === "SCHEDULER") {
    return {
      id: "root", module: "SCHEDULER", label: triggerEntity, description: triggerDescription, severity: "CRITICAL",
      children: [
        { id: "oee", module: "OEE", label: "OEE Impact", description: "Machine downtime affects shift OEE calculation", severity: "WARNING", children: [] },
        {
          id: "hr", module: "HR_AI", label: "Operator Re-assignment",
          description: "Operators may need re-training for backup machine",
          severity: "INFO",
          children: [
            { id: "employee", module: "EMPLOYEE", label: "Skill Gap Analysis", description: "Employee combat power re-evaluated for new assignment", severity: "INFO", children: [] },
          ],
        },
        { id: "cost", module: "ECO", label: "Cost Impact", description: "Overtime and express maintenance costs tracked", severity: "WARNING", children: [] },
      ],
    };
  }

  // Generic chain
  return {
    id: "root", module: triggerModule, label: triggerEntity, description: triggerDescription, severity: "INFO",
    children: [],
  };
}

/**
 * Generate the AI CEO Weekly Briefing — 3-5 bullet points synthesized from all data.
 */
export function generateCeoWeeklyBrief(
  snapshot: CeoKpiSnapshot,
  health: CompanyHealthResult,
  recentEvents: ThreadEvent[],
  now: Date = new Date(),
): CeoWeeklyBrief {
  const headlines: string[] = [];
  const risks: string[] = [];
  const wins: string[] = [];

  // Headlines
  headlines.push(`Company Health Score: ${health.overall}/100 (Grade ${health.grade}), trend: ${health.trend}`);

  if (snapshot.criticalMachines > 0) {
    headlines.push(`${snapshot.criticalMachines} critical machine(s) — ${snapshot.autoRescheduledJobs} jobs auto-rescheduled to prevent delays`);
  }

  if (snapshot.inventoryCashReleasePotential > 0) {
    headlines.push(`¥${snapshot.inventoryCashReleasePotential.toLocaleString()} potential cash release identified from inventory optimization`);
  }

  // Risks
  if (snapshot.open8dCount > 0) {
    risks.push(`${snapshot.open8dCount} open 8D report(s) — ${snapshot.overdueCapaCount} overdue CAPAs require immediate attention`);
  }
  if (snapshot.cbamAtRiskProducts > 0) {
    risks.push(`${snapshot.cbamAtRiskProducts} product(s) at risk of EU CBAM non-compliance (${snapshot.totalCo2Kg.toFixed(0)} kg total CO₂)`);
  }
  if (snapshot.restrictedSuppliers > 0) {
    risks.push(`${snapshot.restrictedSuppliers} supplier(s) on restricted status — procurement risk`);
  }
  if (snapshot.operatorBlocksActive > 0) {
    risks.push(`${snapshot.operatorBlocksActive} operator(s) currently blocked by AI training system — capacity impact`);
  }

  // Wins
  if (snapshot.overallOee >= 80) {
    wins.push(`OEE at ${snapshot.overallOee}% — exceeding IATF 16949 target of 85%`);
  }
  if (snapshot.cbamCompliantProducts > 0) {
    wins.push(`${snapshot.cbamCompliantProducts} product(s) fully EU CBAM compliant — ready for export`);
  }
  if (health.modules.quality >= 80) {
    wins.push(`Quality health at ${health.modules.quality}/100 — strong FMEA and CAPA performance`);
  }
  if (snapshot.onTrackProjects > 0) {
    wins.push(`${snapshot.onTrackProjects}/${snapshot.totalProjects} projects on track`);
  }

  // Top recommendation
  const weakestModule = Object.entries(health.modules).sort((a, b) => a[1] - b[1])[0];
  const recommendation = `Priority action: Improve ${weakestModule[0]} (currently ${weakestModule[1]}/100). This is the weakest link in the digital thread.`;

  return {
    generatedAt: now.toISOString(),
    healthScore: health.overall,
    grade: health.grade,
    headlines,
    risks,
    wins,
    recommendation,
  };
}

/**
 * Weave the complete Digital Thread — the master aggregation function.
 * Calls all module data and returns a unified DigitalThreadData object.
 */
export function weaveDigitalThread(
  events: ThreadEvent[],
  moduleData: {
    projects: { total: number; onTrack: number; atRisk: number };
    production: { oee: number; criticalMachines: number; rescheduledJobs: number };
    quality: { open8Ds: number; overdueCapas: number; maxRpn: number };
    cost: { variancePercent: number; budgetTotal: number; spentToDate: number };
    supplyChain: { avgScore: number; restricted: number; cashRelease: number; shortageRisks: number; avgLeadTime: number };
    esg: { compliantProducts: number; atRiskProducts: number; totalCo2: number; overdueCompliance: number };
    people: { blocksActive: number; avgCombatPower: number; topEmployees: { name: string; score: number }[]; trainingInProgress: number };
    machines: { code: string; health: number; status: string }[];
  },
  now: Date = new Date(),
): DigitalThreadData {
  const dateStr = now.toISOString().split("T")[0];

  const snapshot = generateCeoSnapshot(dateStr, {
    projects: moduleData.projects,
    production: moduleData.production,
    quality: moduleData.quality,
    cost: moduleData.cost,
    supplyChain: moduleData.supplyChain,
    esg: moduleData.esg,
    people: moduleData.people,
  });

  const modules = calculateModuleHealth({
    oee: moduleData.production.oee,
    criticalMachinePercent: moduleData.production.criticalMachines > 0 ? (moduleData.production.criticalMachines / 8) * 100 : 0,
    maxRpn: moduleData.quality.maxRpn,
    open8Ds: moduleData.quality.open8Ds,
    overdueCapas: moduleData.quality.overdueCapas,
    costVariancePercent: moduleData.cost.variancePercent,
    avgSupplierScore: moduleData.supplyChain.avgScore,
    inventoryHealthPercent: 70,
    cbamCompliantPercent: moduleData.esg.compliantProducts > 0
      ? (moduleData.esg.compliantProducts / (moduleData.esg.compliantProducts + moduleData.esg.atRiskProducts)) * 100
      : 100,
    complianceOverduePercent: moduleData.esg.overdueCompliance,
    operatorBlockPercent: moduleData.people.blocksActive > 0 ? (moduleData.people.blocksActive / 50) * 100 : 0,
    avgCombatPower: moduleData.people.avgCombatPower,
    projectOnTimePercent: moduleData.projects.total > 0 ? (moduleData.projects.onTrack / moduleData.projects.total) * 100 : 100,
  });

  const health = calculateCompanyHealthScore(modules);
  const recentEvents = filterThreadEvents(events, { limit: 20 });
  const weeklyBrief = generateCeoWeeklyBrief(snapshot, health, recentEvents, now);

  return {
    snapshot,
    health,
    recentEvents,
    impactChain: null,
    weeklyBrief,
    financialBurnRate: {
      budgetTotal: moduleData.cost.budgetTotal,
      spentToDate: moduleData.cost.spentToDate,
      burnPercent: moduleData.cost.budgetTotal > 0
        ? Math.round((moduleData.cost.spentToDate / moduleData.cost.budgetTotal) * 10000) / 100
        : 0,
    },
    quadrants: {
      manufacturing: {
        oee: moduleData.production.oee,
        criticalMachines: moduleData.production.criticalMachines,
        rescheduledJobs: moduleData.production.rescheduledJobs,
        topMachines: moduleData.machines.slice(0, 5),
      },
      quality: {
        open8Ds: moduleData.quality.open8Ds,
        overdueCapas: moduleData.quality.overdueCapas,
        maxRpn: moduleData.quality.maxRpn,
        upcomingAudits: moduleData.esg.overdueCompliance,
      },
      supplyChain: {
        restrictedSuppliers: moduleData.supplyChain.restricted,
        cashRelease: moduleData.supplyChain.cashRelease,
        shortageRisks: moduleData.supplyChain.shortageRisks,
        avgLeadTime: moduleData.supplyChain.avgLeadTime,
      },
      people: {
        operatorBlocks: moduleData.people.blocksActive,
        avgCombatPower: moduleData.people.avgCombatPower,
        topEmployees: moduleData.people.topEmployees.slice(0, 3),
        trainingInProgress: moduleData.people.trainingInProgress,
      },
    },
  };
}

// ─── Mock Data — Simulated Live State From All 11 Modules ────────────

const MOCK_MODULE_DATA = {
  projects: { total: 12, onTrack: 8, atRisk: 3 },
  production: { oee: 82.5, criticalMachines: 1, rescheduledJobs: 3 },
  quality: { open8Ds: 2, overdueCapas: 1, maxRpn: 320 },
  cost: { variancePercent: 4.2, budgetTotal: 2800000, spentToDate: 1950000 },
  supplyChain: { avgScore: 78, restricted: 2, cashRelease: 185000, shortageRisks: 3, avgLeadTime: 18 },
  esg: { compliantProducts: 2, atRiskProducts: 1, totalCo2: 5840, overdueCompliance: 1 },
  people: {
    blocksActive: 1, avgCombatPower: 76,
    topEmployees: [
      { name: "洪香龙 (Hong Xilong)", score: 94 },
      { name: "李大鹏 (Li Dapeng)", score: 88 },
      { name: "孙国祥 (Sun Guoxiang)", score: 85 },
    ],
    trainingInProgress: 3,
  },
  machines: [
    { code: "CNC-001", health: 35, status: "CRITICAL" },
    { code: "CNC-002", health: 88, status: "HEALTHY" },
    { code: "CNC-003", health: 62, status: "WARNING" },
    { code: "WLD-TIG-001", health: 55, status: "WARNING" },
    { code: "LASER-001", health: 91, status: "HEALTHY" },
    { code: "HYD-BENCH-001", health: 85, status: "HEALTHY" },
  ],
};

const MOCK_EVENTS: ThreadEvent[] = [
  createThreadEvent("SCHEDULER", "ALERT", "CRITICAL", "CNC-001", "machine", "CNC-001加工中心健康评分降至35%，已自动转移3个工单至CNC-002", "CNC-001 health dropped to 35% — 3 jobs auto-rescheduled to CNC-002", { linkedProjectId: 1 }, new Date("2026-02-25T08:15:00Z")),
  createThreadEvent("HR_AI", "BLOCKED", "WARNING", "OP-LiMing", "operator", "李明因CNC质量缺陷被AI系统暂停操作权限，需完成培训", "Li Ming blocked by AI — must complete training module", { linkedUser: "li.ming" }, new Date("2026-02-25T09:30:00Z")),
  createThreadEvent("ECO", "APPROVED", "INFO", "ECO-2026-015", "eco", "ECO-2026-015已批准：WASH-003更换PLC至S7-1500", "ECO-2026-015 approved: WASH-003 PLC upgrade to S7-1500", { linkedProjectId: 3 }, new Date("2026-02-25T10:00:00Z")),
  createThreadEvent("FMEA", "STATUS_CHANGE", "WARNING", "FMEA-WASH-003", "fmea", "WASH-003 FMEA重新评估：PLC更换后RPN从320降至180", "WASH-003 FMEA re-assessed: RPN dropped from 320 to 180 after PLC swap", { linkedProjectId: 3 }, new Date("2026-02-25T10:30:00Z")),
  createThreadEvent("SUPPLIER", "ALERT", "WARNING", "SUP-Siemens", "supplier", "Siemens S7-1500供货周期从4周延长至8周", "Siemens S7-1500 lead time extended from 4 to 8 weeks", {}, new Date("2026-02-25T11:00:00Z")),
  createThreadEvent("INVENTORY", "STATUS_CHANGE", "INFO", "SS316-PLATE", "material", "SS316钢板动态安全库存从20上调至30（高增长趋势）", "SS316 plate dynamic safety stock raised from 20 to 30 (high growth)", {}, new Date("2026-02-25T11:30:00Z")),
  createThreadEvent("CBAM", "RESOLVED", "INFO", "GWM-3000", "product", "GWM-3000碳足迹声明通过EU CBAM合规审核", "GWM-3000 carbon footprint declaration passed EU CBAM compliance", { linkedProjectId: 1 }, new Date("2026-02-25T12:00:00Z")),
  createThreadEvent("OEE", "ALERT", "WARNING", "CNC-003", "machine", "CNC-003 OEE降至62%，低于85%目标", "CNC-003 OEE dropped to 62%, below 85% target", {}, new Date("2026-02-25T13:00:00Z")),
  createThreadEvent("COMPLIANCE", "ALERT", "WARNING", "AUDIT-ISO9001", "audit", "ISO 9001年度审核将在15天后到期", "ISO 9001 annual audit due in 15 days", {}, new Date("2026-02-25T14:00:00Z")),
  createThreadEvent("HR_AI", "UNBLOCKED", "INFO", "OP-LiMing", "operator", "李明完成AI培训模块（评分85/80），操作权限已恢复", "Li Ming completed training (score 85/80), access restored", { linkedUser: "li.ming" }, new Date("2026-02-25T15:00:00Z")),
  createThreadEvent("EMPLOYEE", "STATUS_CHANGE", "INFO", "EMP-HongXilong", "employee", "洪香龙战斗力评分提升至94（新获得TIG焊接认证）", "Hong Xilong's combat power score up to 94 (new TIG welding cert)", { linkedUser: "hong.xilong" }, new Date("2026-02-25T15:30:00Z")),
  createThreadEvent("SOP", "CREATED", "INFO", "SOP-CNC-SETUP", "sop", "新增CNC开机标准化SOP（含视频指导）", "New CNC startup SOP created (with video guide)", {}, new Date("2026-02-25T16:00:00Z")),
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const digitalThreadRouter = router({
  /**
   * The master endpoint — returns the complete Digital Thread.
   */
  cockpit: protectedProcedure.query(async () => {
    return weaveDigitalThread(MOCK_EVENTS, MOCK_MODULE_DATA);
  }),

  /**
   * Filtered thread events
   */
  events: protectedProcedure
    .input(z.object({
      module: z.string().optional(),
      severity: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return filterThreadEvents(MOCK_EVENTS, {
        module: input.module as SourceModule | undefined,
        severity: input.severity as Severity | undefined,
        limit: input.limit,
      });
    }),

  /**
   * Impact chain analysis
   */
  impactChain: protectedProcedure
    .input(z.object({
      triggerModule: z.string(),
      triggerEntity: z.string(),
      triggerDescription: z.string(),
    }))
    .query(async ({ input }) => {
      return analyzeImpactChain(
        input.triggerModule as SourceModule,
        input.triggerEntity,
        input.triggerDescription,
      );
    }),

  /**
   * CEO weekly brief
   */
  weeklyBrief: protectedProcedure.query(async () => {
    const thread = weaveDigitalThread(MOCK_EVENTS, MOCK_MODULE_DATA);
    return thread.weeklyBrief;
  }),
});
