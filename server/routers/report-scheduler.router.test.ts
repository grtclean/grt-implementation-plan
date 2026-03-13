/**
 * Report Scheduler Router — Unit Tests
 * Tests 12 stub procedures: list, getById, create, update, delete,
 * getSchedules, updateSchedule, addRecipient, removeRecipient,
 * getHistory, triggerSend, previewReport
 *
 * All procedures are stubs returning static data (no DB access).
 */
import { describe, it, expect } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const caller = () => createAdminCaller();

describe("reportScheduler router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns empty list with pagination defaults", async () => {
      const result = await caller().reportScheduler.list();
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns null for any id", async () => {
      const result = await caller().reportScheduler.getById({ id: "abc-123" });
      expect(result).toBeNull();
    });

    it("returns null for another id", async () => {
      const result = await caller().reportScheduler.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("returns success with required fields only", async () => {
      const result = await caller().reportScheduler.create({
        name: "Daily Report",
        frequency: "daily",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success with all optional fields", async () => {
      const result = await caller().reportScheduler.create({
        name: "Weekly Summary",
        description: "A weekly summary report",
        frequency: "weekly",
        cronExpression: "0 9 * * 1",
        reportTypes: ["sales", "inventory"],
        enabled: true,
        recipients: [
          { type: "email", target: "user@example.com", name: "Test User" },
          { type: "webhook", target: "https://hook.example.com" },
        ],
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("accepts monthly frequency", async () => {
      const result = await caller().reportScheduler.create({
        name: "Monthly Report",
        frequency: "monthly",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name (min 1)", async () => {
      await expect(
        caller().reportScheduler.create({ name: "", frequency: "daily" })
      ).rejects.toThrow();
    });

    it("rejects name exceeding max length (200)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "x".repeat(201),
          frequency: "daily",
        })
      ).rejects.toThrow();
    });

    it("rejects invalid frequency enum", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "hourly" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects description exceeding max length (2000)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "daily",
          description: "x".repeat(2001),
        })
      ).rejects.toThrow();
    });

    it("rejects cronExpression exceeding max length (100)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "daily",
          cronExpression: "x".repeat(101),
        })
      ).rejects.toThrow();
    });

    it("rejects reportTypes item exceeding max length (50)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "daily",
          reportTypes: ["x".repeat(51)],
        })
      ).rejects.toThrow();
    });

    it("rejects recipient type exceeding max length (50)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "daily",
          recipients: [{ type: "x".repeat(51), target: "a@b.com" }],
        })
      ).rejects.toThrow();
    });

    it("rejects recipient target exceeding max length (500)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "daily",
          recipients: [{ type: "email", target: "x".repeat(501) }],
        })
      ).rejects.toThrow();
    });

    it("rejects recipient name exceeding max length (200)", async () => {
      await expect(
        caller().reportScheduler.create({
          name: "Report",
          frequency: "daily",
          recipients: [{ type: "email", target: "a@b.com", name: "x".repeat(201) }],
        })
      ).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("returns success with id only", async () => {
      const result = await caller().reportScheduler.update({ id: "sched-1" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success with all optional fields", async () => {
      const result = await caller().reportScheduler.update({
        id: "sched-1",
        name: "Updated Name",
        description: "Updated desc",
        frequency: "monthly",
        cronExpression: "0 0 1 * *",
        reportTypes: ["finance"],
        enabled: false,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("rejects empty name (min 1)", async () => {
      await expect(
        caller().reportScheduler.update({ id: "sched-1", name: "" })
      ).rejects.toThrow();
    });

    it("rejects invalid frequency enum", async () => {
      await expect(
        caller().reportScheduler.update({ id: "sched-1", frequency: "yearly" as any })
      ).rejects.toThrow();
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("returns success for any id", async () => {
      const result = await caller().reportScheduler.delete({ id: "sched-1" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  // ═══ getSchedules ═══
  describe("getSchedules", () => {
    it("returns empty array", async () => {
      const result = await caller().reportScheduler.getSchedules();
      expect(result).toEqual([]);
    });
  });

  // ═══ updateSchedule ═══
  describe("updateSchedule", () => {
    it("returns success with scheduleId only", async () => {
      const result = await caller().reportScheduler.updateSchedule({
        scheduleId: "s-1",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success with all optional fields", async () => {
      const result = await caller().reportScheduler.updateSchedule({
        scheduleId: "s-1",
        enabled: true,
        cronExpression: "0 8 * * *",
        name: "Morning Report",
        description: "Every morning at 8",
        frequency: "daily",
        reportTypes: ["ops"],
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("rejects empty name (min 1)", async () => {
      await expect(
        caller().reportScheduler.updateSchedule({ scheduleId: "s-1", name: "" })
      ).rejects.toThrow();
    });

    it("rejects invalid frequency enum", async () => {
      await expect(
        caller().reportScheduler.updateSchedule({
          scheduleId: "s-1",
          frequency: "biweekly" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ═══ addRecipient ═══
  describe("addRecipient", () => {
    it("returns success with required fields", async () => {
      const result = await caller().reportScheduler.addRecipient({
        scheduleId: "s-1",
        type: "email",
        target: "user@example.com",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success with optional name", async () => {
      const result = await caller().reportScheduler.addRecipient({
        scheduleId: "s-1",
        type: "sms",
        target: "+1234567890",
        name: "John Doe",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("rejects type exceeding max length (50)", async () => {
      await expect(
        caller().reportScheduler.addRecipient({
          scheduleId: "s-1",
          type: "x".repeat(51),
          target: "user@example.com",
        })
      ).rejects.toThrow();
    });

    it("rejects target exceeding max length (500)", async () => {
      await expect(
        caller().reportScheduler.addRecipient({
          scheduleId: "s-1",
          type: "email",
          target: "x".repeat(501),
        })
      ).rejects.toThrow();
    });

    it("rejects name exceeding max length (200)", async () => {
      await expect(
        caller().reportScheduler.addRecipient({
          scheduleId: "s-1",
          type: "email",
          target: "user@example.com",
          name: "x".repeat(201),
        })
      ).rejects.toThrow();
    });
  });

  // ═══ removeRecipient ═══
  describe("removeRecipient", () => {
    it("returns success", async () => {
      const result = await caller().reportScheduler.removeRecipient({
        scheduleId: "s-1",
        target: "user@example.com",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("rejects target exceeding max length (500)", async () => {
      await expect(
        caller().reportScheduler.removeRecipient({
          scheduleId: "s-1",
          target: "x".repeat(501),
        })
      ).rejects.toThrow();
    });
  });

  // ═══ getHistory ═══
  describe("getHistory", () => {
    it("returns empty array", async () => {
      const result = await caller().reportScheduler.getHistory();
      expect(result).toEqual([]);
    });
  });

  // ═══ triggerSend ═══
  describe("triggerSend", () => {
    it("returns success", async () => {
      const result = await caller().reportScheduler.triggerSend({
        scheduleId: "s-1",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  // ═══ previewReport ═══
  describe("previewReport", () => {
    it("returns empty preview string", async () => {
      const result = await caller().reportScheduler.previewReport({
        reportTypes: ["sales"],
        period: "2026-01",
      });
      expect(result).toEqual({ preview: "" });
    });

    it("accepts multiple report types and optional format", async () => {
      const result = await caller().reportScheduler.previewReport({
        reportTypes: ["sales", "inventory", "finance"],
        period: "2026-Q1",
        format: "pdf",
      });
      expect(result).toEqual({ preview: "" });
    });

    it("rejects period exceeding max length (50)", async () => {
      await expect(
        caller().reportScheduler.previewReport({
          reportTypes: ["sales"],
          period: "x".repeat(51),
        })
      ).rejects.toThrow();
    });

    it("rejects format exceeding max length (50)", async () => {
      await expect(
        caller().reportScheduler.previewReport({
          reportTypes: ["sales"],
          period: "2026-01",
          format: "x".repeat(51),
        })
      ).rejects.toThrow();
    });

    it("rejects reportTypes item exceeding max length (50)", async () => {
      await expect(
        caller().reportScheduler.previewReport({
          reportTypes: ["x".repeat(51)],
          period: "2026-01",
        })
      ).rejects.toThrow();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().reportScheduler.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.getById({ id: "1" })
      ).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.create({
          name: "Test",
          frequency: "daily",
        })
      ).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.update({ id: "1" })
      ).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.delete({ id: "1" })
      ).rejects.toThrow();
    });
    it("rejects anonymous for getSchedules", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.getSchedules()
      ).rejects.toThrow();
    });
    it("rejects anonymous for updateSchedule", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.updateSchedule({ scheduleId: "1" })
      ).rejects.toThrow();
    });
    it("rejects anonymous for addRecipient", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.addRecipient({
          scheduleId: "1",
          type: "email",
          target: "a@b.com",
        })
      ).rejects.toThrow();
    });
    it("rejects anonymous for removeRecipient", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.removeRecipient({
          scheduleId: "1",
          target: "a@b.com",
        })
      ).rejects.toThrow();
    });
    it("rejects anonymous for getHistory", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.getHistory()
      ).rejects.toThrow();
    });
    it("rejects anonymous for triggerSend", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.triggerSend({ scheduleId: "1" })
      ).rejects.toThrow();
    });
    it("rejects anonymous for previewReport", async () => {
      await expect(
        createAnonymousCaller().reportScheduler.previewReport({
          reportTypes: ["sales"],
          period: "2026-01",
        })
      ).rejects.toThrow();
    });
  });
});
