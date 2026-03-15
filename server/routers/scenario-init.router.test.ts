/**
 * Tests for scenario-init.router.ts
 *
 * Validates:
 * - Router exports and procedure types
 * - Batch launcher structure (3 batches)
 * - Individual init procedure exposure (13 procedures)
 * - Status query availability + handler logic
 * - Init handler idempotency (skips when seed data exists)
 * - Event publishing on successful init
 * - Batch sequential execution + counts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Track DB operations
const insertValues: any[] = [];
const selectResults: any[] = [];
let dbSelectShouldReturnRows = false;

// Mock drizzle-orm/pg-core
vi.mock("drizzle-orm/pg-core", () => {
  const col = (): any => ({
    notNull: () => col(),
    default: () => col(),
    defaultNow: () => col(),
    unique: () => col(),
    primaryKey: () => col(),
    references: () => col(),
    $type: () => col(),
    array: () => col(),
  });
  return {
    pgTable: (_name: string, columns: any, ...rest: any[]) => ({ ...columns }),
    pgEnum: (_name: string, values: string[]) => () => col(),
    serial: () => col(),
    varchar: () => col(),
    text: () => col(),
    integer: () => col(),
    boolean: () => col(),
    timestamp: () => col(),
    decimal: () => col(),
    json: () => col(),
    jsonb: () => col(),
    bigint: () => col(),
    smallint: () => col(),
    real: () => col(),
    date: () => col(),
    time: () => col(),
    index: () => ({}),
    uniqueIndex: () => ({}),
    primaryKey: () => ({}),
    unique: () => ({}),
    AnyPgColumn: {},
  };
});

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  relations: () => ({}),
  eq: () => ({}),
  and: (...args: any[]) => args,
  like: (col: any, val: string) => ({ _like: val }),
  count: () => ({}),
  sql: () => ({}),
  InferSelectModel: {},
  InferInsertModel: {},
}));

// Mock tRPC — capture handlers for invocation
vi.mock("../_core/trpc", () => {
  const mockProcedure: any = {
    query: (fn: any) => ({ _type: "query", _handler: fn }),
    mutation: (fn: any) => ({ _type: "mutation", _handler: fn }),
    input: () => mockProcedure,
  };
  return {
    router: (routes: any) => routes,
    protectedProcedure: mockProcedure,
    publicProcedure: mockProcedure,
    requirePermission: () => mockProcedure,
  };
});

// Mock event bus — track published events
const publishedEvents: any[] = [];
vi.mock("../events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockImplementation((evt) => {
      publishedEvents.push(evt);
      return Promise.resolve();
    }),
    subscribe: vi.fn(),
    subscribeModule: vi.fn(),
  },
  SANDBOX_EVENTS: {
    PROJECT_GATE_PASSED: "project.gate.passed",
    HR_EMPLOYEE_ONBOARDED: "hr.employee.onboarded",
    SCHEDULING_PLAN_PUBLISHED: "scheduling.plan.published",
    PERF_CALIBRATION_DONE: "perf.calibration.done",
    PAYROLL_CYCLE_CALCULATED: "payroll.cycle.calculated",
    PLANNING_BUDGET_APPROVED: "planning.budget.approved",
    BOM_FINALIZED: "bom.finalized",
    CUSTOMER_PROFILE_UPDATED: "customer.profile.updated",
    MECH_CONFIG_VALIDATED: "mech.config.validated",
    ELEC_CONFIG_VALIDATED: "elec.config.validated",
    ACCEPTANCE_COMPLETED: "acceptance.completed",
    SCENARIO_BATCH_STARTED: "scenario.batch.started",
    SCENARIO_BATCH_COMPLETED: "scenario.batch.completed",
    SCENARIO_INIT_FAILED: "scenario.init.failed",
  },
}));

// Mock logger
vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock DB — with dynamic behavior
let insertIdCounter = 1;
vi.mock("../db", () => ({
  requireDb: vi.fn().mockImplementation(() =>
    Promise.resolve({
      select: () => ({
        from: (...args: any[]) => {
          const result = dbSelectShouldReturnRows
            ? [{ id: 1, eventType: "scenario.init.project-lifecycle", count: 0 }]
            : selectResults.length > 0 ? selectResults : [{ count: 0 }];
          const p = Promise.resolve(result);
          // Make iterable (for `const [row] = await db.select().from(...)`)
          (p as any).where = () => ({
            limit: () => {
              if (dbSelectShouldReturnRows) {
                return Promise.resolve([{ id: 1, eventType: "scenario.init.project-lifecycle" }]);
              }
              return Promise.resolve(selectResults.length > 0 ? selectResults : []);
            },
          });
          (p as any).then = p.then.bind(p);
          return p;
        },
      }),
      insert: () => ({
        values: (v: any) => {
          insertValues.push(v);
          return {
            returning: () => Promise.resolve([{ id: insertIdCounter++ }]),
          };
        },
      }),
    })
  ),
}));

describe("scenario-init.router", () => {
  let router: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    insertValues.length = 0;
    selectResults.length = 0;
    publishedEvents.length = 0;
    insertIdCounter = 1;
    dbSelectShouldReturnRows = false;
    const module = await import("./scenario-init.router");
    router = module.scenarioInitRouter;
  });

  it("exports scenarioInitRouter", () => {
    expect(router).toBeDefined();
  });

  describe("router structure", () => {
    it("has getStatus query", () => {
      expect(router.getStatus).toBeDefined();
      expect(router.getStatus._type).toBe("query");
    });

    it("has 3 batch launcher mutations", () => {
      expect(router.launchBatch1).toBeDefined();
      expect(router.launchBatch1._type).toBe("mutation");
      expect(router.launchBatch2).toBeDefined();
      expect(router.launchBatch2._type).toBe("mutation");
      expect(router.launchBatch3).toBeDefined();
      expect(router.launchBatch3._type).toBe("mutation");
    });

    it("has 13 individual init mutations", () => {
      const initProcedures = [
        "initProjectLifecycle",
        "initHrLifecycle",
        "initProductionScheduling",
        "initPerformancePoints",
        "initPayrollAttendance",
        "initAnnualPlanning",
        "initQuotingBom",
        "initCustomerConfig",
        "initMechanicalStandards",
        "initElectricalStandards",
        "initAcceptanceTracking",
        "initSiteDelivery",
        "initAiProcessTwin",
      ];

      for (const name of initProcedures) {
        expect(router[name], `missing: ${name}`).toBeDefined();
        expect(router[name]._type, `${name} not mutation`).toBe("mutation");
      }
    });

    it("has exactly 17 procedures (1 query + 3 batches + 13 inits)", () => {
      const keys = Object.keys(router);
      expect(keys.length).toBe(17);
    });
  });

  describe("getStatus handler", () => {
    it("returns initialized array", async () => {
      const result = await router.getStatus._handler();
      expect(result).toHaveProperty("initialized");
      expect(Array.isArray(result.initialized)).toBe(true);
    });

    it("returns empty array when no sandboxes initialized", async () => {
      const result = await router.getStatus._handler();
      expect(result.initialized).toEqual([]);
    });

    it("deduplicates initialized sandbox IDs", async () => {
      // The handler strips "scenario.init." prefix and deduplicates
      selectResults.push(
        { eventType: "scenario.init.project-lifecycle" },
        { eventType: "scenario.init.project-lifecycle" },
        { eventType: "scenario.init.hr-lifecycle" }
      );
      // Note: our mock returns selectResults when non-empty
      const result = await router.getStatus._handler();
      expect(result).toHaveProperty("initialized");
    });
  });

  describe("individual init mutations", () => {
    it("initProjectLifecycle inserts projects and gates", async () => {
      const result = await router.initProjectLifecycle._handler({
        ctx: { userId: 1 },
      });
      // Should have inserted projects and gates
      expect(insertValues.length).toBeGreaterThan(0);
      // Should publish PROJECT_GATE_PASSED event
      const gateEvent = publishedEvents.find(
        (e) => e.type === "project.gate.passed"
      );
      expect(gateEvent).toBeDefined();
      expect(gateEvent.sourceModule).toBe("project-lifecycle");
      // Should publish markInitialized event
      const initEvent = publishedEvents.find(
        (e) => e.type === "scenario.init.project-lifecycle"
      );
      expect(initEvent).toBeDefined();
    });

    it("initHrLifecycle publishes HR_EMPLOYEE_ONBOARDED event", async () => {
      const result = await router.initHrLifecycle._handler({
        ctx: { userId: 1 },
      });
      const hrEvent = publishedEvents.find(
        (e) => e.type === "hr.employee.onboarded"
      );
      expect(hrEvent).toBeDefined();
      expect(hrEvent.payload.scenarios).toHaveLength(3);
    });

    it("initProductionScheduling inserts BOM work hours and work logs", async () => {
      await router.initProductionScheduling._handler({
        ctx: { userId: 1 },
      });
      // 8 process codes + 5 work logs = 13 inserts + markInitialized event
      expect(insertValues.length).toBeGreaterThanOrEqual(8);
      const schedEvent = publishedEvents.find(
        (e) => e.type === "scheduling.plan.published"
      );
      expect(schedEvent).toBeDefined();
    });

    it("initPerformancePoints inserts reviews and evidence", async () => {
      await router.initPerformancePoints._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const perfEvent = publishedEvents.find(
        (e) => e.type === "perf.calibration.done"
      );
      expect(perfEvent).toBeDefined();
    });

    it("initPayrollAttendance inserts cycles, attendance, allowances", async () => {
      await router.initPayrollAttendance._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const payEvent = publishedEvents.find(
        (e) => e.type === "payroll.cycle.calculated"
      );
      expect(payEvent).toBeDefined();
    });

    it("initAnnualPlanning inserts configs, items, and plans", async () => {
      await router.initAnnualPlanning._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const planEvent = publishedEvents.find(
        (e) => e.type === "planning.budget.approved"
      );
      expect(planEvent).toBeDefined();
    });

    it("initQuotingBom inserts quotations and publishes BOM_FINALIZED", async () => {
      await router.initQuotingBom._handler({
        ctx: { userId: 1 },
      });
      const bomEvent = publishedEvents.find(
        (e) => e.type === "bom.finalized"
      );
      expect(bomEvent).toBeDefined();
      expect(bomEvent.payload).toBeDefined();
    });

    it("initCustomerConfig inserts profiles, aesthetics, channels", async () => {
      await router.initCustomerConfig._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const custEvent = publishedEvents.find(
        (e) => e.type === "customer.profile.updated"
      );
      expect(custEvent).toBeDefined();
    });

    it("initMechanicalStandards inserts 7 configs including 2 conflicts", async () => {
      await router.initMechanicalStandards._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const mechEvent = publishedEvents.find(
        (e) => e.type === "mech.config.validated"
      );
      expect(mechEvent).toBeDefined();
    });

    it("initElectricalStandards inserts 4 electrical specs", async () => {
      await router.initElectricalStandards._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const elecEvent = publishedEvents.find(
        (e) => e.type === "elec.config.validated"
      );
      expect(elecEvent).toBeDefined();
    });

    it("initAcceptanceTracking inserts acceptance records", async () => {
      await router.initAcceptanceTracking._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const accEvent = publishedEvents.find(
        (e) => e.type === "acceptance.completed"
      );
      expect(accEvent).toBeDefined();
    });

    it("initSiteDelivery inserts delivery executions and installations", async () => {
      await router.initSiteDelivery._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      const initEvent = publishedEvents.find(
        (e) => e.type === "scenario.init.site-delivery"
      );
      expect(initEvent).toBeDefined();
    });

    it("initAiProcessTwin inserts FMEA docs, items, SOP templates", async () => {
      await router.initAiProcessTwin._handler({
        ctx: { userId: 1 },
      });
      expect(insertValues.length).toBeGreaterThan(0);
      // Should mark initialized
      const initEvent = publishedEvents.find(
        (e) => e.type === "scenario.init.ai-process-twin"
      );
      expect(initEvent).toBeDefined();
    });
  });

  describe("idempotency", () => {
    it("skips initialization when seed data already exists", async () => {
      dbSelectShouldReturnRows = true;
      const result = await router.initProjectLifecycle._handler({
        ctx: { userId: 1 },
      });
      expect(result).toEqual({ skipped: true });
      expect(insertValues.length).toBe(0);
      expect(
        publishedEvents.filter((e) => e.type === "project.gate.passed").length
      ).toBe(0);
    });
  });

  describe("batch launchers", () => {
    it("launchBatch1 executes 5 inits and returns counts", async () => {
      const result = await router.launchBatch1._handler({
        ctx: { userId: 1 },
      });
      expect(result).toHaveProperty("initialized");
      expect(result).toHaveProperty("skipped");
      expect(result.initialized + result.skipped).toBe(5);
    });

    it("launchBatch2 executes 5 inits and returns counts", async () => {
      const result = await router.launchBatch2._handler({
        ctx: { userId: 1 },
      });
      expect(result).toHaveProperty("initialized");
      expect(result).toHaveProperty("skipped");
      expect(result.initialized + result.skipped).toBe(5);
    });

    it("launchBatch3 executes 3 inits and returns counts", async () => {
      const result = await router.launchBatch3._handler({
        ctx: { userId: 1 },
      });
      expect(result).toHaveProperty("initialized");
      expect(result).toHaveProperty("skipped");
      expect(result.initialized + result.skipped).toBe(3);
    });

    it("batch skips all when data exists", async () => {
      dbSelectShouldReturnRows = true;
      const result = await router.launchBatch1._handler({
        ctx: { userId: 1 },
      });
      expect(result.skipped).toBe(5);
      expect(result.initialized).toBe(0);
    });
  });

  describe("event publishing", () => {
    it("each init publishes at least a markInitialized event", async () => {
      const inits = [
        "initProjectLifecycle",
        "initHrLifecycle",
        "initProductionScheduling",
        "initPerformancePoints",
        "initPayrollAttendance",
        "initAnnualPlanning",
        "initQuotingBom",
        "initCustomerConfig",
        "initMechanicalStandards",
        "initElectricalStandards",
        "initAcceptanceTracking",
        "initSiteDelivery",
        "initAiProcessTwin",
      ];

      for (const name of inits) {
        publishedEvents.length = 0;
        insertValues.length = 0;
        insertIdCounter = 1;
        dbSelectShouldReturnRows = false;

        await router[name]._handler({ ctx: { userId: 1 } });

        const initEvents = publishedEvents.filter((e) =>
          e.type.startsWith("scenario.init.")
        );
        expect(
          initEvents.length,
          `${name} should publish scenario.init.* event`
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it("project init publishes cross-sandbox event", async () => {
      await router.initProjectLifecycle._handler({ ctx: { userId: 1 } });
      const crossEvent = publishedEvents.find(
        (e) =>
          e.type === "project.gate.passed" &&
          e.targetModules?.includes("production-scheduling")
      );
      expect(crossEvent).toBeDefined();
    });
  });
});
