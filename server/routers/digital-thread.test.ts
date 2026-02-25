/**
 * Digital Thread — Capstone Automated Test Suite
 * Phase 4 — Ultimate Digital Thread & Executive Cockpit
 *
 * THE FINAL TEST SUITE. Proves that ALL 11 modules are woven
 * into a single, unified digital thread.
 *
 * Proves:
 *   1. createThreadEvent: events from any module with correct structure
 *   2. filterThreadEvents: filter by module, severity, time, limit
 *   3. calculateModuleHealth: individual module health scores
 *   4. calculateCompanyHealthScore: weighted composite 0-100
 *   5. generateCeoSnapshot: daily KPI aggregation across all modules
 *   6. analyzeImpactChain: ECO → FMEA → Supplier → Carbon chain
 *   7. generateCeoWeeklyBrief: AI-synthesized bullet points
 *   8. weaveDigitalThread: THE MASTER AGGREGATION
 *   9. Ultimate Integration: Full lifecycle event chain
 *  10. Edge cases: empty data, all-perfect, all-critical
 *
 * Run: pnpm test -- server/routers/digital-thread.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  createThreadEvent,
  filterThreadEvents,
  calculateModuleHealth,
  calculateCompanyHealthScore,
  generateCeoSnapshot,
  analyzeImpactChain,
  generateCeoWeeklyBrief,
  weaveDigitalThread,
  type ThreadEvent,
  type SourceModule,
  type ModuleHealth,
} from "./digital-thread.router";

// ─── Test Helpers ─────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T12:00:00Z");

function makeEvent(module: SourceModule, severity: "INFO" | "WARNING" | "CRITICAL", ts: string): ThreadEvent {
  return createThreadEvent(module, "ALERT", severity, `${module}-001`, module.toLowerCase(), `${module}测试事件`, `${module} test event`, {}, new Date(ts));
}

const HEALTHY_MODULE_DATA = {
  oee: 88, criticalMachinePercent: 0, maxRpn: 150, open8Ds: 0, overdueCapas: 0,
  costVariancePercent: 2, avgSupplierScore: 85, inventoryHealthPercent: 80,
  cbamCompliantPercent: 100, complianceOverduePercent: 0, operatorBlockPercent: 0,
  avgCombatPower: 82, projectOnTimePercent: 90,
};

const MOCK_MODULE_DATA = {
  projects: { total: 12, onTrack: 8, atRisk: 3 },
  production: { oee: 82.5, criticalMachines: 1, rescheduledJobs: 3 },
  quality: { open8Ds: 2, overdueCapas: 1, maxRpn: 320 },
  cost: { variancePercent: 4.2, budgetTotal: 2800000, spentToDate: 1950000 },
  supplyChain: { avgScore: 78, restricted: 2, cashRelease: 185000, shortageRisks: 3, avgLeadTime: 18 },
  esg: { compliantProducts: 2, atRiskProducts: 1, totalCo2: 5840, overdueCompliance: 1 },
  people: {
    blocksActive: 1, avgCombatPower: 76,
    topEmployees: [{ name: "Wang", score: 94 }, { name: "Li Ming", score: 88 }],
    trainingInProgress: 3,
  },
  machines: [
    { code: "CNC-001", health: 35, status: "CRITICAL" },
    { code: "CNC-002", health: 88, status: "HEALTHY" },
  ],
};

// ─── 1. createThreadEvent ─────────────────────────────────────────────

describe("createThreadEvent", () => {
  it("should create an event with correct source module", () => {
    const event = createThreadEvent("SCHEDULER", "ALERT", "CRITICAL", "CNC-001", "machine", "机器告警", "Machine alert", {}, NOW);
    expect(event.sourceModule).toBe("SCHEDULER");
    expect(event.severity).toBe("CRITICAL");
    expect(event.entityId).toBe("CNC-001");
  });

  it("should generate unique event IDs", () => {
    const e1 = createThreadEvent("OEE", "CREATED", "INFO", "M1", "machine", "测试1", "Test 1", {}, NOW);
    const e2 = createThreadEvent("OEE", "CREATED", "INFO", "M2", "machine", "测试2", "Test 2", {}, NOW);
    expect(e1.eventId).not.toBe(e2.eventId);
  });

  it("should include both Chinese and English summaries", () => {
    const event = createThreadEvent("FMEA", "STATUS_CHANGE", "WARNING", "FMEA-001", "fmea", "RPN更新", "RPN Updated", {}, NOW);
    expect(event.summaryZh).toBe("RPN更新");
    expect(event.summaryEn).toBe("RPN Updated");
  });

  it("should include optional metadata", () => {
    const event = createThreadEvent("ECO", "APPROVED", "INFO", "ECO-001", "eco", "ECO批准", "ECO Approved", { linkedProjectId: 5, linkedUser: "admin", metadata: { partNumber: "SS316" } }, NOW);
    expect(event.linkedProjectId).toBe(5);
    expect(event.linkedUser).toBe("admin");
    expect(event.metadata?.partNumber).toBe("SS316");
  });

  it("should create events from all 11 modules", () => {
    const modules: SourceModule[] = ["SOP", "OEE", "COMPLIANCE", "ECO", "SUPPLIER", "EMPLOYEE", "FMEA", "HR_AI", "SCHEDULER", "INVENTORY", "CBAM"];
    const events = modules.map(m => createThreadEvent(m, "CREATED", "INFO", `${m}-001`, m.toLowerCase(), "测试", "Test", {}, NOW));
    expect(events.length).toBe(11);
    const uniqueModules = new Set(events.map(e => e.sourceModule));
    expect(uniqueModules.size).toBe(11);
  });
});

// ─── 2. filterThreadEvents ────────────────────────────────────────────

describe("filterThreadEvents", () => {
  const events: ThreadEvent[] = [
    makeEvent("SCHEDULER", "CRITICAL", "2026-02-25T08:00:00Z"),
    makeEvent("FMEA", "WARNING", "2026-02-25T09:00:00Z"),
    makeEvent("ECO", "INFO", "2026-02-25T10:00:00Z"),
    makeEvent("CBAM", "INFO", "2026-02-25T11:00:00Z"),
    makeEvent("SCHEDULER", "WARNING", "2026-02-25T12:00:00Z"),
  ];

  it("should return all events when no filters", () => {
    const result = filterThreadEvents(events);
    expect(result.length).toBe(5);
  });

  it("should filter by module", () => {
    const result = filterThreadEvents(events, { module: "SCHEDULER" });
    expect(result.length).toBe(2);
    expect(result.every(e => e.sourceModule === "SCHEDULER")).toBe(true);
  });

  it("should filter by severity", () => {
    const result = filterThreadEvents(events, { severity: "CRITICAL" });
    expect(result.length).toBe(1);
    expect(result[0].sourceModule).toBe("SCHEDULER");
  });

  it("should filter by time range", () => {
    const result = filterThreadEvents(events, { since: "2026-02-25T10:00:00Z" });
    expect(result.length).toBe(3);
  });

  it("should limit results", () => {
    const result = filterThreadEvents(events, { limit: 2 });
    expect(result.length).toBe(2);
  });

  it("should return newest first", () => {
    const result = filterThreadEvents(events);
    expect(new Date(result[0].timestamp).getTime()).toBeGreaterThan(new Date(result[1].timestamp).getTime());
  });

  it("should combine multiple filters", () => {
    const result = filterThreadEvents(events, { module: "SCHEDULER", severity: "CRITICAL" });
    expect(result.length).toBe(1);
  });
});

// ─── 3. calculateModuleHealth ─────────────────────────────────────────

describe("calculateModuleHealth", () => {
  it("should return all 7 module scores between 0-100", () => {
    const health = calculateModuleHealth(HEALTHY_MODULE_DATA);
    expect(health.production).toBeGreaterThanOrEqual(0);
    expect(health.production).toBeLessThanOrEqual(100);
    expect(health.quality).toBeGreaterThanOrEqual(0);
    expect(health.quality).toBeLessThanOrEqual(100);
    expect(health.cost).toBeGreaterThanOrEqual(0);
    expect(health.cost).toBeLessThanOrEqual(100);
    expect(health.supplyChain).toBeGreaterThanOrEqual(0);
    expect(health.supplyChain).toBeLessThanOrEqual(100);
    expect(health.esg).toBeGreaterThanOrEqual(0);
    expect(health.esg).toBeLessThanOrEqual(100);
    expect(health.people).toBeGreaterThanOrEqual(0);
    expect(health.people).toBeLessThanOrEqual(100);
    expect(health.schedule).toBeGreaterThanOrEqual(0);
    expect(health.schedule).toBeLessThanOrEqual(100);
  });

  it("should give high production score when OEE is high and no critical machines", () => {
    const health = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, oee: 95, criticalMachinePercent: 0 });
    expect(health.production).toBeGreaterThan(80);
  });

  it("should penalize production for critical machines", () => {
    const healthy = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, criticalMachinePercent: 0 });
    const critical = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, criticalMachinePercent: 25 });
    expect(critical.production).toBeLessThan(healthy.production);
  });

  it("should penalize quality for high RPN", () => {
    const lowRpn = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, maxRpn: 100 });
    const highRpn = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, maxRpn: 800 });
    expect(highRpn.quality).toBeLessThan(lowRpn.quality);
  });

  it("should penalize quality for open 8Ds and overdue CAPAs", () => {
    const clean = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, open8Ds: 0, overdueCapas: 0 });
    const dirty = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, open8Ds: 5, overdueCapas: 2 });
    expect(dirty.quality).toBeLessThan(clean.quality);
  });

  it("should penalize cost for high variance", () => {
    const onBudget = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, costVariancePercent: 0 });
    const overBudget = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, costVariancePercent: 15 });
    expect(overBudget.cost).toBeLessThan(onBudget.cost);
  });

  it("should calculate supply chain from supplier score and inventory health", () => {
    const health = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, avgSupplierScore: 80, inventoryHealthPercent: 60 });
    // 80 * 0.5 + 60 * 0.5 = 70
    expect(health.supplyChain).toBe(70);
  });

  it("should give high schedule score when projects are on time", () => {
    const health = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, projectOnTimePercent: 100 });
    expect(health.schedule).toBe(100);
  });
});

// ─── 4. calculateCompanyHealthScore — THE WEIGHTED FORMULA ─────────────

describe("calculateCompanyHealthScore", () => {
  it("should return score between 0-100", () => {
    const modules: ModuleHealth = { production: 80, quality: 85, cost: 70, supplyChain: 75, esg: 90, people: 80, schedule: 85 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("should apply correct weights (Prod 25%, Qual 20%, Cost 15%, SC 15%, ESG 10%, People 10%, Sched 5%)", () => {
    const modules: ModuleHealth = { production: 100, quality: 100, cost: 100, supplyChain: 100, esg: 100, people: 100, schedule: 100 };
    const result = calculateCompanyHealthScore(modules);
    // 100 * (0.25 + 0.20 + 0.15 + 0.15 + 0.10 + 0.10 + 0.05) = 100
    expect(result.overall).toBe(100);
  });

  it("should weigh production higher than schedule", () => {
    // Only production is high
    const prodHigh: ModuleHealth = { production: 100, quality: 50, cost: 50, supplyChain: 50, esg: 50, people: 50, schedule: 0 };
    // Only schedule is high
    const schedHigh: ModuleHealth = { production: 0, quality: 50, cost: 50, supplyChain: 50, esg: 50, people: 50, schedule: 100 };
    const rProd = calculateCompanyHealthScore(prodHigh);
    const rSched = calculateCompanyHealthScore(schedHigh);
    expect(rProd.overall).toBeGreaterThan(rSched.overall);
  });

  it("should grade A for 90+", () => {
    const result = calculateCompanyHealthScore({ production: 95, quality: 95, cost: 90, supplyChain: 90, esg: 90, people: 90, schedule: 90 });
    expect(result.grade).toBe("A");
  });

  it("should grade B for 75-89", () => {
    const result = calculateCompanyHealthScore({ production: 80, quality: 80, cost: 80, supplyChain: 75, esg: 75, people: 75, schedule: 75 });
    expect(result.grade).toBe("B");
  });

  it("should grade C for 60-74", () => {
    const result = calculateCompanyHealthScore({ production: 65, quality: 65, cost: 65, supplyChain: 65, esg: 65, people: 65, schedule: 65 });
    expect(result.grade).toBe("C");
  });

  it("should grade D for 40-59", () => {
    const result = calculateCompanyHealthScore({ production: 50, quality: 50, cost: 50, supplyChain: 50, esg: 50, people: 50, schedule: 50 });
    expect(result.grade).toBe("D");
  });

  it("should grade F for below 40", () => {
    const result = calculateCompanyHealthScore({ production: 20, quality: 20, cost: 30, supplyChain: 30, esg: 30, people: 30, schedule: 30 });
    expect(result.grade).toBe("F");
  });

  it("CEO Scenario: strong production+quality but weak supply chain", () => {
    const modules: ModuleHealth = { production: 92, quality: 88, cost: 75, supplyChain: 40, esg: 80, people: 85, schedule: 80 };
    const result = calculateCompanyHealthScore(modules);
    // 92*0.25 + 88*0.20 + 75*0.15 + 40*0.15 + 80*0.10 + 85*0.10 + 80*0.05
    // = 23 + 17.6 + 11.25 + 6 + 8 + 8.5 + 4 = 78.35 → 78
    expect(result.overall).toBe(78);
    expect(result.grade).toBe("B");
    // Supply chain is the clear weak link
    expect(result.modules.supplyChain).toBe(40);
  });
});

// ─── 5. generateCeoSnapshot ──────────────────────────────────────────

describe("generateCeoSnapshot", () => {
  it("should return snapshot with all fields populated", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 10, onTrack: 7, atRisk: 2 },
      production: { oee: 85, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 1, overdueCapas: 0, maxRpn: 200 },
      cost: { variancePercent: 3 },
      supplyChain: { avgScore: 80, restricted: 1, cashRelease: 50000 },
      esg: { compliantProducts: 3, atRiskProducts: 0, totalCo2: 4000, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 80 },
    });

    expect(snapshot.snapshotDate).toBe("2026-02-25");
    expect(snapshot.totalProjects).toBe(10);
    expect(snapshot.overallOee).toBe(85);
    expect(snapshot.open8dCount).toBe(1);
    expect(snapshot.cbamCompliantProducts).toBe(3);
    expect(snapshot.companyHealthScore).toBeGreaterThan(0);
  });

  it("should aggregate data from all module domains", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 12, onTrack: 8, atRisk: 3 },
      production: { oee: 82.5, criticalMachines: 1, rescheduledJobs: 3 },
      quality: { open8Ds: 2, overdueCapas: 1, maxRpn: 320 },
      cost: { variancePercent: 4.2 },
      supplyChain: { avgScore: 78, restricted: 2, cashRelease: 185000 },
      esg: { compliantProducts: 2, atRiskProducts: 1, totalCo2: 5840, overdueCompliance: 1 },
      people: { blocksActive: 1, avgCombatPower: 76 },
    });

    // Verify cross-domain aggregation
    expect(snapshot.onTrackProjects).toBe(8);          // from Projects
    expect(snapshot.overallOee).toBe(82.5);             // from OEE
    expect(snapshot.autoRescheduledJobs).toBe(3);       // from Scheduler
    expect(snapshot.overdueCapaCount).toBe(1);          // from FMEA/8D
    expect(snapshot.avgSupplierScore).toBe(78);         // from Supplier Risk
    expect(snapshot.cbamAtRiskProducts).toBe(1);        // from CBAM
    expect(snapshot.operatorBlocksActive).toBe(1);      // from HR AI
    expect(snapshot.inventoryCashReleasePotential).toBe(185000); // from Inventory
  });

  it("should calculate company health score in the snapshot", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 10, onTrack: 10, atRisk: 0 },
      production: { oee: 95, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 0, overdueCapas: 0, maxRpn: 100 },
      cost: { variancePercent: 0 },
      supplyChain: { avgScore: 90, restricted: 0, cashRelease: 0 },
      esg: { compliantProducts: 3, atRiskProducts: 0, totalCo2: 3000, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 90 },
    });
    expect(snapshot.companyHealthScore).toBeGreaterThan(80);
  });
});

// ─── 6. analyzeImpactChain ───────────────────────────────────────────

describe("analyzeImpactChain", () => {
  it("should generate ECO impact chain with FMEA, Supplier, and CBAM branches", () => {
    const chain = analyzeImpactChain("ECO", "ECO-2026-015", "PLC upgrade for WASH-003");
    expect(chain.module).toBe("ECO");
    expect(chain.children.length).toBe(3);

    const childModules = chain.children.map(c => c.module);
    expect(childModules).toContain("FMEA");
    expect(childModules).toContain("SUPPLIER");
    expect(childModules).toContain("CBAM");
  });

  it("ECO chain should have SOP update under FMEA", () => {
    const chain = analyzeImpactChain("ECO", "ECO-001", "Part change");
    const fmea = chain.children.find(c => c.module === "FMEA")!;
    expect(fmea.children.length).toBeGreaterThan(0);
    expect(fmea.children[0].module).toBe("SOP");
  });

  it("ECO chain should have Inventory under Supplier", () => {
    const chain = analyzeImpactChain("ECO", "ECO-001", "Part change");
    const supplier = chain.children.find(c => c.module === "SUPPLIER")!;
    expect(supplier.children.length).toBeGreaterThan(0);
    expect(supplier.children[0].module).toBe("INVENTORY");
  });

  it("should generate SCHEDULER impact chain with OEE and HR branches", () => {
    const chain = analyzeImpactChain("SCHEDULER", "CNC-001", "Machine failure");
    expect(chain.module).toBe("SCHEDULER");
    expect(chain.severity).toBe("CRITICAL");

    const childModules = chain.children.map(c => c.module);
    expect(childModules).toContain("OEE");
    expect(childModules).toContain("HR_AI");
  });

  it("should return simple chain for unknown module", () => {
    const chain = analyzeImpactChain("INVENTORY", "SS316", "Stock change");
    expect(chain.module).toBe("INVENTORY");
    expect(chain.children.length).toBe(0);
  });
});

// ─── 7. generateCeoWeeklyBrief ───────────────────────────────────────

describe("generateCeoWeeklyBrief", () => {
  it("should generate headlines with health score", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 10, onTrack: 8, atRisk: 2 },
      production: { oee: 85, criticalMachines: 1, rescheduledJobs: 3 },
      quality: { open8Ds: 2, overdueCapas: 1, maxRpn: 200 },
      cost: { variancePercent: 3 },
      supplyChain: { avgScore: 78, restricted: 1, cashRelease: 150000 },
      esg: { compliantProducts: 2, atRiskProducts: 1, totalCo2: 5000, overdueCompliance: 0 },
      people: { blocksActive: 1, avgCombatPower: 76 },
    });

    const modules = calculateModuleHealth(HEALTHY_MODULE_DATA);
    const health = calculateCompanyHealthScore(modules);
    const brief = generateCeoWeeklyBrief(snapshot, health, [], NOW);

    expect(brief.headlines.length).toBeGreaterThan(0);
    expect(brief.headlines[0]).toContain("Health Score");
    expect(brief.healthScore).toBeGreaterThan(0);
    expect(brief.grade).toBeTruthy();
  });

  it("should identify risks when 8Ds are open", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 10, onTrack: 8, atRisk: 2 },
      production: { oee: 85, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 3, overdueCapas: 2, maxRpn: 400 },
      cost: { variancePercent: 1 },
      supplyChain: { avgScore: 85, restricted: 0, cashRelease: 0 },
      esg: { compliantProducts: 3, atRiskProducts: 0, totalCo2: 4000, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 80 },
    });

    const modules = calculateModuleHealth(HEALTHY_MODULE_DATA);
    const health = calculateCompanyHealthScore(modules);
    const brief = generateCeoWeeklyBrief(snapshot, health, [], NOW);

    expect(brief.risks.some(r => r.includes("8D"))).toBe(true);
  });

  it("should report wins for high OEE", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 10, onTrack: 10, atRisk: 0 },
      production: { oee: 92, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 0, overdueCapas: 0, maxRpn: 100 },
      cost: { variancePercent: 0 },
      supplyChain: { avgScore: 90, restricted: 0, cashRelease: 0 },
      esg: { compliantProducts: 3, atRiskProducts: 0, totalCo2: 3000, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 85 },
    });

    const modules = calculateModuleHealth(HEALTHY_MODULE_DATA);
    const health = calculateCompanyHealthScore(modules);
    const brief = generateCeoWeeklyBrief(snapshot, health, [], NOW);

    expect(brief.wins.some(w => w.includes("OEE"))).toBe(true);
  });

  it("should provide a recommendation targeting the weakest module", () => {
    const modules = calculateModuleHealth({ ...HEALTHY_MODULE_DATA, avgSupplierScore: 30, inventoryHealthPercent: 30 });
    const health = calculateCompanyHealthScore(modules);
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 10, onTrack: 8, atRisk: 2 },
      production: { oee: 85, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 0, overdueCapas: 0, maxRpn: 100 },
      cost: { variancePercent: 1 },
      supplyChain: { avgScore: 30, restricted: 3, cashRelease: 0 },
      esg: { compliantProducts: 3, atRiskProducts: 0, totalCo2: 3000, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 80 },
    });

    const brief = generateCeoWeeklyBrief(snapshot, health, [], NOW);
    expect(brief.recommendation).toContain("supplyChain");
  });
});

// ─── 8. weaveDigitalThread — THE MASTER AGGREGATION ────────────────────

describe("weaveDigitalThread", () => {
  const events: ThreadEvent[] = [
    makeEvent("SCHEDULER", "CRITICAL", "2026-02-25T08:00:00Z"),
    makeEvent("ECO", "INFO", "2026-02-25T09:00:00Z"),
    makeEvent("CBAM", "INFO", "2026-02-25T10:00:00Z"),
  ];

  it("should return complete DigitalThreadData structure", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    expect(thread.snapshot).toBeDefined();
    expect(thread.health).toBeDefined();
    expect(thread.recentEvents).toBeDefined();
    expect(thread.weeklyBrief).toBeDefined();
    expect(thread.financialBurnRate).toBeDefined();
    expect(thread.quadrants).toBeDefined();
  });

  it("should populate all 4 quadrants", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    expect(thread.quadrants.manufacturing.oee).toBe(82.5);
    expect(thread.quadrants.quality.open8Ds).toBe(2);
    expect(thread.quadrants.supplyChain.restrictedSuppliers).toBe(2);
    expect(thread.quadrants.people.operatorBlocks).toBe(1);
  });

  it("should calculate financial burn rate", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    expect(thread.financialBurnRate.budgetTotal).toBe(2800000);
    expect(thread.financialBurnRate.spentToDate).toBe(1950000);
    expect(thread.financialBurnRate.burnPercent).toBeCloseTo(69.64, 1);
  });

  it("should include recent events sorted newest first", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    expect(thread.recentEvents.length).toBe(3);
    expect(thread.recentEvents[0].sourceModule).toBe("CBAM"); // newest
  });

  it("should merge data from at least 3 distinct domains", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    // Verify cross-domain presence
    expect(thread.snapshot.overallOee).toBeGreaterThan(0);          // Production domain
    expect(thread.snapshot.open8dCount).toBeGreaterThan(0);          // Quality domain
    expect(thread.snapshot.avgSupplierScore).toBeGreaterThan(0);     // Supply Chain domain
    expect(thread.snapshot.cbamCompliantProducts).toBeGreaterThan(0); // ESG domain
    expect(thread.snapshot.operatorBlocksActive).toBeGreaterThan(0); // People domain
  });

  it("should include top machines in manufacturing quadrant", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    expect(thread.quadrants.manufacturing.topMachines.length).toBeGreaterThan(0);
    expect(thread.quadrants.manufacturing.topMachines[0].code).toBe("CNC-001");
  });

  it("should include top employees in people quadrant", () => {
    const thread = weaveDigitalThread(events, MOCK_MODULE_DATA, NOW);
    expect(thread.quadrants.people.topEmployees.length).toBeGreaterThan(0);
    expect(thread.quadrants.people.topEmployees[0].name).toBe("Wang");
  });
});

// ─── 9. ULTIMATE INTEGRATION — Full Lifecycle Event Chain ─────────────

describe("Ultimate Integration — ECO Lifecycle Chain", () => {
  it("should trace a complete ECO → FMEA → Supplier → Carbon → Thread → Snapshot chain", () => {
    const events: ThreadEvent[] = [];

    // Step 1: ECO approved — PLC upgrade for WASH-003
    events.push(createThreadEvent("ECO", "APPROVED", "INFO", "ECO-2026-015", "eco",
      "ECO-2026-015批准：WASH-003 PLC升级至S7-1500", "ECO-2026-015 approved: PLC upgrade to S7-1500",
      { linkedProjectId: 3 }, new Date("2026-02-25T10:00:00Z")));

    // Step 2: FMEA re-assessed — RPN drops
    events.push(createThreadEvent("FMEA", "STATUS_CHANGE", "WARNING", "FMEA-WASH-003", "fmea",
      "WASH-003 FMEA RPN从320降至180（PLC可靠性提升）", "WASH-003 FMEA RPN dropped 320→180 (PLC reliability improved)",
      { linkedProjectId: 3 }, new Date("2026-02-25T10:30:00Z")));

    // Step 3: Supplier re-evaluated — Siemens lead time concern
    events.push(createThreadEvent("SUPPLIER", "ALERT", "WARNING", "SUP-Siemens", "supplier",
      "Siemens S7-1500供货周期延长至8周，需评估备选", "Siemens S7-1500 lead time extended to 8 weeks — evaluate alternatives",
      {}, new Date("2026-02-25T11:00:00Z")));

    // Step 4: Carbon footprint updated — new PLC has lower embodied carbon
    events.push(createThreadEvent("CBAM", "STATUS_CHANGE", "INFO", "WASH-003", "product",
      "WASH-003碳足迹更新：新PLC降低产品总CO₂e 15kg", "WASH-003 carbon update: new PLC reduces total CO₂e by 15kg",
      { linkedProjectId: 3 }, new Date("2026-02-25T11:30:00Z")));

    // Verify: all 4 events appear in the thread
    expect(events.length).toBe(4);
    const modules = new Set(events.map(e => e.sourceModule));
    expect(modules.size).toBe(4);
    expect(modules.has("ECO")).toBe(true);
    expect(modules.has("FMEA")).toBe(true);
    expect(modules.has("SUPPLIER")).toBe(true);
    expect(modules.has("CBAM")).toBe(true);

    // Verify: filtering works across the chain
    const criticalEvents = filterThreadEvents(events, { severity: "WARNING" });
    expect(criticalEvents.length).toBe(2); // FMEA + SUPPLIER

    // Verify: impact chain analysis traces the full dependency
    const chain = analyzeImpactChain("ECO", "ECO-2026-015", "PLC upgrade for WASH-003");
    expect(chain.children.some(c => c.module === "FMEA")).toBe(true);
    expect(chain.children.some(c => c.module === "SUPPLIER")).toBe(true);
    expect(chain.children.some(c => c.module === "CBAM")).toBe(true);

    // Verify: CEO snapshot reflects the changes
    const thread = weaveDigitalThread(events, {
      ...MOCK_MODULE_DATA,
      quality: { open8Ds: 1, overdueCapas: 0, maxRpn: 180 }, // Updated RPN after FMEA
    }, NOW);

    expect(thread.snapshot.maxFmeaRpn).toBe(180); // Reflects the ECO-triggered FMEA update
    expect(thread.recentEvents.length).toBe(4);
    expect(thread.health.overall).toBeGreaterThan(0);
  });

  it("should trace a machine failure → auto-reschedule → operator re-training chain", () => {
    const events: ThreadEvent[] = [];

    // Step 1: Machine health critical
    events.push(createThreadEvent("SCHEDULER", "ALERT", "CRITICAL", "CNC-001", "machine",
      "CNC-001健康评分35%，自动转移3工单至CNC-002", "CNC-001 health 35%, 3 jobs auto-moved to CNC-002",
      {}, new Date("2026-02-25T08:00:00Z")));

    // Step 2: Operator blocked
    events.push(createThreadEvent("HR_AI", "BLOCKED", "WARNING", "OP-LiMing", "operator",
      "李明因CNC质量缺陷被暂停", "Li Ming blocked due to CNC quality defects",
      { linkedUser: "li.ming" }, new Date("2026-02-25T09:00:00Z")));

    // Step 3: OEE drops
    events.push(createThreadEvent("OEE", "ALERT", "WARNING", "CNC-001", "machine",
      "CNC-001 OEE降至45%", "CNC-001 OEE dropped to 45%",
      {}, new Date("2026-02-25T09:30:00Z")));

    // Step 4: Operator completes training
    events.push(createThreadEvent("HR_AI", "UNBLOCKED", "INFO", "OP-LiMing", "operator",
      "李明完成培训（85/80分），权限恢复", "Li Ming completed training (85/80), access restored",
      { linkedUser: "li.ming" }, new Date("2026-02-25T15:00:00Z")));

    // Verify chain integrity
    expect(events.length).toBe(4);

    const criticals = filterThreadEvents(events, { severity: "CRITICAL" });
    expect(criticals.length).toBe(1);
    expect(criticals[0].sourceModule).toBe("SCHEDULER");

    const hrEvents = filterThreadEvents(events, { module: "HR_AI" });
    expect(hrEvents.length).toBe(2);
    // Li Ming was blocked then unblocked
    expect(hrEvents.some(e => e.eventType === "BLOCKED")).toBe(true);
    expect(hrEvents.some(e => e.eventType === "UNBLOCKED")).toBe(true);
  });
});

// ─── 10. Edge Cases ──────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("should handle empty events array", () => {
    const result = filterThreadEvents([]);
    expect(result.length).toBe(0);
  });

  it("should handle all-perfect company health", () => {
    const modules: ModuleHealth = { production: 100, quality: 100, cost: 100, supplyChain: 100, esg: 100, people: 100, schedule: 100 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(100);
    expect(result.grade).toBe("A");
  });

  it("should handle all-zero company health", () => {
    const modules: ModuleHealth = { production: 0, quality: 0, cost: 0, supplyChain: 0, esg: 0, people: 0, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(0);
    expect(result.grade).toBe("F");
  });

  it("should handle weaveDigitalThread with empty events", () => {
    const thread = weaveDigitalThread([], MOCK_MODULE_DATA, NOW);
    expect(thread.recentEvents.length).toBe(0);
    expect(thread.snapshot).toBeDefined();
    expect(thread.health.overall).toBeGreaterThan(0);
  });

  it("should handle zero budget gracefully", () => {
    const thread = weaveDigitalThread([], { ...MOCK_MODULE_DATA, cost: { ...MOCK_MODULE_DATA.cost, budgetTotal: 0, spentToDate: 0 } }, NOW);
    expect(thread.financialBurnRate.burnPercent).toBe(0);
  });

  it("should handle zero projects gracefully", () => {
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 0, onTrack: 0, atRisk: 0 },
      production: { oee: 0, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 0, overdueCapas: 0, maxRpn: 0 },
      cost: { variancePercent: 0 },
      supplyChain: { avgScore: 0, restricted: 0, cashRelease: 0 },
      esg: { compliantProducts: 0, atRiskProducts: 0, totalCo2: 0, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 0 },
    });
    expect(snapshot.totalProjects).toBe(0);
    expect(snapshot.companyHealthScore).toBeGreaterThanOrEqual(0);
  });
});

// ═══ HARDENING: Stress-Test Company Health Score Engine ═══════════════

describe("HARDENING — Company Health Score Stress Tests", () => {
  it("Production=100, all others=0 → score should be EXACTLY 25", () => {
    const modules: ModuleHealth = { production: 100, quality: 0, cost: 0, supplyChain: 0, esg: 0, people: 0, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(25); // 100 * 0.25 = 25
  });

  it("Quality=100, all others=0 → score should be EXACTLY 20", () => {
    const modules: ModuleHealth = { production: 0, quality: 100, cost: 0, supplyChain: 0, esg: 0, people: 0, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(20); // 100 * 0.20 = 20
  });

  it("Cost=100, all others=0 → score should be EXACTLY 15", () => {
    const modules: ModuleHealth = { production: 0, quality: 0, cost: 100, supplyChain: 0, esg: 0, people: 0, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(15); // 100 * 0.15 = 15
  });

  it("SupplyChain=100, all others=0 → score should be EXACTLY 15", () => {
    const modules: ModuleHealth = { production: 0, quality: 0, cost: 0, supplyChain: 100, esg: 0, people: 0, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(15);
  });

  it("ESG=100, all others=0 → score should be EXACTLY 10", () => {
    const modules: ModuleHealth = { production: 0, quality: 0, cost: 0, supplyChain: 0, esg: 100, people: 0, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(10);
  });

  it("People=100, all others=0 → score should be EXACTLY 10", () => {
    const modules: ModuleHealth = { production: 0, quality: 0, cost: 0, supplyChain: 0, esg: 0, people: 100, schedule: 0 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(10);
  });

  it("Schedule=100, all others=0 → score should be EXACTLY 5", () => {
    const modules: ModuleHealth = { production: 0, quality: 0, cost: 0, supplyChain: 0, esg: 0, people: 0, schedule: 100 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(5); // 100 * 0.05 = 5
  });

  it("sum of all weights should equal exactly 1.0 (25+20+15+15+10+10+5=100)", () => {
    // Each module at 100 → overall should be exactly 100
    const modules: ModuleHealth = { production: 100, quality: 100, cost: 100, supplyChain: 100, esg: 100, people: 100, schedule: 100 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(100);
    // Also verify via sum: 25+20+15+15+10+10+5 = 100
    expect(0.25 + 0.20 + 0.15 + 0.15 + 0.10 + 0.10 + 0.05).toBe(1.0);
  });

  it("grade boundary: score=89 → B (not A)", () => {
    const modules: ModuleHealth = { production: 89, quality: 89, cost: 89, supplyChain: 89, esg: 89, people: 89, schedule: 89 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(89);
    expect(result.grade).toBe("B");
  });

  it("grade boundary: score=90 → A", () => {
    const modules: ModuleHealth = { production: 90, quality: 90, cost: 90, supplyChain: 90, esg: 90, people: 90, schedule: 90 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(90);
    expect(result.grade).toBe("A");
  });

  it("grade boundary: score=75 → B", () => {
    const modules: ModuleHealth = { production: 75, quality: 75, cost: 75, supplyChain: 75, esg: 75, people: 75, schedule: 75 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(75);
    expect(result.grade).toBe("B");
  });

  it("grade boundary: score=74 → C", () => {
    const modules: ModuleHealth = { production: 74, quality: 74, cost: 74, supplyChain: 74, esg: 74, people: 74, schedule: 74 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(74);
    expect(result.grade).toBe("C");
  });

  it("grade boundary: score=60 → C", () => {
    const modules: ModuleHealth = { production: 60, quality: 60, cost: 60, supplyChain: 60, esg: 60, people: 60, schedule: 60 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(60);
    expect(result.grade).toBe("C");
  });

  it("grade boundary: score=59 → D", () => {
    const modules: ModuleHealth = { production: 59, quality: 59, cost: 59, supplyChain: 59, esg: 59, people: 59, schedule: 59 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(59);
    expect(result.grade).toBe("D");
  });

  it("grade boundary: score=40 → D", () => {
    const modules: ModuleHealth = { production: 40, quality: 40, cost: 40, supplyChain: 40, esg: 40, people: 40, schedule: 40 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(40);
    expect(result.grade).toBe("D");
  });

  it("grade boundary: score=39 → F", () => {
    const modules: ModuleHealth = { production: 39, quality: 39, cost: 39, supplyChain: 39, esg: 39, people: 39, schedule: 39 };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(39);
    expect(result.grade).toBe("F");
  });
});

// ═══ HARDENING: Digital Thread Event System Stress Tests ══════════════

describe("HARDENING — Thread Event System Stress Tests", () => {
  it("should handle 1000 events and return sorted results", () => {
    const events: ThreadEvent[] = [];
    const modules: SourceModule[] = ["SOP", "OEE", "COMPLIANCE", "ECO", "SUPPLIER", "EMPLOYEE", "FMEA", "HR_AI", "SCHEDULER", "INVENTORY", "CBAM"];
    for (let i = 0; i < 1000; i++) {
      const mod = modules[i % modules.length];
      const sev: Severity = i % 10 === 0 ? "CRITICAL" : i % 3 === 0 ? "WARNING" : "INFO";
      events.push(makeEvent(mod, sev, new Date(Date.now() - i * 60000).toISOString()));
    }
    const result = filterThreadEvents(events);
    expect(result.length).toBe(1000);
    // Verify sorted newest first
    for (let i = 1; i < result.length; i++) {
      expect(new Date(result[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(new Date(result[i].timestamp).getTime());
    }
  });

  it("should return empty array when filtering by non-existent module (not crash)", () => {
    const events = [makeEvent("OEE", "INFO", "2026-02-25T10:00:00Z")];
    const result = filterThreadEvents(events, { module: "SCHEDULER" });
    expect(result).toEqual([]);
  });

  it("ECO impact chain should have EXACTLY 3 children: FMEA, SUPPLIER, CBAM", () => {
    const chain = analyzeImpactChain("ECO", "ECO-001", "Test ECO");
    expect(chain.children.length).toBe(3);
    const childModules = chain.children.map(c => c.module).sort();
    expect(childModules).toEqual(["CBAM", "FMEA", "SUPPLIER"]);
  });

  it("SCHEDULER impact chain should have EXACTLY 3 children: OEE, HR_AI, ECO", () => {
    const chain = analyzeImpactChain("SCHEDULER", "CNC-001", "Machine failure");
    expect(chain.children.length).toBe(3);
    const childModules = chain.children.map(c => c.module).sort();
    expect(childModules).toEqual(["ECO", "HR_AI", "OEE"]);
  });

  it("generateCeoWeeklyBrief should NEVER return empty headlines", () => {
    // Even with perfect data, headlines should have at least the health score line
    const snapshot = generateCeoSnapshot("2026-02-25", {
      projects: { total: 0, onTrack: 0, atRisk: 0 },
      production: { oee: 0, criticalMachines: 0, rescheduledJobs: 0 },
      quality: { open8Ds: 0, overdueCapas: 0, maxRpn: 0 },
      cost: { variancePercent: 0 },
      supplyChain: { avgScore: 0, restricted: 0, cashRelease: 0 },
      esg: { compliantProducts: 0, atRiskProducts: 0, totalCo2: 0, overdueCompliance: 0 },
      people: { blocksActive: 0, avgCombatPower: 0 },
    });
    const modules = calculateModuleHealth(HEALTHY_MODULE_DATA);
    const health = calculateCompanyHealthScore(modules);
    const brief = generateCeoWeeklyBrief(snapshot, health, [], NOW);
    expect(brief.headlines.length).toBeGreaterThanOrEqual(1);
  });

  it("limit=0 is falsy — treated as no limit, returns all events", () => {
    const events = [makeEvent("OEE", "INFO", "2026-02-25T10:00:00Z")];
    const result = filterThreadEvents(events, { limit: 0 });
    // 0 is falsy in JS, so `if (filters?.limit)` skips the slice — returns all
    expect(result.length).toBe(1);
  });

  it("1000 events with limit=10 should return exactly 10", () => {
    const events: ThreadEvent[] = [];
    for (let i = 0; i < 1000; i++) {
      events.push(makeEvent("OEE", "INFO", new Date(Date.now() - i * 60000).toISOString()));
    }
    const result = filterThreadEvents(events, { limit: 10 });
    expect(result.length).toBe(10);
  });
});
