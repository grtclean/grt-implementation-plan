/**
 * Expense Comparison Export Router — Unit Tests
 * Tests 2 procedures: export, exportReport
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

describe("expense-comparison-export router", () => {
  describe("export", () => {
    it("returns empty url", async () => {
      const result = await caller().expenseComparisonExport.export();
      expect(result.url).toBe("");
    });
    it("accepts date filters", async () => {
      const result = await caller().expenseComparisonExport.export({ startDate: "2026-01-01", endDate: "2026-12-31", format: "xlsx" });
      expect(result.url).toBe("");
    });
  });

  describe("exportReport", () => {
    it("returns empty report data", async () => {
      const result = await caller().expenseComparisonExport.exportReport();
      expect(result.data).toBe("");
      expect(result.mimeType).toBe("application/octet-stream");
      expect(result.filename).toBe("expense-comparison.xlsx");
    });
    it("accepts date filters", async () => {
      const result = await caller().expenseComparisonExport.exportReport({ startDate: "2026-01-01", format: "pdf" });
      expect(result.data).toBe("");
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for export", async () => {
      await expect(createAnonymousCaller().expenseComparisonExport.export()).rejects.toThrow();
    });
    it("rejects anonymous for exportReport", async () => {
      await expect(createAnonymousCaller().expenseComparisonExport.exportReport()).rejects.toThrow();
    });
  });
});
