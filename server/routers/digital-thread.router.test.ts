/**
 * Digital Thread Fusion Engine Router — Unit Tests
 * Tests pure functions (createThreadEvent, filterThreadEvents, calculateModuleHealth,
 * calculateCompanyHealthScore, generateCeoSnapshot, analyzeImpactChain,
 * generateCeoWeeklyBrief, weaveDigitalThread) + 4 tRPC procedures
 * (cockpit, events, impactChain, weeklyBrief)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";
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
  type ModuleHealth,
  type CeoKpiSnapshot,
  type CompanyHealthResult,
} from "./digital-thread.router";

// No DB mock needed — this router uses only mock data (no requireDb)

beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════
// PURE FUNCTION TESTS
// ════════════════════════════════════════════════════════════

describe("createThreadEvent", () => {
  it("creates event with all required fields", () => {
    const now = new Date("2026-03-01T10:00:00Z");
    const evt = createThreadEvent("OEE", "ALERT", "WARNING", "CNC-001", "machine",
      "OEE下降", "OEE dropped", undefined, now);
    expect(evt.eventId).toContain("EVT-OEE-");
    expect(evt.sourceModule).toBe("OEE");
    expect(evt.eventType).toBe("ALERT");
    expect(evt.severity).toBe("WARNING");
    expect(evt.entityId).toBe("CNC-001");
    expect(evt.summaryZh).toBe("OEE下降");
    expect(evt.summaryEn).toBe("OEE dropped");
  });

  it("includes optional fields when provided", () => {
    const evt = createThreadEvent("ECO", "APPROVED", "INFO", "ECO-001", "eco",
      "已批准", "Approved", { linkedProjectId: 5, linkedUser: "admin", metadata: { note: "test" } });
    expect(evt.linkedProjectId).toBe(5);
    expect(evt.linkedUser).toBe("admin");
    expect(evt.metadata).toHaveProperty("note", "test");
  });
});

describe("filterThreadEvents", () => {
  const now = new Date("2026-03-01T10:00:00Z");
  const events: ThreadEvent[] = [
    createThreadEvent("OEE", "ALERT", "WARNING", "CNC-001", "machine", "", "", {}, new Date("2026-03-01T08:00:00Z")),
    createThreadEvent("FMEA", "STATUS_CHANGE", "CRITICAL", "FMEA-001", "fmea", "", "", {}, new Date("2026-03-01T09:00:00Z")),
    createThreadEvent("OEE", "RESOLVED", "INFO", "CNC-002", "machine", "", "", {}, new Date("2026-03-01T07:00:00Z")),
    createThreadEvent("ECO", "APPROVED", "INFO", "ECO-001", "eco", "", "", {}, new Date("2026-02-28T12:00:00Z")),
  ];

  it("filters by module", () => {
    const result = filterThreadEvents(events, { module: "OEE" });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.sourceModule === "OEE")).toBe(true);
  });

  it("filters by severity", () => {
    const result = filterThreadEvents(events, { severity: "CRITICAL" });
    expect(result).toHaveLength(1);
    expect(result[0].sourceModule).toBe("FMEA");
  });

  it("filters by time range", () => {
    const result = filterThreadEvents(events, { since: "2026-03-01T08:30:00Z" });
    expect(result).toHaveLength(1);
    expect(result[0].sourceModule).toBe("FMEA");
  });

  it("limits results", () => {
    const result = filterThreadEvents(events, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("sorts newest first", () => {
    const result = filterThreadEvents(events);
    const timestamps = result.map(e => new Date(e.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
    }
  });

  it("returns all when no filters", () => {
    const result = filterThreadEvents(events);
    expect(result).toHaveLength(4);
  });

  it("combines multiple filters", () => {
    const result = filterThreadEvents(events, { module: "OEE", severity: "WARNING" });
    expect(result).toHaveLength(1);
  });
});

describe("calculateModuleHealth", () => {
  const goodData = {
    oee: 85, criticalMachinePercent: 0, maxRpn: 100, open8Ds: 0, overdueCapas: 0,
    costVariancePercent: 0, avgSupplierScore: 90, inventoryHealthPercent: 90,
    cbamCompliantPercent: 100, complianceOverduePercent: 0, operatorBlockPercent: 0,
    avgCombatPower: 85, projectOnTimePercent: 90,
  };

  it("returns high scores for good data", () => {
    const health = calculateModuleHealth(goodData);
    expect(health.production).toBeGreaterThanOrEqual(80);
    expect(health.quality).toBeGreaterThanOrEqual(90);
    expect(health.cost).toBe(100);
    expect(health.supplyChain).toBe(90);
    expect(health.esg).toBe(100);
    expect(health.people).toBeGreaterThanOrEqual(80);
    expect(health.schedule).toBe(90);
  });

  it("penalizes critical machines", () => {
    const health = calculateModuleHealth({ ...goodData, criticalMachinePercent: 30 });
    expect(health.production).toBeLessThan(calculateModuleHealth(goodData).production);
  });

  it("penalizes high RPN", () => {
    const health = calculateModuleHealth({ ...goodData, maxRpn: 800 });
    expect(health.quality).toBeLessThan(calculateModuleHealth(goodData).quality);
  });

  it("penalizes open 8Ds", () => {
    const health = calculateModuleHealth({ ...goodData, open8Ds: 5 });
    expect(health.quality).toBeLessThan(75);
  });

  it("penalizes cost overrun", () => {
    const health = calculateModuleHealth({ ...goodData, costVariancePercent: 15 });
    expect(health.cost).toBeLessThan(30);
  });

  it("penalizes operator blocks", () => {
    const health = calculateModuleHealth({ ...goodData, operatorBlockPercent: 20 });
    expect(health.people).toBeLessThan(calculateModuleHealth(goodData).people);
  });
});

describe("calculateCompanyHealthScore", () => {
  it("returns grade A for high scores", () => {
    const modules: ModuleHealth = {
      production: 95, quality: 92, cost: 90, supplyChain: 88, esg: 95, people: 90, schedule: 95,
    };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
  });

  it("returns grade B for 75-89", () => {
    const modules: ModuleHealth = {
      production: 80, quality: 80, cost: 80, supplyChain: 80, esg: 80, people: 80, schedule: 80,
    };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(80);
    expect(result.grade).toBe("B");
    expect(result.trend).toBe("IMPROVING");
  });

  it("returns grade C for 60-74", () => {
    const modules: ModuleHealth = {
      production: 65, quality: 65, cost: 65, supplyChain: 65, esg: 65, people: 65, schedule: 65,
    };
    const result = calculateCompanyHealthScore(modules);
    expect(result.grade).toBe("C");
  });

  it("returns grade D for 40-59", () => {
    const modules: ModuleHealth = {
      production: 50, quality: 50, cost: 50, supplyChain: 50, esg: 50, people: 50, schedule: 50,
    };
    const result = calculateCompanyHealthScore(modules);
    expect(result.grade).toBe("D");
  });

  it("returns grade F for < 40", () => {
    const modules: ModuleHealth = {
      production: 30, quality: 30, cost: 30, supplyChain: 30, esg: 30, people: 30, schedule: 30,
    };
    const result = calculateCompanyHealthScore(modules);
    expect(result.grade).toBe("F");
  });

  it("detects DECLINING trend when wide spread and overall < 80", () => {
    const modules: ModuleHealth = {
      production: 70, quality: 70, cost: 70, supplyChain: 70, esg: 70, people: 20, schedule: 70,
    };
    const result = calculateCompanyHealthScore(modules);
    // overall = 70*0.25+70*0.20+70*0.15+70*0.15+70*0.10+20*0.10+70*0.05 = 65, spread=50
    expect(result.trend).toBe("DECLINING");
  });

  it("weights correctly (production 25%, quality 20%, etc.)", () => {
    const modules: ModuleHealth = {
      production: 100, quality: 0, cost: 0, supplyChain: 0, esg: 0, people: 0, schedule: 0,
    };
    const result = calculateCompanyHealthScore(modules);
    expect(result.overall).toBe(25); // 100 * 0.25
  });
});

describe("generateCeoSnapshot", () => {
  const moduleData = {
    projects: { total: 10, onTrack: 7, atRisk: 2 },
    production: { oee: 82, criticalMachines: 1, rescheduledJobs: 2 },
    quality: { open8Ds: 1, overdueCapas: 0, maxRpn: 200 },
    cost: { variancePercent: 3 },
    supplyChain: { avgScore: 80, restricted: 1, cashRelease: 100000 },
    esg: { compliantProducts: 3, atRiskProducts: 1, totalCo2: 5000, overdueCompliance: 0 },
    people: { blocksActive: 0, avgCombatPower: 78 },
  };

  it("generates snapshot with all KPIs", () => {
    const snap = generateCeoSnapshot("2026-03-01", moduleData);
    expect(snap.snapshotDate).toBe("2026-03-01");
    expect(snap.totalProjects).toBe(10);
    expect(snap.overallOee).toBe(82);
    expect(snap.open8dCount).toBe(1);
    expect(snap.companyHealthScore).toBeGreaterThan(0);
    expect(snap.companyHealthScore).toBeLessThanOrEqual(100);
  });

  it("handles zero projects", () => {
    const snap = generateCeoSnapshot("2026-03-01", {
      ...moduleData,
      projects: { total: 0, onTrack: 0, atRisk: 0 },
    });
    expect(snap.totalProjects).toBe(0);
  });
});

describe("analyzeImpactChain", () => {
  it("returns ECO impact chain with FMEA + Supplier + CBAM children", () => {
    const chain = analyzeImpactChain("ECO", "ECO-001", "PLC upgrade");
    expect(chain.module).toBe("ECO");
    expect(chain.children).toHaveLength(3);
    expect(chain.children.map(c => c.module)).toContain("FMEA");
    expect(chain.children.map(c => c.module)).toContain("SUPPLIER");
    expect(chain.children.map(c => c.module)).toContain("CBAM");
  });

  it("returns SCHEDULER impact chain with OEE + HR_AI + cost", () => {
    const chain = analyzeImpactChain("SCHEDULER", "CNC-001", "Machine failure");
    expect(chain.module).toBe("SCHEDULER");
    expect(chain.severity).toBe("CRITICAL");
    expect(chain.children).toHaveLength(3);
  });

  it("returns generic chain for unknown module", () => {
    const chain = analyzeImpactChain("SOP", "SOP-001", "New SOP");
    expect(chain.module).toBe("SOP");
    expect(chain.children).toHaveLength(0);
  });
});

describe("generateCeoWeeklyBrief", () => {
  const modules: ModuleHealth = {
    production: 75, quality: 80, cost: 85, supplyChain: 70, esg: 90, people: 65, schedule: 80,
  };
  const health: CompanyHealthResult = { overall: 77, modules, grade: "B", trend: "STABLE" };
  const snapshot: CeoKpiSnapshot = {
    snapshotDate: "2026-03-01", totalProjects: 10, onTrackProjects: 7, atRiskProjects: 2,
    overallOee: 82, criticalMachines: 1, autoRescheduledJobs: 3,
    open8dCount: 2, overdueCapaCount: 1, maxFmeaRpn: 320,
    costVariancePercent: 4.2, avgSupplierScore: 78, restrictedSuppliers: 2,
    inventoryCashReleasePotential: 185000, cbamCompliantProducts: 2, cbamAtRiskProducts: 1,
    totalCo2Kg: 5840, complianceOverdueItems: 0, operatorBlocksActive: 1,
    avgCombatPower: 76, companyHealthScore: 77,
  };

  it("generates brief with headlines, risks, wins", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.healthScore).toBe(77);
    expect(brief.grade).toBe("B");
    expect(brief.headlines.length).toBeGreaterThanOrEqual(1);
    expect(brief.headlines[0]).toContain("Company Health Score");
    expect(brief.recommendation).toContain("Priority action");
  });

  it("reports critical machines in headlines", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.headlines.some(h => h.includes("critical machine"))).toBe(true);
  });

  it("reports cash release potential in headlines", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.headlines.some(h => h.includes("cash release"))).toBe(true);
  });

  it("reports open 8Ds in risks", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.risks.some(r => r.includes("8D"))).toBe(true);
  });

  it("reports CBAM at-risk in risks", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.risks.some(r => r.includes("CBAM"))).toBe(true);
  });

  it("reports restricted suppliers in risks", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.risks.some(r => r.includes("restricted"))).toBe(true);
  });

  it("reports OEE wins when high enough", () => {
    const highOeeSnapshot = { ...snapshot, overallOee: 85 };
    const brief = generateCeoWeeklyBrief(highOeeSnapshot, health, []);
    expect(brief.wins.some(w => w.includes("OEE"))).toBe(true);
  });

  it("reports quality wins when module health >= 80", () => {
    const brief = generateCeoWeeklyBrief(snapshot, health, []);
    expect(brief.wins.some(w => w.includes("Quality"))).toBe(true);
  });
});

describe("weaveDigitalThread", () => {
  const now = new Date("2026-03-01T10:00:00Z");
  const events: ThreadEvent[] = [
    createThreadEvent("OEE", "ALERT", "WARNING", "CNC-001", "machine", "", "", {}, now),
  ];
  const moduleData = {
    projects: { total: 10, onTrack: 8, atRisk: 1 },
    production: { oee: 85, criticalMachines: 0, rescheduledJobs: 0 },
    quality: { open8Ds: 0, overdueCapas: 0, maxRpn: 150 },
    cost: { variancePercent: 2, budgetTotal: 3000000, spentToDate: 2000000 },
    supplyChain: { avgScore: 85, restricted: 0, cashRelease: 50000, shortageRisks: 1, avgLeadTime: 14 },
    esg: { compliantProducts: 5, atRiskProducts: 0, totalCo2: 3000, overdueCompliance: 0 },
    people: {
      blocksActive: 0, avgCombatPower: 82,
      topEmployees: [{ name: "Wang", score: 95 }], trainingInProgress: 2,
    },
    machines: [{ code: "CNC-001", health: 90, status: "HEALTHY" }],
  };

  it("returns complete digital thread data", () => {
    const data = weaveDigitalThread(events, moduleData, now);
    expect(data).toHaveProperty("snapshot");
    expect(data).toHaveProperty("health");
    expect(data).toHaveProperty("recentEvents");
    expect(data).toHaveProperty("weeklyBrief");
    expect(data).toHaveProperty("financialBurnRate");
    expect(data).toHaveProperty("quadrants");
  });

  it("calculates financial burn rate", () => {
    const data = weaveDigitalThread(events, moduleData, now);
    expect(data.financialBurnRate.budgetTotal).toBe(3000000);
    expect(data.financialBurnRate.spentToDate).toBe(2000000);
    expect(data.financialBurnRate.burnPercent).toBeCloseTo(66.67, 1);
  });

  it("populates quadrants", () => {
    const data = weaveDigitalThread(events, moduleData, now);
    expect(data.quadrants.manufacturing.oee).toBe(85);
    expect(data.quadrants.quality.open8Ds).toBe(0);
    expect(data.quadrants.supplyChain.restrictedSuppliers).toBe(0);
    expect(data.quadrants.people.topEmployees).toHaveLength(1);
  });

  it("limits recent events to 20", () => {
    const manyEvents = Array.from({ length: 30 }, (_, i) =>
      createThreadEvent("OEE", "ALERT", "INFO", `E-${i}`, "machine", "", "", {}, now)
    );
    const data = weaveDigitalThread(manyEvents, moduleData, now);
    expect(data.recentEvents).toHaveLength(20);
  });
});

// ════════════════════════════════════════════════════════════
// tRPC PROCEDURE TESTS
// ════════════════════════════════════════════════════════════

describe("digital-thread router", () => {

  describe("cockpit", () => {
    it("returns complete digital thread cockpit data", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.cockpit();
      expect(result).toHaveProperty("snapshot");
      expect(result).toHaveProperty("health");
      expect(result).toHaveProperty("recentEvents");
      expect(result).toHaveProperty("weeklyBrief");
      expect(result).toHaveProperty("financialBurnRate");
      expect(result).toHaveProperty("quadrants");
      expect(result.health).toHaveProperty("grade");
      expect(result.health).toHaveProperty("overall");
    });
  });

  describe("events", () => {
    it("returns all events without filters", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.events({});
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("filters by module", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.events({ module: "OEE" });
      expect(result.every((e: any) => e.sourceModule === "OEE")).toBe(true);
    });

    it("filters by severity", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.events({ severity: "CRITICAL" });
      expect(result.every((e: any) => e.severity === "CRITICAL")).toBe(true);
    });

    it("limits results", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.events({ limit: 3 });
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe("impactChain", () => {
    it("returns ECO impact chain", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.impactChain({
        triggerModule: "ECO", triggerEntity: "ECO-001", triggerDescription: "PLC upgrade",
      });
      expect(result.module).toBe("ECO");
      expect(result.children.length).toBeGreaterThan(0);
    });

    it("returns SCHEDULER impact chain", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.impactChain({
        triggerModule: "SCHEDULER", triggerEntity: "CNC-001", triggerDescription: "Machine failure",
      });
      expect(result.module).toBe("SCHEDULER");
      expect(result.severity).toBe("CRITICAL");
    });
  });

  describe("weeklyBrief", () => {
    it("returns CEO weekly briefing", async () => {
      const caller = createAdminCaller();
      const result = await caller.digitalThread.weeklyBrief();
      expect(result).toHaveProperty("healthScore");
      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("headlines");
      expect(result).toHaveProperty("risks");
      expect(result).toHaveProperty("wins");
      expect(result).toHaveProperty("recommendation");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for cockpit", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.digitalThread.cockpit()).rejects.toThrow();
    });
    it("rejects anonymous for events", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.digitalThread.events({})).rejects.toThrow();
    });
    it("rejects anonymous for impactChain", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.digitalThread.impactChain({
        triggerModule: "ECO", triggerEntity: "X", triggerDescription: "Y",
      })).rejects.toThrow();
    });
    it("rejects anonymous for weeklyBrief", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.digitalThread.weeklyBrief()).rejects.toThrow();
    });
  });
});
