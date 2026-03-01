/**
 * Feedback Router — Unit Tests
 * Tests 3 procedures: list, create, submit
 *
 * DB-backed with feedback table.
 * create and submit have identical logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => ({
  selectResultsQueue: [] as any[][],
  returningQueue: [] as any[][],
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      values: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleFeedback = {
  id: 1,
  userId: 1,
  type: "suggestion",
  content: "希望增加深色模式",
  status: "pending",
  createdAt: "2026-03-01T00:00:00.000Z",
};

describe("feedback router", () => {

  describe("list", () => {
    it("returns feedback items", async () => {
      selectResultsQueue.push([sampleFeedback, { ...sampleFeedback, id: 2, type: "bug" }]);
      const result = await caller().feedback.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("returns empty when no feedback", async () => {
      selectResultsQueue.push([]);
      const result = await caller().feedback.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("create", () => {
    it("creates feedback with all fields", async () => {
      returningQueue.push([{ ...sampleFeedback, id: 10 }]);
      const result = await caller().feedback.create({
        type: "bug",
        content: "登录页面报错",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("已提交");
    });

    it("creates feedback with defaults", async () => {
      returningQueue.push([{ ...sampleFeedback, id: 11 }]);
      const result = await caller().feedback.create({});
      expect(result.success).toBe(true);
    });

    it("validates type enum", async () => {
      await expect(caller().feedback.create({ type: "invalid" as any })).rejects.toThrow();
    });
  });

  describe("submit", () => {
    it("submits feedback", async () => {
      returningQueue.push([{ ...sampleFeedback, id: 20 }]);
      const result = await caller().feedback.submit({
        type: "other",
        content: "一般建议",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("已提交");
    });

    it("submits feedback with defaults", async () => {
      returningQueue.push([{ ...sampleFeedback, id: 21 }]);
      const result = await caller().feedback.submit({});
      expect(result.success).toBe(true);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().feedback.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().feedback.create({})).rejects.toThrow();
    });
    it("rejects anonymous for submit", async () => {
      await expect(createAnonymousCaller().feedback.submit({})).rejects.toThrow();
    });
  });
});
