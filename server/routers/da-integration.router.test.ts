/**
 * DA Integration Router — Unit Tests
 * Tests 3 procedures: getStatus, sync, getIntegrationStats
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

describe("da-integration router", () => {
  describe("getStatus", () => {
    it("returns ok status", async () => {
      const result = await caller().daIntegration.getStatus();
      expect(result.status).toBe("ok");
    });
  });

  describe("sync", () => {
    it("returns success", async () => {
      const result = await caller().daIntegration.sync();
      expect(result.success).toBe(true);
    });
  });

  describe("getIntegrationStats", () => {
    it("returns zero stats", async () => {
      const result = await caller().daIntegration.getIntegrationStats();
      expect(result.totalIntegrations).toBe(0);
      expect(result.activeIntegrations).toBe(0);
      expect(result.syncedRecords).toBe(0);
      expect(result.lastSyncTime).toBeNull();
    });

    it("accepts optional assistantType", async () => {
      const result = await caller().daIntegration.getIntegrationStats({ assistantType: "personal" });
      expect(result.totalIntegrations).toBe(0);
    });

    it("works with no input", async () => {
      const result = await caller().daIntegration.getIntegrationStats();
      expect(result).toBeTruthy();
    });
  });

  describe("authentication", () => {
    it("rejects anonymous for getStatus", async () => {
      await expect(createAnonymousCaller().daIntegration.getStatus()).rejects.toThrow();
    });
    it("rejects anonymous for sync", async () => {
      await expect(createAnonymousCaller().daIntegration.sync()).rejects.toThrow();
    });
    it("rejects anonymous for getIntegrationStats", async () => {
      await expect(createAnonymousCaller().daIntegration.getIntegrationStats()).rejects.toThrow();
    });
  });
});
