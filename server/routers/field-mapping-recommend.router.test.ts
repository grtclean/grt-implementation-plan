/**
 * Field Mapping Recommend Router — Unit Tests
 * Tests 2 procedures: getRecommendations, applyRecommendation
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

describe("field-mapping-recommend router", () => {
  describe("getRecommendations", () => {
    it("returns empty array", async () => {
      const result = await caller().fieldMappingRecommend.getRecommendations();
      expect(result).toEqual([]);
    });
    it("accepts optional params", async () => {
      const result = await caller().fieldMappingRecommend.getRecommendations({
        sourceFormat: "csv",
        targetFormat: "json",
        sourceFields: ["name", "email"],
        importType: "employee",
      });
      expect(result).toEqual([]);
    });
  });

  describe("applyRecommendation", () => {
    it("returns success with numeric id", async () => {
      const result = await caller().fieldMappingRecommend.applyRecommendation({ recommendationId: 1 });
      expect(result.success).toBe(true);
    });
    it("returns success with string id", async () => {
      const result = await caller().fieldMappingRecommend.applyRecommendation({ recommendationId: "rec-1" });
      expect(result.success).toBe(true);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for getRecommendations", async () => {
      await expect(createAnonymousCaller().fieldMappingRecommend.getRecommendations()).rejects.toThrow();
    });
    it("rejects anonymous for applyRecommendation", async () => {
      await expect(createAnonymousCaller().fieldMappingRecommend.applyRecommendation({ recommendationId: 1 })).rejects.toThrow();
    });
  });
});
