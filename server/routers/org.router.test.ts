/**
 * Organization Tree Router — Unit Tests
 * Tests 3 procedures: getDepartments, getEmployees, getOrgTree
 *
 * Uses db.execute(sql`...`) for raw SQL queries.
 * getOrgTree does 2 sequential execute calls (departments + employees).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { executeResults } = vi.hoisted(() => ({
  executeResults: [] as any[],
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
    }),
  })),
}));

vi.mock("drizzle-orm", () => ({
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
});

const caller = () => createAdminCaller();

const sampleDepts = [
  { id: 1, name: "技术部", name_en: "Engineering", parent_id: null, bu_code: "BU1", sort_order: 1, head_employee_id: 10, is_active: true },
  { id: 2, name: "生产部", name_en: "Manufacturing", parent_id: null, bu_code: "BU1", sort_order: 2, head_employee_id: 20, is_active: true },
];

const sampleEmps = [
  { id: 1, employee_id: "EMP-001", name: "张三", department: "技术部", position: "工程师", bu_code: "BU1", email: "z3@test.com", phone: "138", status: "active" },
  { id: 2, employee_id: "EMP-002", name: "李四", department: "生产部", position: "操作工", bu_code: "BU1", email: "l4@test.com", phone: "139", status: "active" },
];

describe("org router", () => {

  describe("getDepartments", () => {
    it("returns departments", async () => {
      executeResults.push({ rows: sampleDepts });
      const result = await caller().org.getDepartments();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("技术部");
    });

    it("returns empty when no departments", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().org.getDepartments();
      expect(result).toEqual([]);
    });
  });

  describe("getEmployees", () => {
    it("returns employees", async () => {
      executeResults.push({ rows: sampleEmps });
      const result = await caller().org.getEmployees();
      expect(result).toHaveLength(2);
    });

    it("returns empty when no employees", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().org.getEmployees();
      expect(result).toEqual([]);
    });
  });

  describe("getOrgTree", () => {
    it("returns departments and employees with summary", async () => {
      executeResults.push({ rows: sampleDepts });  // departments
      executeResults.push({ rows: sampleEmps });    // employees
      const result = await caller().org.getOrgTree();
      expect(result.departments).toHaveLength(2);
      expect(result.employees).toHaveLength(2);
      expect(result.summary.totalDepartments).toBe(2);
      expect(result.summary.totalEmployees).toBe(2);
    });

    it("returns zeros when empty", async () => {
      executeResults.push({ rows: [] });
      executeResults.push({ rows: [] });
      const result = await caller().org.getOrgTree();
      expect(result.summary.totalDepartments).toBe(0);
      expect(result.summary.totalEmployees).toBe(0);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for getDepartments", async () => {
      await expect(createAnonymousCaller().org.getDepartments()).rejects.toThrow();
    });
    it("rejects anonymous for getEmployees", async () => {
      await expect(createAnonymousCaller().org.getEmployees()).rejects.toThrow();
    });
    it("rejects anonymous for getOrgTree", async () => {
      await expect(createAnonymousCaller().org.getOrgTree()).rejects.toThrow();
    });
  });
});
