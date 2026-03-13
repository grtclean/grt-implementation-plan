/**
 * Field Mapping Router — Unit Tests
 * Tests 8 procedures: list, getById, create, update, delete,
 *   getMappings, saveMappings, getRecommendations
 *
 * All stubs returning static responses. No DB access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => { vi.clearAllMocks(); });
const caller = () => createAdminCaller();

describe("field-mapping router", () => {
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().fieldMapping.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().fieldMapping.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("returns success", async () => {
      const result = await caller().fieldMapping.create({ sourceField: "name", targetField: "姓名" });
      expect(result.success).toBe(true);
    });
    it("accepts optional transformRule", async () => {
      const result = await caller().fieldMapping.create({ sourceField: "date", targetField: "日期", transformRule: "YYYY-MM-DD" });
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().fieldMapping.update({ id: "1", sourceField: "updated" });
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().fieldMapping.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  describe("getMappings", () => {
    it("returns empty array", async () => {
      const result = await caller().fieldMapping.getMappings();
      expect(result).toEqual([]);
    });
  });

  describe("saveMappings", () => {
    it("returns success", async () => {
      const result = await caller().fieldMapping.saveMappings({
        mappings: [
          { sourceField: "name", targetField: "姓名" },
          { sourceField: "email", targetField: "邮箱", transformRule: "toLowerCase" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("getRecommendations", () => {
    it("returns empty array", async () => {
      const result = await caller().fieldMapping.getRecommendations();
      expect(result).toEqual([]);
    });
    it("accepts optional params", async () => {
      const result = await caller().fieldMapping.getRecommendations({ sourceFormat: "csv", targetFormat: "xlsx" });
      expect(result).toEqual([]);
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().fieldMapping.list()).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().fieldMapping.create({ sourceField: "x", targetField: "y" })).rejects.toThrow();
    });
    it("rejects anonymous for saveMappings", async () => {
      await expect(createAnonymousCaller().fieldMapping.saveMappings({ mappings: [] })).rejects.toThrow();
    });
  });
});
