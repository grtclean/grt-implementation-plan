/**
 * Expense Forecast Router — Unit Tests
 * Tests 3 procedures: list, getForecast, generateForecast
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

describe("expense-forecast router", () => {
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().expenseForecast.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getForecast", () => {
    it("returns empty array", async () => {
      const result = await caller().expenseForecast.getForecast();
      expect(result).toEqual([]);
    });
    it("accepts date filters", async () => {
      const result = await caller().expenseForecast.getForecast({ startDate: "2026-01-01", endDate: "2026-12-31", category: "travel" });
      expect(result).toEqual([]);
    });
  });

  describe("generateForecast", () => {
    it("returns empty array", async () => {
      const result = await caller().expenseForecast.generateForecast();
      expect(result).toEqual([]);
    });
    it("accepts date filters", async () => {
      const result = await caller().expenseForecast.generateForecast({ startDate: "2026-01-01", category: "office" });
      expect(result).toEqual([]);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().expenseForecast.list()).rejects.toThrow();
    });
    it("rejects anonymous for getForecast", async () => {
      await expect(createAnonymousCaller().expenseForecast.getForecast()).rejects.toThrow();
    });
    it("rejects anonymous for generateForecast", async () => {
      await expect(createAnonymousCaller().expenseForecast.generateForecast()).rejects.toThrow();
    });
  });
});
