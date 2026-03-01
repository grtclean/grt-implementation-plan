/**
 * Data Migration Router — Unit Tests
 * Tests 7 procedures: getStandardFields, analyzePayload, commitToSandbox,
 * listSandboxImports, wipeSandboxData, getSandboxStats
 *
 * This router uses in-memory state (sandboxStore), no DB.
 * Module-level state persists across tests: commitToSandbox modifies sandboxStore.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

const caller = () => createAuthenticatedCaller();

describe("data-migration router", () => {

  // ═══ getStandardFields ═══
  describe("getStandardFields", () => {
    it("returns 23 standard fields", async () => {
      const result = await caller().dataMigration.getStandardFields();
      expect(result.length).toBe(23);
      expect(result[0]).toHaveProperty("key");
      expect(result[0]).toHaveProperty("label");
      expect(result[0]).toHaveProperty("labelZh");
      expect(result[0]).toHaveProperty("type");
    });

    it("first field is customer_name", async () => {
      const result = await caller().dataMigration.getStandardFields();
      expect(result[0].key).toBe("customer_name");
      expect(result[0].labelZh).toBe("客户名称");
    });
  });

  // ═══ analyzePayload ═══
  describe("analyzePayload", () => {
    it("maps exact standard fields with confidence 1.0", async () => {
      const result = await caller().dataMigration.analyzePayload({
        data: [{ customer_name: "Acme Corp", order_number: "PO-001" }],
      });
      expect(result.totalRows).toBe(1);
      expect(result.fieldCount).toBe(2);
      expect(result.autoMappedCount).toBe(2);
      expect(result.unmappedCount).toBe(0);
      const custMapping = result.mappings.find((m: any) => m.sourceField === "customer_name");
      expect(custMapping!.confidence).toBe(1.0);
      expect(custMapping!.targetField).toBe("customer_name");
    });

    it("maps semantic aliases with high confidence", async () => {
      const result = await caller().dataMigration.analyzePayload({
        data: [{ CustName: "Test", Tel: "123456" }],
      });
      const custMapping = result.mappings.find((m: any) => m.sourceField === "CustName");
      expect(custMapping!.targetField).toBe("customer_name");
      expect(custMapping!.confidence).toBe(0.92);
      const telMapping = result.mappings.find((m: any) => m.sourceField === "Tel");
      expect(telMapping!.targetField).toBe("contact_phone");
    });

    it("marks unmapped fields", async () => {
      const result = await caller().dataMigration.analyzePayload({
        data: [{ xyz_custom_field: "value" }],
      });
      expect(result.unmappedCount).toBe(1);
      expect(result.mappings[0].targetField).toBe("__unmapped__");
      expect(result.mappings[0].confidence).toBe(0);
    });

    it("returns preview rows (max 5)", async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ customer_name: `Corp${i}` }));
      const result = await caller().dataMigration.analyzePayload({ data });
      expect(result.totalRows).toBe(10);
      expect(result.previewRows).toHaveLength(5);
    });

    it("handles substring matches", async () => {
      const result = await caller().dataMigration.analyzePayload({
        data: [{ ordernumberExtended: "PO-001" }],
      });
      // "ordernumber" contains "order_number" substring
      const mapping = result.mappings[0];
      expect(mapping.confidence).toBeGreaterThan(0);
    });

    it("rejects empty data array", async () => {
      await expect(caller().dataMigration.analyzePayload({
        data: [],
      })).rejects.toThrow();
    });
  });

  // ═══ commitToSandbox ═══
  describe("commitToSandbox", () => {
    it("stages data in sandbox", async () => {
      const result = await caller().dataMigration.commitToSandbox({
        data: [{ customer_name: "Test" }],
        fieldMappings: [{ sourceField: "customer_name", targetField: "customer_name", confidence: 1 }],
      });
      expect(result.success).toBe(true);
      expect(result.sandboxId).toMatch(/^SANDBOX-/);
      expect(result.recordCount).toBe(1);
    });

    it("increments sandbox ID", async () => {
      const r1 = await caller().dataMigration.commitToSandbox({
        data: [{ a: 1 }],
        fieldMappings: [],
      });
      const r2 = await caller().dataMigration.commitToSandbox({
        data: [{ b: 2 }],
        fieldMappings: [],
      });
      expect(r1.sandboxId).not.toBe(r2.sandboxId);
    });
  });

  // ═══ listSandboxImports ═══
  describe("listSandboxImports", () => {
    it("returns committed sandbox imports", async () => {
      const result = await caller().dataMigration.listSandboxImports();
      expect(Array.isArray(result)).toBe(true);
      // Should have entries from previous tests (module-level state persists)
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("importedAt");
      expect(result[0]).toHaveProperty("source");
      expect(result[0]).toHaveProperty("recordCount");
    });
  });

  // ═══ getSandboxStats ═══
  describe("getSandboxStats", () => {
    it("returns sandbox statistics", async () => {
      const result = await caller().dataMigration.getSandboxStats();
      expect(result).toHaveProperty("totalImports");
      expect(result).toHaveProperty("totalRecords");
      expect(result).toHaveProperty("sources");
      expect(result).toHaveProperty("lastImport");
      expect(result.totalImports).toBeGreaterThan(0);
    });
  });

  // ═══ wipeSandboxData ═══
  describe("wipeSandboxData", () => {
    it("rejects wrong confirmation phrase", async () => {
      await expect(caller().dataMigration.wipeSandboxData({
        confirmPhrase: "wrong" as any,
      })).rejects.toThrow();
    });

    it("wipes all sandbox data with correct phrase", async () => {
      // First commit some data
      await caller().dataMigration.commitToSandbox({
        data: [{ x: 1 }, { y: 2 }],
        fieldMappings: [],
      });
      const result = await caller().dataMigration.wipeSandboxData({
        confirmPhrase: "WIPE ALL TEST DATA",
      });
      expect(result.success).toBe(true);
      expect(result.deletedImports).toBeGreaterThan(0);

      // Verify store is empty
      const stats = await caller().dataMigration.getSandboxStats();
      expect(stats.totalImports).toBe(0);
      expect(stats.totalRecords).toBe(0);
      expect(stats.lastImport).toBeNull();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getStandardFields", async () => {
      await expect(createAnonymousCaller().dataMigration.getStandardFields()).rejects.toThrow();
    });
    it("rejects anonymous for analyzePayload", async () => {
      await expect(createAnonymousCaller().dataMigration.analyzePayload({
        data: [{ x: 1 }],
      })).rejects.toThrow();
    });
    it("rejects anonymous for commitToSandbox", async () => {
      await expect(createAnonymousCaller().dataMigration.commitToSandbox({
        data: [{ x: 1 }], fieldMappings: [],
      })).rejects.toThrow();
    });
    it("rejects anonymous for listSandboxImports", async () => {
      await expect(createAnonymousCaller().dataMigration.listSandboxImports()).rejects.toThrow();
    });
    it("rejects anonymous for wipeSandboxData", async () => {
      await expect(createAnonymousCaller().dataMigration.wipeSandboxData({
        confirmPhrase: "WIPE ALL TEST DATA",
      })).rejects.toThrow();
    });
    it("rejects anonymous for getSandboxStats", async () => {
      await expect(createAnonymousCaller().dataMigration.getSandboxStats()).rejects.toThrow();
    });
  });
});
