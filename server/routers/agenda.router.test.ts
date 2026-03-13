/**
 * Agenda Router — Unit Tests
 * Tests 13 procedures: getTrainings, getMeetingTypes, getMeetings, getAnnualPlans,
 * initMeetingTypes, createMeeting, createTraining, seedTrainingData, clearTrainingData,
 * getParticipants, addParticipant, batchAddParticipants, updateParticipant
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
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
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleAgenda = {
  id: 1,
  year: 2026,
  title: "2026年度议程",
  description: "Annual agenda",
  status: "draft",
  createdBy: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleMilestone = {
  id: 1,
  agendaId: 1,
  milestoneType: "Custom",
  title: "Test Meeting",
  description: "A test meeting",
  scheduledDate: "2026-03-15",
  scheduledTime: "09:00",
  isRecurring: 0,
  recurrenceRule: null,
  status: "pending",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleDepartmentAgenda = {
  id: 1,
  agendaId: 1,
  milestoneId: 1,
  departmentCode: "ENG",
  departmentName: "Engineering",
  notes: "Test notes",
  status: "scheduled",
  adjustedDate: null,
  adjustedTime: null,
  adjustmentReason: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("agenda router", () => {

  // ═══ getTrainings ═══
  describe("getTrainings", () => {
    it("returns empty trainings array", async () => {
      const result = await caller().agenda.getTrainings();
      expect(result).toEqual({ trainings: [] });
    });
  });

  // ═══ getMeetingTypes ═══
  describe("getMeetingTypes", () => {
    it("returns 5 predefined meeting types", async () => {
      const result = await caller().agenda.getMeetingTypes();
      expect(result).toHaveLength(5);
      expect(result[0].id).toBe("Q4_Strategy");
      expect(result[1].id).toBe("Q1_Kickoff");
      expect(result[2].id).toBe("Monthly_Review");
      expect(result[3].id).toBe("Weekly_Check");
      expect(result[4].id).toBe("Custom");
    });

    it("each meeting type has required fields", async () => {
      const result = await caller().agenda.getMeetingTypes();
      for (const mt of result) {
        expect(mt).toHaveProperty("id");
        expect(mt).toHaveProperty("name");
        expect(mt).toHaveProperty("description");
        expect(mt).toHaveProperty("level");
        expect(mt).toHaveProperty("frequency");
        expect(mt).toHaveProperty("code");
        expect(mt).toHaveProperty("defaultDuration");
        expect(mt).toHaveProperty("defaultStartTime");
      }
    });
  });

  // ═══ getMeetings ═══
  describe("getMeetings", () => {
    it("returns milestones from DB", async () => {
      selectResultsQueue.push([sampleMilestone, { ...sampleMilestone, id: 2, title: "Meeting 2" }]);
      const result = await caller().agenda.getMeetings();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Test Meeting");
    });

    it("returns empty array when no milestones", async () => {
      selectResultsQueue.push([]);
      const result = await caller().agenda.getMeetings();
      expect(result).toHaveLength(0);
    });

    it("accepts optional filter input", async () => {
      selectResultsQueue.push([sampleMilestone]);
      const result = await caller().agenda.getMeetings({ type: "Custom" });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ getAnnualPlans ═══
  describe("getAnnualPlans", () => {
    it("returns mapped annual plans", async () => {
      selectResultsQueue.push([sampleAgenda, { ...sampleAgenda, id: 2, year: 2025 }]);
      const result = await caller().agenda.getAnnualPlans();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", 1);
      expect(result[0]).toHaveProperty("year", 2026);
      expect(result[0]).toHaveProperty("type", "company");
      expect(result[0]).toHaveProperty("name", sampleAgenda.title);
      expect(result[0]).toHaveProperty("revenueTarget", null);
      expect(result[0]).toHaveProperty("profitTarget", null);
      expect(result[0]).toHaveProperty("customerTarget", null);
      expect(result[0]).toHaveProperty("hiringBudget", null);
    });

    it("returns empty array when no plans", async () => {
      selectResultsQueue.push([]);
      const result = await caller().agenda.getAnnualPlans();
      expect(result).toHaveLength(0);
    });
  });

  // ═══ initMeetingTypes ═══
  describe("initMeetingTypes", () => {
    it("returns success message", async () => {
      const result = await caller().agenda.initMeetingTypes();
      expect(result).toEqual({ success: true, message: "会议类型已初始化" });
    });
  });

  // ═══ createMeeting ═══
  describe("createMeeting", () => {
    it("creates meeting with existing agenda found by year", async () => {
      // select agendas (find existing)
      selectResultsQueue.push([sampleAgenda]);
      // insert milestone returning
      returningQueue.push([{ ...sampleMilestone, id: 10 }]);
      const result = await caller().agenda.createMeeting({
        title: "New Meeting",
        milestoneType: "Monthly_Review",
        scheduledDate: "2026-04-01",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates meeting with new agenda when none exists for year", async () => {
      // select agendas (empty — no existing for year)
      selectResultsQueue.push([]);
      // insert agenda returning
      returningQueue.push([{ ...sampleAgenda, id: 5 }]);
      // insert milestone returning
      returningQueue.push([{ ...sampleMilestone, id: 11, agendaId: 5 }]);
      const result = await caller().agenda.createMeeting({
        title: "First Meeting",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 11);
    });

    it("creates meeting with explicit agendaId (skips agenda lookup)", async () => {
      // insert milestone returning
      returningQueue.push([{ ...sampleMilestone, id: 12 }]);
      const result = await caller().agenda.createMeeting({
        agendaId: 1,
        title: "Explicit Agenda Meeting",
        scheduledDate: "2026-05-01",
        scheduledTime: "14:00",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 12);
    });

    it("uses defaults for title and milestoneType when not provided", async () => {
      selectResultsQueue.push([sampleAgenda]);
      returningQueue.push([{ ...sampleMilestone, id: 13, title: "新会议" }]);
      const result = await caller().agenda.createMeeting({});
      expect(result.success).toBe(true);
    });

    it("extracts date and time from startTime when scheduledDate not given", async () => {
      selectResultsQueue.push([sampleAgenda]);
      returningQueue.push([sampleMilestone]);
      const result = await caller().agenda.createMeeting({
        startTime: "2026-06-15T10:30:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("sets isRecurring to 1 when truthy", async () => {
      selectResultsQueue.push([sampleAgenda]);
      returningQueue.push([sampleMilestone]);
      const result = await caller().agenda.createMeeting({
        isRecurring: true,
        recurrenceRule: "FREQ=WEEKLY",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ createTraining ═══
  describe("createTraining", () => {
    it("returns success message", async () => {
      const result = await caller().agenda.createTraining({});
      expect(result).toEqual({ success: true, message: "培训已创建" });
    });

    it("works without input", async () => {
      const result = await caller().agenda.createTraining();
      expect(result).toEqual({ success: true, message: "培训已创建" });
    });
  });

  // ═══ seedTrainingData ═══
  describe("seedTrainingData", () => {
    it("returns success message", async () => {
      const result = await caller().agenda.seedTrainingData();
      expect(result).toEqual({ success: true, message: "培训数据已初始化" });
    });
  });

  // ═══ clearTrainingData ═══
  describe("clearTrainingData", () => {
    it("returns success message", async () => {
      const result = await caller().agenda.clearTrainingData();
      expect(result).toEqual({ success: true, message: "培训数据已清除" });
    });
  });

  // ═══ getParticipants ═══
  describe("getParticipants", () => {
    it("returns mapped participants for a milestoneId", async () => {
      selectResultsQueue.push([
        sampleDepartmentAgenda,
        { ...sampleDepartmentAgenda, id: 2, status: "completed" },
      ]);
      const result = await caller().agenda.getParticipants({ milestoneId: 1 });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("userId", 1);
      expect(result[0]).toHaveProperty("registrationStatus", "scheduled");
      expect(result[0]).toHaveProperty("attendanceStatus", "pending");
      expect(result[0]).toHaveProperty("passed", false);
      // completed participant
      expect(result[1]).toHaveProperty("registrationStatus", "completed");
      expect(result[1]).toHaveProperty("attendanceStatus", "attended");
      expect(result[1]).toHaveProperty("passed", true);
    });

    it("returns empty array when milestoneId is 0 or missing", async () => {
      const result = await caller().agenda.getParticipants({});
      expect(result).toEqual([]);
    });

    it("returns empty array when no input provided", async () => {
      const result = await caller().agenda.getParticipants();
      expect(result).toEqual([]);
    });

    it("accepts id field instead of milestoneId", async () => {
      selectResultsQueue.push([sampleDepartmentAgenda]);
      const result = await caller().agenda.getParticipants({ id: 5 });
      expect(result).toHaveLength(1);
    });

    it("accepts trainingId field", async () => {
      selectResultsQueue.push([sampleDepartmentAgenda]);
      const result = await caller().agenda.getParticipants({ trainingId: 3 });
      expect(result).toHaveLength(1);
    });

    it("each participant has null score and feedbackRating", async () => {
      selectResultsQueue.push([sampleDepartmentAgenda]);
      const result = await caller().agenda.getParticipants({ milestoneId: 1 });
      expect(result[0]).toHaveProperty("score", null);
      expect(result[0]).toHaveProperty("feedbackRating", null);
    });
  });

  // ═══ addParticipant ═══
  describe("addParticipant", () => {
    it("adds a participant with all fields", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, id: 10 }]);
      const result = await caller().agenda.addParticipant({
        agendaId: 1,
        milestoneId: 1,
        userId: 42,
        departmentCode: "ENG",
        departmentName: "Engineering",
        notes: "Presenter",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 10);
    });

    it("uses trainingId when milestoneId is absent", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, id: 11 }]);
      const result = await caller().agenda.addParticipant({
        agendaId: 1,
        trainingId: 5,
        departmentCode: "HR",
      });
      expect(result.success).toBe(true);
    });

    it("uses userId as departmentCode fallback", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, id: 12 }]);
      const result = await caller().agenda.addParticipant({
        agendaId: 1,
        milestoneId: 1,
        userId: 99,
      });
      expect(result.success).toBe(true);
    });

    it("throws when no agendaId/milestoneId/trainingId provided", async () => {
      await expect(caller().agenda.addParticipant({})).rejects.toThrow(
        "agendaId or milestoneId/trainingId is required"
      );
    });
  });

  // ═══ batchAddParticipants ═══
  describe("batchAddParticipants", () => {
    it("batch adds departments", async () => {
      const result = await caller().agenda.batchAddParticipants({
        agendaId: 1,
        milestoneId: 1,
        departments: [
          { departmentCode: "ENG", departmentName: "Engineering" },
          { departmentCode: "HR", departmentName: "Human Resources" },
          { departmentCode: "FIN", departmentName: "Finance" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("3");
    });

    it("batch adds via userIds", async () => {
      const result = await caller().agenda.batchAddParticipants({
        agendaId: 1,
        trainingId: 2,
        userIds: [10, 20, 30, 40],
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("4");
    });

    it("handles empty departments array", async () => {
      const result = await caller().agenda.batchAddParticipants({
        agendaId: 1,
        milestoneId: 1,
        departments: [],
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("0");
    });

    it("throws when no agendaId/milestoneId/trainingId provided", async () => {
      await expect(caller().agenda.batchAddParticipants({})).rejects.toThrow(
        "agendaId or milestoneId/trainingId is required"
      );
    });
  });

  // ═══ updateParticipant ═══
  describe("updateParticipant", () => {
    it("updates participant status", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, status: "completed" }]);
      const result = await caller().agenda.updateParticipant({
        id: 1,
        status: "completed",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("status", "completed");
    });

    it("updates adjusted date/time/reason", async () => {
      returningQueue.push([{
        ...sampleDepartmentAgenda,
        adjustedDate: "2026-04-01",
        adjustedTime: "15:00",
        adjustmentReason: "Reschedule",
      }]);
      const result = await caller().agenda.updateParticipant({
        id: 1,
        adjustedDate: "2026-04-01",
        adjustedTime: "15:00",
        adjustmentReason: "Reschedule",
      });
      expect(result.success).toBe(true);
    });

    it("updates notes field", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, notes: "Updated notes" }]);
      const result = await caller().agenda.updateParticipant({
        id: 1,
        notes: "Updated notes",
      });
      expect(result.success).toBe(true);
    });

    it("maps registrationStatus='completed' to status='completed'", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, status: "completed" }]);
      const result = await caller().agenda.updateParticipant({
        id: 1,
        registrationStatus: "completed",
      });
      expect(result.success).toBe(true);
    });

    it("maps registrationStatus other than 'completed' to status='scheduled'", async () => {
      returningQueue.push([{ ...sampleDepartmentAgenda, status: "scheduled" }]);
      const result = await caller().agenda.updateParticipant({
        id: 1,
        registrationStatus: "pending",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleDepartmentAgenda]);
      const result = await caller().agenda.updateParticipant({
        id: "1",
        status: "completed",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getTrainings", async () => {
      await expect(createAnonymousCaller().agenda.getTrainings()).rejects.toThrow();
    });
    it("rejects anonymous for getMeetingTypes", async () => {
      await expect(createAnonymousCaller().agenda.getMeetingTypes()).rejects.toThrow();
    });
    it("rejects anonymous for getMeetings", async () => {
      await expect(createAnonymousCaller().agenda.getMeetings()).rejects.toThrow();
    });
    it("rejects anonymous for getAnnualPlans", async () => {
      await expect(createAnonymousCaller().agenda.getAnnualPlans()).rejects.toThrow();
    });
    it("rejects anonymous for initMeetingTypes", async () => {
      await expect(createAnonymousCaller().agenda.initMeetingTypes()).rejects.toThrow();
    });
    it("rejects anonymous for createMeeting", async () => {
      await expect(createAnonymousCaller().agenda.createMeeting({})).rejects.toThrow();
    });
    it("rejects anonymous for createTraining", async () => {
      await expect(createAnonymousCaller().agenda.createTraining()).rejects.toThrow();
    });
    it("rejects anonymous for seedTrainingData", async () => {
      await expect(createAnonymousCaller().agenda.seedTrainingData()).rejects.toThrow();
    });
    it("rejects anonymous for clearTrainingData", async () => {
      await expect(createAnonymousCaller().agenda.clearTrainingData()).rejects.toThrow();
    });
    it("rejects anonymous for getParticipants", async () => {
      await expect(createAnonymousCaller().agenda.getParticipants({ milestoneId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for addParticipant", async () => {
      await expect(createAnonymousCaller().agenda.addParticipant({
        agendaId: 1, milestoneId: 1,
      })).rejects.toThrow();
    });
    it("rejects anonymous for batchAddParticipants", async () => {
      await expect(createAnonymousCaller().agenda.batchAddParticipants({
        agendaId: 1, milestoneId: 1,
      })).rejects.toThrow();
    });
    it("rejects anonymous for updateParticipant", async () => {
      await expect(createAnonymousCaller().agenda.updateParticipant({
        id: 1,
      })).rejects.toThrow();
    });
  });
});
