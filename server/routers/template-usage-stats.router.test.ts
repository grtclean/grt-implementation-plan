/**
 * Template Usage Stats Router — Unit Tests
 * Tests 7 procedures: list, getSummary, getTrends, getPopularity,
 *   getUserActivity, getHourlyDistribution, getReportTypeDistribution
 *
 * All stubs returning static responses. No DB access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => { vi.clearAllMocks(); });
const caller = () => createAuthenticatedCaller();

describe("template-usage-stats router", () => {
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().templateUsageStats.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("returns empty summary", async () => {
      const result = await caller().templateUsageStats.getSummary();
      expect(result.summary).toEqual({});
    });
  });

  describe("getTrends", () => {
    it("returns empty array", async () => {
      const result = await caller().templateUsageStats.getTrends();
      expect(result).toEqual([]);
    });
  });

  describe("getPopularity", () => {
    it("returns empty array", async () => {
      const result = await caller().templateUsageStats.getPopularity();
      expect(result).toEqual([]);
    });
  });

  describe("getUserActivity", () => {
    it("returns empty array", async () => {
      const result = await caller().templateUsageStats.getUserActivity();
      expect(result).toEqual([]);
    });
  });

  describe("getHourlyDistribution", () => {
    it("returns empty array", async () => {
      const result = await caller().templateUsageStats.getHourlyDistribution();
      expect(result).toEqual([]);
    });
  });

  describe("getReportTypeDistribution", () => {
    it("returns empty array", async () => {
      const result = await caller().templateUsageStats.getReportTypeDistribution();
      expect(result).toEqual([]);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().templateUsageStats.list()).rejects.toThrow();
    });
    it("rejects anonymous for getSummary", async () => {
      await expect(createAnonymousCaller().templateUsageStats.getSummary()).rejects.toThrow();
    });
    it("rejects anonymous for getTrends", async () => {
      await expect(createAnonymousCaller().templateUsageStats.getTrends()).rejects.toThrow();
    });
    it("rejects anonymous for getPopularity", async () => {
      await expect(createAnonymousCaller().templateUsageStats.getPopularity()).rejects.toThrow();
    });
  });
});
