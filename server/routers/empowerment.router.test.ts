/**
 * Employee Empowerment Router — Unit Tests
 *
 * Tests 17 procedures across 3 sub-routers:
 *   briefing   (4) — getToday, markRead, history, stats
 *   dailyLog   (6) — submit, getByDate, monthlySummary, listRecent, approve, listTeam
 *   appraisal  (7) — getMine, getLatestUnread, markRead, managerSign, history, listTeam, stats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAuthenticatedCaller,
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
      groupBy: vi.fn(() => chain),
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
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  gte: vi.fn((...a: any[]) => a),
  lte: vi.fn((...a: any[]) => a),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();
const userCaller = () => createAuthenticatedCaller();
const anonCaller = () => createAnonymousCaller();

const today = new Date().toISOString().slice(0, 10);

const sampleBriefing = {
  id: 1,
  userId: 1,
  briefingDate: today,
  status: "generated",
  topPriorities: [{ title: "Review OKR", source: "OKR", priority: "P1" }],
  todaySchedule: [],
  carryoverTasks: [],
  okrSummary: "- OKR 1 (50%)",
  aiNarrative: "# Today's plan",
  readAt: null,
  createdAt: "2026-03-11T06:00:00Z",
};

const sampleLog = {
  id: 1,
  userId: 1,
  logDate: today,
  projectId: null,
  loggedHours: 8,
  completedTasks: [{ title: "Task 1" }],
  blockers: null,
  notes: null,
  energyLevel: 4,
  status: "submitted",
  approvedBy: null,
  approvedAt: null,
  createdAt: "2026-03-11T09:00:00Z",
  updatedAt: "2026-03-11T09:00:00Z",
};

const sampleReport = {
  id: 1,
  userId: 1,
  period: "2026-02",
  performanceScore: 85,
  totalHours: 168,
  tasksCompleted: 25,
  taskCompletionRate: 0.89,
  defectCount: 1,
  baseSalary: "12000.00",
  performanceBonus: "3000.00",
  netPay: "11500.00",
  strengths: ["High productivity"],
  shortcomings: ["Communication"],
  requiredTraining: [],
  carryoverItems: [],
  aiSummary: "# Monthly summary",
  status: "generated",
  employeeReadAt: null,
  managerSignedBy: null,
  managerSignedAt: null,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

// ═══════════════════════════════════════════════════════════════
// 1. Briefing
// ═══════════════════════════════════════════════════════════════

describe("empowerment briefing", () => {
  describe("getToday", () => {
    it("returns today's briefing", async () => {
      selectResultsQueue.push([sampleBriefing]);
      const result = await caller().empowerment.briefing.getToday();
      expect(result?.briefingDate).toBe(today);
    });

    it("returns null when no briefing exists", async () => {
      selectResultsQueue.push([]);
      const result = await caller().empowerment.briefing.getToday();
      expect(result).toBeNull();
    });

    it("rejects anonymous users", async () => {
      await expect(anonCaller().empowerment.briefing.getToday()).rejects.toThrow();
    });
  });

  describe("markRead", () => {
    it("marks briefing as read", async () => {
      returningQueue.push([{ ...sampleBriefing, status: "read" }]);
      const result = await caller().empowerment.briefing.markRead({ id: 1 });
      expect(result.status).toBe("read");
    });

    it("throws NOT_FOUND for missing briefing", async () => {
      returningQueue.push([]);
      await expect(caller().empowerment.briefing.markRead({ id: 999 })).rejects.toThrow(/not found/i);
    });
  });

  describe("history", () => {
    it("returns briefing history", async () => {
      selectResultsQueue.push([sampleBriefing]);
      const result = await caller().empowerment.briefing.history();
      expect(result).toHaveLength(1);
    });
  });

  describe("stats", () => {
    it("returns briefing read stats", async () => {
      selectResultsQueue.push([{ status: "read", cnt: 20 }, { status: "generated", cnt: 5 }]);
      const result = await caller().empowerment.briefing.stats();
      expect(result).toHaveLength(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. DailyLog
// ═══════════════════════════════════════════════════════════════

describe("empowerment dailyLog", () => {
  describe("submit", () => {
    it("submits a daily log", async () => {
      returningQueue.push([{ ...sampleLog, id: 5 }]);
      const result = await caller().empowerment.dailyLog.submit({
        logDate: today,
        loggedHours: 8,
        completedTasks: [{ title: "Test task" }],
      });
      expect(result.id).toBe(5);
    });

    it("rejects invalid date format", async () => {
      await expect(caller().empowerment.dailyLog.submit({
        logDate: "2026/03/11",
        loggedHours: 8,
      })).rejects.toThrow();
    });

    it("rejects hours > 24", async () => {
      await expect(caller().empowerment.dailyLog.submit({
        logDate: today,
        loggedHours: 25,
      })).rejects.toThrow();
    });
  });

  describe("getByDate", () => {
    it("returns logs for a date", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().empowerment.dailyLog.getByDate({ date: today });
      expect(result).toHaveLength(1);
    });
  });

  describe("monthlySummary", () => {
    it("returns monthly aggregates", async () => {
      selectResultsQueue.push([sampleLog, { ...sampleLog, id: 2, loggedHours: 7 }]);
      const result = await caller().empowerment.dailyLog.monthlySummary({ period: "2026-03" });
      expect(result.totalHours).toBe(15);
      expect(result.daysLogged).toBe(1); // same date
    });
  });

  describe("listRecent", () => {
    it("returns recent logs", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().empowerment.dailyLog.listRecent();
      expect(result).toHaveLength(1);
    });
  });

  describe("approve", () => {
    it("approves a daily log (manager permission)", async () => {
      returningQueue.push([{ ...sampleLog, status: "approved" }]);
      const result = await caller().empowerment.dailyLog.approve({ id: 1 });
      expect(result.status).toBe("approved");
    });
  });

  describe("listTeam", () => {
    it("returns team logs for date range", async () => {
      selectResultsQueue.push([sampleLog]);
      const result = await caller().empowerment.dailyLog.listTeam({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      });
      expect(result).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Appraisal
// ═══════════════════════════════════════════════════════════════

describe("empowerment appraisal", () => {
  describe("getMine", () => {
    it("returns my appraisal for a period", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().empowerment.appraisal.getMine({ period: "2026-02" });
      expect(result?.period).toBe("2026-02");
      expect(result?.performanceScore).toBe(85);
    });

    it("returns null when no report", async () => {
      selectResultsQueue.push([]);
      const result = await caller().empowerment.appraisal.getMine({ period: "2025-01" });
      expect(result).toBeNull();
    });
  });

  describe("getLatestUnread", () => {
    it("returns the latest unread appraisal", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().empowerment.appraisal.getLatestUnread();
      expect(result?.status).toBe("generated");
    });

    it("returns null when all read", async () => {
      selectResultsQueue.push([]);
      const result = await caller().empowerment.appraisal.getLatestUnread();
      expect(result).toBeNull();
    });
  });

  describe("markRead", () => {
    it("marks appraisal as read", async () => {
      returningQueue.push([{ ...sampleReport, status: "employee_read" }]);
      const result = await caller().empowerment.appraisal.markRead({ id: 1 });
      expect(result.status).toBe("employee_read");
    });

    it("throws NOT_FOUND for missing report", async () => {
      returningQueue.push([]);
      await expect(caller().empowerment.appraisal.markRead({ id: 999 })).rejects.toThrow(/not found/i);
    });
  });

  describe("managerSign", () => {
    it("manager signs off on appraisal", async () => {
      returningQueue.push([{ ...sampleReport, status: "manager_signed" }]);
      const result = await caller().empowerment.appraisal.managerSign({ id: 1 });
      expect(result.status).toBe("manager_signed");
    });
  });

  describe("history", () => {
    it("returns appraisal history", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().empowerment.appraisal.history();
      expect(result).toHaveLength(1);
    });
  });

  describe("listTeam", () => {
    it("returns team appraisals for a period", async () => {
      selectResultsQueue.push([sampleReport]);
      const result = await caller().empowerment.appraisal.listTeam({ period: "2026-02" });
      expect(result).toHaveLength(1);
    });
  });

  describe("stats", () => {
    it("returns performance trend data", async () => {
      selectResultsQueue.push([
        { period: "2026-02", score: 85, hours: 168, tasks: 25 },
        { period: "2026-01", score: 78, hours: 155, tasks: 20 },
      ]);
      const result = await caller().empowerment.appraisal.stats();
      expect(result).toHaveLength(2);
      expect(result[0].period).toBe("2026-02");
    });
  });
});
