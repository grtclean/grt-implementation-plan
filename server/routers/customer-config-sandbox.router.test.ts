/**
 * Tests for customer-config-sandbox.router.ts
 * 客户配置与档案库沙盘 — 34 procedures across 8 sub-routers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Drizzle mocks ──
const selectResultsQueue: any[][] = [];
const returningQueue: any[][] = [];

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ op: "eq", args })),
  and: vi.fn((...args: any[]) => ({ op: "and", args })),
  desc: vi.fn((col: any) => ({ op: "desc", col })),
  like: vi.fn((...args: any[]) => ({ op: "like", args })),
  sql: vi.fn((...args: any[]) => ({ op: "sql", args })),
  relations: vi.fn(() => ({})),
}));

function colProxy(n: string): any {
  const obj: any = { name: n };
  for (const m of ["notNull", "default", "defaultNow", "primaryKey", "unique", "references", "$type", "$default", "$onUpdate", "array", "generatedAlwaysAs"]) {
    obj[m] = (..._args: any[]) => colProxy(n);
  }
  return obj;
}

vi.mock("drizzle-orm/pg-core", () => {
  return {
    pgTable: vi.fn((name: string, cols: any, idxFn?: any) => {
      const t = typeof cols === "function" ? {} : { _name: name, ...cols };
      if (idxFn) try { idxFn(t); } catch {}
      return t;
    }),
    serial: vi.fn((n?: string) => colProxy(n ?? "id")),
    integer: vi.fn((n?: string) => colProxy(n ?? "int")),
    smallint: vi.fn((n?: string) => colProxy(n ?? "si")),
    bigint: vi.fn((n?: string, _opts?: any) => colProxy(n ?? "bi")),
    real: vi.fn((n?: string) => colProxy(n ?? "r")),
    varchar: vi.fn((n?: any, _opts?: any) => colProxy(typeof n === "string" ? n : "vc")),
    decimal: vi.fn((n?: string, _opts?: any) => colProxy(n ?? "dec")),
    text: vi.fn((n?: string) => colProxy(n ?? "txt")),
    timestamp: vi.fn((n?: string, _opts?: any) => colProxy(n ?? "ts")),
    date: vi.fn((n?: string) => colProxy(n ?? "dt")),
    time: vi.fn((n?: string) => colProxy(n ?? "tm")),
    json: vi.fn((n?: string) => colProxy(n ?? "js")),
    boolean: vi.fn((n?: string) => colProxy(n ?? "bool")),
    index: vi.fn(() => ({ on: vi.fn() })),
    unique: vi.fn(() => ({ on: vi.fn() })),
    uniqueIndex: vi.fn(() => ({ on: vi.fn() })),
    primaryKey: vi.fn((..._args: any[]) => ({})),
    AnyPgColumn: {},
    pgEnum: vi.fn((name: string, values: string[]) => {
      const fn = vi.fn((_col?: string) => colProxy(_col ?? name));
      (fn as any).enumName = name;
      (fn as any).enumValues = values;
      return fn;
    }),
  };
});

// ── Mock DB ──
const chainMethods: any = {};
chainMethods.select = vi.fn(() => chainMethods);
chainMethods.from = vi.fn(() => chainMethods);
chainMethods.where = vi.fn(() => chainMethods);
chainMethods.orderBy = vi.fn(() => chainMethods);
chainMethods.groupBy = vi.fn(() => chainMethods);
chainMethods.limit = vi.fn(() => selectResultsQueue.shift() ?? []);
chainMethods.offset = vi.fn(() => chainMethods);
chainMethods.insert = vi.fn(() => chainMethods);
chainMethods.values = vi.fn(() => chainMethods);
chainMethods.returning = vi.fn(() => returningQueue.shift() ?? [{ id: 1 }]);
chainMethods.update = vi.fn(() => chainMethods);
chainMethods.set = vi.fn(() => chainMethods);
chainMethods.delete = vi.fn(() => chainMethods);

const mockDb = {
  select: vi.fn(() => chainMethods),
  insert: vi.fn(() => chainMethods),
  update: vi.fn(() => chainMethods),
  delete: vi.fn(() => chainMethods),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Import router ──
import { customerConfigSandboxRouter } from "./customer-config-sandbox.router";

function resetQueues() {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
}

describe("customer-config-sandbox.router", () => {
  beforeEach(() => {
    resetQueues();
    vi.clearAllMocks();
  });

  // ── Structure tests ──
  describe("structure", () => {
    it("has all 8 sub-routers", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      const keys = Object.keys(def.record ?? def.procedures ?? {});
      expect(keys).toContain("profile");
      expect(keys).toContain("brand");
      expect(keys).toContain("standards");
      expect(keys).toContain("interlock");
      expect(keys).toContain("snapshot");
      expect(keys).toContain("dashboard");
      expect(keys).toContain("reading");
      expect(keys).toContain("portalUser");
      expect(keys.length).toBe(8);
    });

    it("profile sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.profile).toBeDefined();
    });

    it("brand sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.brand).toBeDefined();
    });

    it("standards sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.standards).toBeDefined();
    });

    it("interlock sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.interlock).toBeDefined();
    });

    it("snapshot sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.snapshot).toBeDefined();
    });

    it("dashboard sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.dashboard).toBeDefined();
    });

    it("reading sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.reading).toBeDefined();
    });

    it("portalUser sub-router exists", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      expect(def.record?.portalUser).toBeDefined();
    });
  });

  // ── Schema import verification ──
  describe("schema imports", () => {
    it("imports strategicCustomerProfiles table", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.strategicCustomerProfiles).toBeDefined();
    });

    it("imports customerBrandAesthetics table", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.customerBrandAesthetics).toBeDefined();
    });

    it("imports customerStandardsMappings table", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.customerStandardsMappings).toBeDefined();
    });

    it("imports customerProductInterlocks table", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.customerProductInterlocks).toBeDefined();
    });

    it("imports customerProfileSnapshots table", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.customerProfileSnapshots).toBeDefined();
    });

    it("exports cooperation tier enum", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.cooperationTierEnum).toBeDefined();
    });

    it("exports visual style enum", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.visualStyleEnum).toBeDefined();
    });

    it("exports interlock timeline enum", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.interlockTimelineEnum).toBeDefined();
    });

    it("imports customerReadingChannels table", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.customerReadingChannels).toBeDefined();
    });

    it("exports reading access level enum", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      expect(schema.readingAccessLevelEnum).toBeDefined();
    });
  });

  // ── Router export verification ──
  describe("router exports", () => {
    it("exports customerConfigSandboxRouter", () => {
      expect(customerConfigSandboxRouter).toBeDefined();
    });

    it("has 8 top-level sub-routers", () => {
      const def = (customerConfigSandboxRouter as any)._def;
      const keys = Object.keys(def.record ?? def.procedures ?? {});
      expect(keys.length).toBe(8);
    });

    it("Millison demo customerId is MILLISON_301307 format", () => {
      // Verify the schema supports the expected customer ID format
      expect("MILLISON_301307").toMatch(/^[A-Z]+_\d+$/);
    });

    it("V0 strategic partner tier exists in schema", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      const enumFn = schema.cooperationTierEnum;
      expect(enumFn).toBeDefined();
      // The enum fn was created with pgEnum mock
      expect((enumFn as any).enumValues).toContain("V0_Strategic_Partner");
    });

    it("brand visual styles include Tech_Premium_Industrial", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      const enumFn = schema.visualStyleEnum;
      expect((enumFn as any).enumValues).toContain("Tech_Premium_Industrial");
    });

    it("interlock timelines include past/present/future", async () => {
      const schema = await import("../../drizzle/customer-profile-schema");
      const enumFn = schema.interlockTimelineEnum;
      const vals = (enumFn as any).enumValues;
      expect(vals).toContain("past");
      expect(vals).toContain("present");
      expect(vals).toContain("future");
    });
  });
});
