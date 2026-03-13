/**
 * Users Router — Unit Tests
 * Tests 2 procedures: getAll, search
 *
 * Uses requirePermission('system:users:view') — needs admin caller.
 * search does client-side filtering on name/email/openId.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
}));

const { mockCheckPermission } = vi.hoisted(() => ({
  mockCheckPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: mockCheckPermission,
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  ilike: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

const adminCaller = () => createAdminCaller();

const sampleUsers = [
  { id: 1, name: "张三", email: "z3@test.com", openId: "wx-001", role: "employee" },
  { id: 2, name: "李四", email: "l4@test.com", openId: "wx-002", role: "admin" },
  { id: 3, name: "王五", email: "w5@test.com", openId: null, role: "employee" },
];

describe("users router", () => {

  describe("getAll", () => {
    it("returns all users (admin)", async () => {
      selectResultsQueue.push(sampleUsers);
      const result = await adminCaller().users.getAll();
      expect(result).toHaveLength(3);
    });

    it("returns empty when no users", async () => {
      selectResultsQueue.push([]);
      const result = await adminCaller().users.getAll();
      expect(result).toEqual([]);
    });

    it("rejects non-admin user", async () => {
      mockCheckPermission.mockResolvedValueOnce(false);
      await expect(createAuthenticatedCaller().users.getAll()).rejects.toThrow();
    });
  });

  describe("search", () => {
    it("searches by name", async () => {
      selectResultsQueue.push(sampleUsers);
      const result = await adminCaller().users.search({ query: "张三" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("张三");
    });

    it("searches by email", async () => {
      selectResultsQueue.push(sampleUsers);
      const result = await adminCaller().users.search({ query: "l4@test" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("李四");
    });

    it("searches by openId", async () => {
      selectResultsQueue.push(sampleUsers);
      const result = await adminCaller().users.search({ query: "wx-001" });
      expect(result).toHaveLength(1);
    });

    it("returns empty when no matches", async () => {
      selectResultsQueue.push(sampleUsers);
      const result = await adminCaller().users.search({ query: "不存在" });
      expect(result).toEqual([]);
    });

    it("is case insensitive", async () => {
      selectResultsQueue.push(sampleUsers);
      const result = await adminCaller().users.search({ query: "Z3@TEST" });
      expect(result).toHaveLength(1);
    });

    it("rejects non-admin user", async () => {
      mockCheckPermission.mockResolvedValueOnce(false);
      await expect(createAuthenticatedCaller().users.search({ query: "test" })).rejects.toThrow();
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for getAll", async () => {
      await expect(createAnonymousCaller().users.getAll()).rejects.toThrow();
    });
    it("rejects anonymous for search", async () => {
      await expect(createAnonymousCaller().users.search({ query: "test" })).rejects.toThrow();
    });
  });
});
