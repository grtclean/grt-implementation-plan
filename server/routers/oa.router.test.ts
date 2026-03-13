/**
 * OA Smart Router — Unit Tests
 * Tests all 24 procedures: Workflows(8), Meetings(7), Trips(3),
 * Leave Balances(3), Announcements(4)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing","groupBy","having","innerJoin","leftJoin","rightJoin","fullJoin"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      const result = resolve(getNextResult());
      // Return a thenable for .then().catch() chains (fire-and-forget patterns)
      return { then: (r: any) => r(result), catch: () => ({ then: (r: any) => r(result) }) };
    }
    catch (e) { if (reject) return reject(e); throw e; }
  };
  chain.catch = vi.fn(() => chain);

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock schema
vi.mock("../../drizzle/oa-schema", () => ({
  oaWorkflows: { id: "id", type: "type", status: "status", applicantId: "applicantId", approverId: "approverId", createdAt: "createdAt", version: "version" },
  companyEventsMeetings: { id: "id", title: "title", isActive: "isActive", dayOfWeek: "dayOfWeek" },
  meetingAgendasActions: { id: "id", meetingId: "meetingId", meetingDate: "meetingDate", sortOrder: "sortOrder", status: "status" },
  businessTripReports: { id: "id", employeeId: "employeeId", projectId: "projectId", status: "status", createdAt: "createdAt" },
  oaLeaveBalances: { id: "id", year: "year", employeeId: "employeeId" },
  oaAnnouncements: { id: "id", status: "status", category: "category", departmentId: "departmentId", isPinned: "isPinned", publishedAt: "publishedAt", viewCount: "viewCount" },
  OA_WORKFLOW_TYPES: ["leave", "expense", "overtime", "travel", "procurement", "general"] as const,
  OA_WORKFLOW_STATUSES: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const,
  OA_AGENDA_STATUSES: ["open", "in_progress", "completed", "deferred"] as const,
  OA_LEAVE_TYPES: ["annual", "sick", "personal", "maternity", "paternity", "marriage"] as const,
  OA_ANNOUNCEMENT_STATUSES: ["draft", "published", "archived"] as const,
}));

vi.mock("../../drizzle/schema", () => ({
  users: { id: "id", name: "name" },
}));

// Mock OA service
const mockOAService = {
  createOARequest: vi.fn(() => Promise.resolve({ id: 1, type: "leave", status: "PENDING" })),
  approveOARequest: vi.fn(() => Promise.resolve({ id: 1, status: "APPROVED" })),
  rejectOARequest: vi.fn(() => Promise.resolve({ id: 1, status: "REJECTED" })),
  generateMondayMorningAgenda: vi.fn(() => Promise.resolve({ meetingId: 1, items: 5 })),
  submitTripReport: vi.fn(() => Promise.resolve({ id: 1, status: "submitted" })),
  getLeaveBalances: vi.fn(() => Promise.resolve([{ leaveType: "annual", totalDays: 15, usedDays: 3 }])),
  initLeaveBalances: vi.fn(() => Promise.resolve({ initialized: 3 })),
  createAnnouncement: vi.fn(() => Promise.resolve({ id: 1, title: "Test", status: "draft" })),
};

vi.mock("../services/oa.service", () => ({
  createOARequest: (...args: any[]) => mockOAService.createOARequest(...args),
  approveOARequest: (...args: any[]) => mockOAService.approveOARequest(...args),
  rejectOARequest: (...args: any[]) => mockOAService.rejectOARequest(...args),
  generateMondayMorningAgenda: (...args: any[]) => mockOAService.generateMondayMorningAgenda(...args),
  submitTripReport: (...args: any[]) => mockOAService.submitTripReport(...args),
  getLeaveBalances: (...args: any[]) => mockOAService.getLeaveBalances(...args),
  initLeaveBalances: (...args: any[]) => mockOAService.initLeaveBalances(...args),
  createAnnouncement: (...args: any[]) => mockOAService.createAnnouncement(...args),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("oa router", () => {

  // ═══ Workflows ═══════════════════════════════════

  describe("listWorkflows", () => {
    it("returns paginated workflows", async () => {
      // items + count in Promise.all
      selectResultsQueue.push([{ id: 1, type: "leave", status: "PENDING" }]);
      selectResultsQueue.push([{ value: 10 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listWorkflows({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("returns empty with no input", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listWorkflows();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by type and status", async () => {
      selectResultsQueue.push([{ id: 1 }]);
      selectResultsQueue.push([{ value: 1 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listWorkflows({ type: "leave", status: "PENDING" });
      expect(result.items).toHaveLength(1);
    });
  });

  describe("getWorkflow", () => {
    it("returns workflow by id", async () => {
      mockQueryResult = [{ id: 1, type: "leave", status: "PENDING" }];
      const caller = createAdminCaller();
      const result = await caller.oa.getWorkflow({ id: 1 });
      expect(result).toHaveProperty("id", 1);
    });

    it("returns null when not found", async () => {
      mockQueryResult = [];
      const caller = createAdminCaller();
      const result = await caller.oa.getWorkflow({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string id", async () => {
      mockQueryResult = [{ id: 5, type: "expense" }];
      const caller = createAdminCaller();
      const result = await caller.oa.getWorkflow({ id: "5" });
      expect(result).toHaveProperty("id", 5);
    });
  });

  describe("createWorkflow", () => {
    it("creates workflow via service", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.createWorkflow({
        type: "leave", title: "Annual Leave",
      });
      expect(result).toHaveProperty("id", 1);
      expect(mockOAService.createOARequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: "leave", title: "Annual Leave" })
      );
    });

    it("passes optional fields", async () => {
      const caller = createAdminCaller();
      await caller.oa.createWorkflow({
        type: "expense", title: "Office Supplies",
        content: { amount: 500 }, linkedProjectId: 10, approverId: 2,
      });
      expect(mockOAService.createOARequest).toHaveBeenCalledWith(
        expect.objectContaining({
          linkedProjectId: 10, approverId: 2,
        })
      );
    });

    it("rejects empty title", async () => {
      const caller = createAdminCaller();
      await expect(caller.oa.createWorkflow({
        type: "leave", title: "",
      })).rejects.toThrow();
    });
  });

  describe("approveWorkflow", () => {
    it("approves workflow via service", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.approveWorkflow({ id: 1 });
      expect(result).toHaveProperty("status", "APPROVED");
    });

    it("passes comment", async () => {
      const caller = createAdminCaller();
      await caller.oa.approveWorkflow({ id: 1, comment: "OK" });
      expect(mockOAService.approveOARequest).toHaveBeenCalledWith(1, expect.any(Number), "OK");
    });
  });

  describe("rejectWorkflow", () => {
    it("rejects workflow via service", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.rejectWorkflow({ id: 1 });
      expect(result).toHaveProperty("status", "REJECTED");
    });
  });

  describe("cancelWorkflow", () => {
    it("cancels PENDING workflow", async () => {
      mockReturningResult = [{ id: 1, status: "CANCELLED" }];
      const caller = createAdminCaller();
      const result = await caller.oa.cancelWorkflow({ id: 1 });
      expect(result).toHaveProperty("status", "CANCELLED");
    });

    it("throws when not found or not PENDING", async () => {
      mockReturningResult = [];
      const caller = createAdminCaller();
      await expect(caller.oa.cancelWorkflow({ id: 999 })).rejects.toThrow("not found or not PENDING");
    });
  });

  describe("getMyPendingApprovals", () => {
    it("returns pending approvals for current user", async () => {
      mockQueryResult = [{ id: 1, status: "PENDING", approverId: 1 }];
      const caller = createAdminCaller();
      const result = await caller.oa.getMyPendingApprovals();
      expect(result).toHaveLength(1);
    });

    it("returns empty when no pending", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.getMyPendingApprovals();
      expect(result).toHaveLength(0);
    });
  });

  describe("getWorkflowStats", () => {
    it("returns aggregated stats", async () => {
      mockQueryResult = [
        { type: "leave", status: "PENDING", count: 5 },
        { type: "leave", status: "APPROVED", count: 10 },
        { type: "expense", status: "PENDING", count: 3 },
      ];
      const caller = createAdminCaller();
      const result = await caller.oa.getWorkflowStats();
      expect(result).toHaveProperty("byTypeAndStatus");
      expect(result).toHaveProperty("totalPending", 8);
      expect(result.byTypeAndStatus.leave).toHaveProperty("PENDING", 5);
    });
  });

  // ═══ Meetings ═══════════════════════════════════

  describe("listMeetings", () => {
    it("returns active meetings", async () => {
      mockQueryResult = [{ id: 1, title: "Monday Standup" }];
      const caller = createAdminCaller();
      const result = await caller.oa.listMeetings();
      expect(result).toHaveLength(1);
    });
  });

  describe("createMeeting", () => {
    it("creates meeting", async () => {
      mockReturningResult = [{ id: 1, title: "Sprint Review" }];
      const caller = createAdminCaller();
      const result = await caller.oa.createMeeting({ title: "Sprint Review" });
      expect(result).toHaveProperty("title", "Sprint Review");
    });

    it("creates meeting with all optional fields", async () => {
      mockReturningResult = [{ id: 2, title: "Weekly" }];
      const caller = createAdminCaller();
      const result = await caller.oa.createMeeting({
        title: "Weekly", description: "Team sync",
        departmentId: 1, organizerId: 1,
        startTime: "09:00", endTime: "10:00",
        dayOfWeek: 1, recurrenceRule: "weekly",
        location: "Room A",
        autoAgendaContext: { sourceTypes: ["task"], lookbackDays: 7, maxItems: 10 },
      });
      expect(result).toHaveProperty("id", 2);
    });

    it("rejects empty title", async () => {
      const caller = createAdminCaller();
      await expect(caller.oa.createMeeting({ title: "" })).rejects.toThrow();
    });
  });

  describe("updateMeeting", () => {
    it("updates meeting", async () => {
      mockReturningResult = [{ id: 1, title: "Updated" }];
      const caller = createAdminCaller();
      const result = await caller.oa.updateMeeting({ id: 1, title: "Updated" });
      expect(result).toHaveProperty("title", "Updated");
    });

    it("throws when not found", async () => {
      mockReturningResult = [];
      const caller = createAdminCaller();
      await expect(caller.oa.updateMeeting({ id: 999, title: "X" })).rejects.toThrow("not found");
    });
  });

  describe("generateAgenda", () => {
    it("generates agenda via service", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.generateAgenda({ meetingId: 1 });
      expect(result).toHaveProperty("items", 5);
    });
  });

  describe("getAgendaItems", () => {
    it("returns agenda items for meeting", async () => {
      mockQueryResult = [{ id: 1, meetingId: 1, status: "open" }];
      const caller = createAdminCaller();
      const result = await caller.oa.getAgendaItems({ meetingId: 1 });
      expect(result).toHaveLength(1);
    });

    it("filters by meetingDate", async () => {
      mockQueryResult = [{ id: 1 }];
      const caller = createAdminCaller();
      const result = await caller.oa.getAgendaItems({ meetingId: 1, meetingDate: "2026-01-01" });
      expect(result).toHaveLength(1);
    });
  });

  describe("updateAgendaItem", () => {
    it("updates agenda item", async () => {
      mockReturningResult = [{ id: 1, status: "completed" }];
      const caller = createAdminCaller();
      const result = await caller.oa.updateAgendaItem({
        id: 1, status: "completed", decision: "Approved",
      });
      expect(result).toHaveProperty("status", "completed");
    });

    it("throws when not found", async () => {
      mockReturningResult = [];
      const caller = createAdminCaller();
      await expect(caller.oa.updateAgendaItem({ id: 999 })).rejects.toThrow("not found");
    });
  });

  describe("concludeMeeting", () => {
    it("concludes meeting with batch updates", async () => {
      // transition of remaining open items
      mockReturningResult = [{ id: 3 }];
      const caller = createAdminCaller();
      const result = await caller.oa.concludeMeeting({
        meetingId: 1,
        meetingDate: "2026-03-01",
        updates: [
          { id: 1, decision: "Done", status: "completed" },
          { id: 2, assignedTo: 5, deadline: "2026-03-15" },
        ],
      });
      expect(result).toHaveProperty("meetingId", 1);
      expect(result).toHaveProperty("updatedCount");
      expect(result).toHaveProperty("concludedAt");
    });
  });

  // ═══ Trip Reports ═══════════════════════════════════

  describe("listTripReports", () => {
    it("returns paginated trip reports", async () => {
      selectResultsQueue.push([{ id: 1, destination: "Shanghai" }]);
      selectResultsQueue.push([{ value: 5 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listTripReports({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 5);
    });

    it("handles no input", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listTripReports();
      expect(result.total).toBe(0);
    });
  });

  describe("createTripReport", () => {
    it("creates trip report via service", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.createTripReport({
        destination: "Beijing", tripSummary: "Client visit",
      });
      expect(result).toHaveProperty("id", 1);
      expect(mockOAService.submitTripReport).toHaveBeenCalled();
    });
  });

  describe("getTripReport", () => {
    it("returns trip report by id", async () => {
      mockQueryResult = [{ id: 1, destination: "Shanghai" }];
      const caller = createAdminCaller();
      const result = await caller.oa.getTripReport({ id: 1 });
      expect(result).toHaveProperty("destination", "Shanghai");
    });

    it("returns null when not found", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.getTripReport({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ Leave Balances ═══════════════════════════════════

  describe("getMyLeaveBalances", () => {
    it("returns leave balances for current user", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.getMyLeaveBalances({});
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("leaveType", "annual");
    });

    it("handles no input", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.getMyLeaveBalances();
      expect(mockOAService.getLeaveBalances).toHaveBeenCalled();
    });
  });

  describe("initLeaveBalances", () => {
    it("initializes leave balances", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.initLeaveBalances({
        employeeId: 1, year: 2026,
        allocations: [{ leaveType: "annual", totalDays: 15 }],
      });
      expect(result).toHaveProperty("initialized", 3);
    });
  });

  describe("listAllLeaveBalances", () => {
    it("returns all leave balances for year", async () => {
      selectResultsQueue.push([{ id: 1, year: 2026 }]);
      selectResultsQueue.push([{ value: 20 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listAllLeaveBalances({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 20);
    });
  });

  // ═══ Announcements ═══════════════════════════════════

  describe("listAnnouncements", () => {
    it("returns paginated announcements", async () => {
      selectResultsQueue.push([{ id: 1, title: "Notice" }]);
      selectResultsQueue.push([{ value: 5 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listAnnouncements({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 5);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([{ id: 1 }]);
      selectResultsQueue.push([{ value: 1 }]);
      const caller = createAdminCaller();
      const result = await caller.oa.listAnnouncements({ status: "published" });
      expect(result.items).toHaveLength(1);
    });
  });

  describe("getAnnouncement", () => {
    it("returns announcement and increments view count", async () => {
      mockQueryResult = [{ id: 1, title: "Notice", viewCount: 5 }];
      const caller = createAdminCaller();
      const result = await caller.oa.getAnnouncement({ id: 1 });
      expect(result).toHaveProperty("title", "Notice");
    });

    it("returns null when not found", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.getAnnouncement({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("createAnnouncement", () => {
    it("creates announcement via service", async () => {
      const caller = createAdminCaller();
      const result = await caller.oa.createAnnouncement({ title: "Test Notice" });
      expect(result).toHaveProperty("id", 1);
      expect(mockOAService.createAnnouncement).toHaveBeenCalled();
    });

    it("rejects empty title", async () => {
      const caller = createAdminCaller();
      await expect(caller.oa.createAnnouncement({ title: "" })).rejects.toThrow();
    });
  });

  describe("publishAnnouncement", () => {
    it("publishes announcement", async () => {
      mockReturningResult = [{ id: 1, status: "published" }];
      const caller = createAdminCaller();
      const result = await caller.oa.publishAnnouncement({ id: 1 });
      expect(result).toHaveProperty("status", "published");
    });

    it("throws when not found", async () => {
      mockReturningResult = [];
      const caller = createAdminCaller();
      await expect(caller.oa.publishAnnouncement({ id: 999 })).rejects.toThrow("not found");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for listWorkflows", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oa.listWorkflows()).rejects.toThrow();
    });

    it("rejects anonymous for createWorkflow", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oa.createWorkflow({ type: "leave", title: "X" })).rejects.toThrow();
    });

    it("rejects anonymous for approveWorkflow", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oa.approveWorkflow({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for cancelWorkflow", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oa.cancelWorkflow({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for createMeeting", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oa.createMeeting({ title: "X" })).rejects.toThrow();
    });

    it("rejects anonymous for publishAnnouncement", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oa.publishAnnouncement({ id: 1 })).rejects.toThrow();
    });
  });
});
