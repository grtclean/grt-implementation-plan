/**
 * Expense Report Scheduler Router — Unit Tests
 * Tests 18 procedures (all stub/static — no DB).
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

describe("expense-report-scheduler router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns empty list", async () => {
      const result = await caller().expenseReportScheduler.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns null", async () => {
      const result = await caller().expenseReportScheduler.getById({ id: "1" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.create({
        name: "Monthly Report",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      await expect(caller().expenseReportScheduler.create({
        name: "",
      })).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.update({
        id: "1", name: "Updated",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.delete({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getSchedules ═══
  describe("getSchedules", () => {
    it("returns empty array", async () => {
      const result = await caller().expenseReportScheduler.getSchedules();
      expect(result).toEqual([]);
    });
  });

  // ═══ createSchedule ═══
  describe("createSchedule", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.createSchedule({
        name: "Weekly", frequency: "weekly",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid frequency", async () => {
      await expect(caller().expenseReportScheduler.createSchedule({
        name: "X", frequency: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ updateSchedule ═══
  describe("updateSchedule", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.updateSchedule({
        scheduleId: "1", enabled: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ deleteSchedule ═══
  describe("deleteSchedule", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.deleteSchedule({ scheduleId: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ toggleSchedule ═══
  describe("toggleSchedule", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.toggleSchedule({
        scheduleId: "1", enabled: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ triggerNow ═══
  describe("triggerNow", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.triggerNow({ scheduleId: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getExecutionHistory ═══
  describe("getExecutionHistory", () => {
    it("returns empty array", async () => {
      const result = await caller().expenseReportScheduler.getExecutionHistory();
      expect(result).toEqual([]);
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns stats", async () => {
      const result = await caller().expenseReportScheduler.getStats();
      expect(result.totalSchedules).toBe(2);
      expect(result.successRate).toBe(95);
    });
  });

  // ═══ getSendHistory ═══
  describe("getSendHistory", () => {
    it("returns empty array", async () => {
      const result = await caller().expenseReportScheduler.getSendHistory({});
      expect(result).toEqual([]);
    });
  });

  // ═══ getSupportedOptions ═══
  describe("getSupportedOptions", () => {
    it("returns frequencies and options", async () => {
      const result = await caller().expenseReportScheduler.getSupportedOptions();
      expect(result.frequencies).toHaveLength(4);
      expect(result.comparisonTypes).toHaveLength(2);
      expect(result.dimensions).toHaveLength(3);
      expect(result.recipientTypes).toHaveLength(3);
    });
  });

  // ═══ addRecipient ═══
  describe("addRecipient", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.addRecipient({
        scheduleId: "1",
        recipient: { type: "email", target: "a@b.com" },
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ removeRecipient ═══
  describe("removeRecipient", () => {
    it("returns success", async () => {
      const result = await caller().expenseReportScheduler.removeRecipient({
        scheduleId: "1", recipientId: "r1",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ triggerSend ═══
  describe("triggerSend", () => {
    it("returns success with results", async () => {
      const result = await caller().expenseReportScheduler.triggerSend({ scheduleId: "1" });
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().expenseReportScheduler.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().expenseReportScheduler.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().expenseReportScheduler.create({ name: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().expenseReportScheduler.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for createSchedule", async () => {
      await expect(createAnonymousCaller().expenseReportScheduler.createSchedule({ name: "X", frequency: "daily" })).rejects.toThrow();
    });
    it("rejects anonymous for triggerSend", async () => {
      await expect(createAnonymousCaller().expenseReportScheduler.triggerSend({ scheduleId: "1" })).rejects.toThrow();
    });
  });
});
