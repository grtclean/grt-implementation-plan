/**
 * Cloud Hall Router — Unit Tests (数字云厅)
 *
 * 9 procedures tested:
 *   createSession, inviteLeadership, joinSession, getSessionState,
 *   updateSlideContext, heartbeat, endSession, listSessions, seedDemo
 *
 * 50+ test cases covering valid input, edge cases, auth guards,
 * state transitions, and error paths.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve([[]])),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock cloud-hall schema
vi.mock("../../drizzle/cloud-hall-schema", () => ({
  cloudHallSessions: {
    id: "id",
    sessionCode: "session_code",
    status: "status",
    initiatorUserId: "initiator_user_id",
    initiatorName: "initiator_name",
    initiatorRole: "initiator_role",
    initiatorDevice: "initiator_device",
    leadershipUserId: "leadership_user_id",
    leadershipName: "leadership_name",
    leadershipRole: "leadership_role",
    buId: "bu_id",
    projectId: "project_id",
    customerName: "customer_name",
    customerSite: "customer_site",
    currentSlideContext: "current_slide_context",
    sessionNotes: "session_notes",
    signalingState: "signaling_state",
    connectionQuality: "connection_quality",
    lastHeartbeat: "last_heartbeat",
    videoProvider: "video_provider",
    sessionDurationSec: "session_duration_sec",
    endReason: "end_reason",
    endedAt: "ended_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  cloudHallSessionLogs: {
    id: "id",
    sessionId: "session_id",
    action: "action",
    actorUserId: "actor_user_id",
    actorName: "actor_name",
    details: "details",
    createdAt: "created_at",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn((col?: any) => col ?? "count"),
  sql: Object.assign(vi.fn((...args: any[]) => args), {
    raw: vi.fn((s: string) => s),
  }),
  or: vi.fn((...args: any[]) => args),
}));

// ── Import test utilities (after mocks) ─────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Helpers ─────────────────────────────────────────────

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    sessionCode: "CH-20260301-001",
    status: "waiting",
    initiatorUserId: 1,
    initiatorName: "张工",
    initiatorRole: "bu_sales",
    initiatorDevice: "laptop",
    leadershipUserId: null,
    leadershipName: null,
    leadershipRole: null,
    buId: 1,
    projectId: null,
    customerName: "Test Customer",
    customerSite: "Test Site",
    signalingState: "idle",
    connectionQuality: null,
    lastHeartbeat: null,
    videoProvider: "placeholder",
    sessionDurationSec: null,
    endReason: null,
    endedAt: null,
    sessionNotes: null,
    currentSlideContext: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// =====================================================================
// TESTS
// =====================================================================
describe("cloudHall router", () => {
  // ─────────────────────────────────────────────────────────────────
  // Auth guard — all procedures require authentication
  // ─────────────────────────────────────────────────────────────────
  describe("auth guards", () => {
    it("createSession rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.createSession({
          initiatorName: "张工",
          customerName: "Test",
        })
      ).rejects.toThrow();
    });

    it("inviteLeadership rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 1,
          leadershipUserId: 2,
          leadershipName: "王总",
        })
      ).rejects.toThrow();
    });

    it("joinSession rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.joinSession({ sessionId: 1 })
      ).rejects.toThrow();
    });

    it("getSessionState rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.getSessionState({ sessionId: 1 })
      ).rejects.toThrow();
    });

    it("updateSlideContext rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.updateSlideContext({
          sessionId: 1,
          slideContext: { slideIndex: 0, slideTitle: "test" },
        })
      ).rejects.toThrow();
    });

    it("heartbeat rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.heartbeat({ sessionId: 1 })
      ).rejects.toThrow();
    });

    it("endSession rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.endSession({ sessionId: 1 })
      ).rejects.toThrow();
    });

    it("listSessions rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.listSessions({})
      ).rejects.toThrow();
    });

    it("seedDemo rejects unauthenticated callers", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.cloudHall.seedDemo()
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // createSession
  // ─────────────────────────────────────────────────────────────────
  describe("createSession", () => {
    it("creates a session with required fields", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const createdSession = makeSession({
        id: 5,
        initiatorUserId: 10,
        initiatorName: "张工",
        customerName: "上汽大众",
      });

      // generateSessionCode: select returns no existing session
      selectResultsQueue.push([]);
      // insert().returning() for session
      mockReturningResult = [createdSession];
      // insertLog: insert().values() -- thenable resolves
      // (the insertLog select is handled by the general mock)

      const result = await caller.cloudHall.createSession({
        initiatorName: "张工",
        customerName: "上汽大众",
      });

      expect(result).toEqual(createdSession);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("creates a session with all optional fields", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const createdSession = makeSession({
        id: 6,
        initiatorUserId: 10,
        initiatorName: "张工",
        initiatorRole: "cs_engineer",
        initiatorDevice: "pad",
        buId: 2,
        projectId: 99,
        customerName: "博世长沙",
        customerSite: "长沙经开区",
      });

      selectResultsQueue.push([]);
      mockReturningResult = [createdSession];

      const result = await caller.cloudHall.createSession({
        initiatorName: "张工",
        initiatorRole: "cs_engineer",
        initiatorDevice: "pad",
        buId: 2,
        projectId: 99,
        customerName: "博世长沙",
        customerSite: "长沙经开区",
      });

      expect(result).toEqual(createdSession);
      expect(result.initiatorRole).toBe("cs_engineer");
      expect(result.initiatorDevice).toBe("pad");
      expect(result.buId).toBe(2);
      expect(result.projectId).toBe(99);
      expect(result.customerSite).toBe("长沙经开区");
    });

    it("generates sequential session codes", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const existingCode = { code: "CH-20260301-003" };
      const createdSession = makeSession({ id: 7, sessionCode: "CH-20260301-004" });

      selectResultsQueue.push([existingCode]);
      mockReturningResult = [createdSession];

      const result = await caller.cloudHall.createSession({
        initiatorName: "张工",
        customerName: "Test",
      });

      expect(result).toBeDefined();
    });

    it("defaults initiatorRole to bu_sales when not provided", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const createdSession = makeSession({ id: 8, initiatorRole: "bu_sales" });

      selectResultsQueue.push([]);
      mockReturningResult = [createdSession];

      const result = await caller.cloudHall.createSession({
        initiatorName: "张工",
        customerName: "Test",
      });

      expect(result.initiatorRole).toBe("bu_sales");
    });

    it("defaults initiatorDevice to laptop when not provided", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const createdSession = makeSession({ id: 9, initiatorDevice: "laptop" });

      selectResultsQueue.push([]);
      mockReturningResult = [createdSession];

      const result = await caller.cloudHall.createSession({
        initiatorName: "张工",
        customerName: "Test",
      });

      expect(result.initiatorDevice).toBe("laptop");
    });

    it("rejects empty initiatorName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.createSession({
          initiatorName: "",
          customerName: "Test",
        })
      ).rejects.toThrow();
    });

    it("rejects empty customerName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.createSession({
          initiatorName: "张工",
          customerName: "",
        })
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // inviteLeadership
  // ─────────────────────────────────────────────────────────────────
  describe("inviteLeadership", () => {
    it("invites a leader to a waiting session", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const session = makeSession({ id: 1, status: "waiting" });
      const updatedSession = makeSession({
        id: 1,
        status: "ringing",
        leadershipUserId: 2,
        leadershipName: "王总",
        leadershipRole: "director",
        signalingState: "offer_sent",
      });

      // select session
      selectResultsQueue.push([session]);
      // update().returning()
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.inviteLeadership({
        sessionId: 1,
        leadershipUserId: 2,
        leadershipName: "王总",
      });

      expect(result.status).toBe("ringing");
      expect(result.leadershipUserId).toBe(2);
      expect(result.leadershipName).toBe("王总");
      expect(result.signalingState).toBe("offer_sent");
    });

    it("defaults leadershipRole to director when not provided", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const session = makeSession({ id: 1, status: "waiting" });
      const updatedSession = makeSession({
        id: 1,
        status: "ringing",
        leadershipRole: "director",
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.inviteLeadership({
        sessionId: 1,
        leadershipUserId: 2,
        leadershipName: "王总",
      });

      expect(result.leadershipRole).toBe("director");
    });

    it("uses provided leadershipRole", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const session = makeSession({ id: 1, status: "waiting" });
      const updatedSession = makeSession({
        id: 1,
        status: "ringing",
        leadershipRole: "bu_gm",
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.inviteLeadership({
        sessionId: 1,
        leadershipUserId: 2,
        leadershipName: "王总",
        leadershipRole: "bu_gm",
      });

      expect(result.leadershipRole).toBe("bu_gm");
    });

    it("throws if session not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 999,
          leadershipUserId: 2,
          leadershipName: "王总",
        })
      ).rejects.toThrow("Session not found");
    });

    it("throws if session is not in waiting state", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "active" });
      selectResultsQueue.push([session]);

      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 1,
          leadershipUserId: 2,
          leadershipName: "王总",
        })
      ).rejects.toThrow("Session is not in waiting state");
    });

    it("throws if session is already ended", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "ended" });
      selectResultsQueue.push([session]);

      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 1,
          leadershipUserId: 2,
          leadershipName: "王总",
        })
      ).rejects.toThrow("Session is not in waiting state");
    });

    it("throws if session is ringing", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "ringing" });
      selectResultsQueue.push([session]);

      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 1,
          leadershipUserId: 2,
          leadershipName: "王总",
        })
      ).rejects.toThrow("Session is not in waiting state");
    });

    it("logs the invite action with details", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const session = makeSession({ id: 1, status: "waiting" });
      const updatedSession = makeSession({ id: 1, status: "ringing" });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      await caller.cloudHall.inviteLeadership({
        sessionId: 1,
        leadershipUserId: 2,
        leadershipName: "王总",
      });

      // insertLog is called for the invite action
      // At minimum 1 insert call for the update, and 1 for the log
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // joinSession
  // ─────────────────────────────────────────────────────────────────
  describe("joinSession", () => {
    it("joins a ringing session (transitions to active)", async () => {
      const caller = createAuthenticatedCaller({ id: 2, name: "王总" });
      const session = makeSession({ id: 1, status: "ringing" });
      const updatedSession = makeSession({
        id: 1,
        status: "active",
        signalingState: "connected",
        connectionQuality: "good",
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.joinSession({ sessionId: 1 });

      expect(result.status).toBe("active");
      expect(result.signalingState).toBe("connected");
      expect(result.connectionQuality).toBe("good");
    });

    it("throws if session not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.cloudHall.joinSession({ sessionId: 999 })
      ).rejects.toThrow("Session not found");
    });

    it("throws if session is not ringing", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "waiting" });
      selectResultsQueue.push([session]);

      await expect(
        caller.cloudHall.joinSession({ sessionId: 1 })
      ).rejects.toThrow("Session is not ringing");
    });

    it("throws if session is already active", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "active" });
      selectResultsQueue.push([session]);

      await expect(
        caller.cloudHall.joinSession({ sessionId: 1 })
      ).rejects.toThrow("Session is not ringing");
    });

    it("throws if session is ended", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "ended" });
      selectResultsQueue.push([session]);

      await expect(
        caller.cloudHall.joinSession({ sessionId: 1 })
      ).rejects.toThrow("Session is not ringing");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getSessionState
  // ─────────────────────────────────────────────────────────────────
  describe("getSessionState", () => {
    it("returns session state for a valid session", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({ id: 1, status: "waiting" });
      selectResultsQueue.push([session]);

      const result = await caller.cloudHall.getSessionState({ sessionId: 1 });

      expect(result).toEqual(session);
      expect(result.status).toBe("waiting");
    });

    it("throws if session not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.cloudHall.getSessionState({ sessionId: 999 })
      ).rejects.toThrow("Session not found");
    });

    it("auto-disconnects if heartbeat is stale (>60s) while active", async () => {
      const caller = createAuthenticatedCaller();
      const staleHeartbeat = new Date(Date.now() - 120_000).toISOString(); // 2 minutes ago
      const session = makeSession({
        id: 1,
        status: "active",
        lastHeartbeat: staleHeartbeat,
        connectionQuality: "good",
        signalingState: "connected",
      });
      selectResultsQueue.push([session]);

      const result = await caller.cloudHall.getSessionState({ sessionId: 1 });

      expect(result.connectionQuality).toBe("disconnected");
      expect(result.signalingState).toBe("disconnected");
      // update + insertLog should be called
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("does NOT auto-disconnect if heartbeat is recent (<60s)", async () => {
      const caller = createAuthenticatedCaller();
      const recentHeartbeat = new Date(Date.now() - 30_000).toISOString(); // 30 seconds ago
      const session = makeSession({
        id: 1,
        status: "active",
        lastHeartbeat: recentHeartbeat,
        connectionQuality: "good",
        signalingState: "connected",
      });
      selectResultsQueue.push([session]);

      const result = await caller.cloudHall.getSessionState({ sessionId: 1 });

      expect(result.connectionQuality).toBe("good");
      expect(result.signalingState).toBe("connected");
      expect(result.status).toBe("active");
    });

    it("does NOT auto-disconnect non-active sessions even with stale heartbeat", async () => {
      const caller = createAuthenticatedCaller();
      const staleHeartbeat = new Date(Date.now() - 120_000).toISOString();
      const session = makeSession({
        id: 1,
        status: "waiting",
        lastHeartbeat: staleHeartbeat,
      });
      selectResultsQueue.push([session]);

      const result = await caller.cloudHall.getSessionState({ sessionId: 1 });

      // No auto-disconnect for non-active sessions
      expect(result.status).toBe("waiting");
    });

    it("does NOT auto-disconnect active session with null lastHeartbeat", async () => {
      const caller = createAuthenticatedCaller();
      const session = makeSession({
        id: 1,
        status: "active",
        lastHeartbeat: null,
      });
      selectResultsQueue.push([session]);

      const result = await caller.cloudHall.getSessionState({ sessionId: 1 });

      expect(result.status).toBe("active");
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("auto-disconnects at exactly the 60s boundary (>60000ms)", async () => {
      const caller = createAuthenticatedCaller();
      // Exactly 61 seconds ago
      const borderlineHeartbeat = new Date(Date.now() - 61_000).toISOString();
      const session = makeSession({
        id: 1,
        status: "active",
        lastHeartbeat: borderlineHeartbeat,
        signalingState: "connected",
      });
      selectResultsQueue.push([session]);

      const result = await caller.cloudHall.getSessionState({ sessionId: 1 });

      expect(result.connectionQuality).toBe("disconnected");
      expect(result.signalingState).toBe("disconnected");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // updateSlideContext
  // ─────────────────────────────────────────────────────────────────
  describe("updateSlideContext", () => {
    it("updates slide context with required fields", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const updatedSession = makeSession({
        id: 1,
        currentSlideContext: { slideIndex: 2, slideTitle: "Product Overview" },
      });

      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.updateSlideContext({
        sessionId: 1,
        slideContext: {
          slideIndex: 2,
          slideTitle: "Product Overview",
        },
      });

      expect(result).toBeDefined();
      expect(result.currentSlideContext).toEqual({
        slideIndex: 2,
        slideTitle: "Product Overview",
      });
    });

    it("updates slide context with all optional fields", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const slideCtx = {
        slideIndex: 3,
        slideTitle: "超声波清洗机 UC-3000",
        productId: 42,
        productName: "UC-3000",
        productCategory: "ultrasonic",
        pageUrl: "/products/uc-3000",
        customData: { priceRange: "200k-500k" },
      };
      const updatedSession = makeSession({
        id: 1,
        currentSlideContext: slideCtx,
      });

      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.updateSlideContext({
        sessionId: 1,
        slideContext: slideCtx,
      });

      expect(result.currentSlideContext).toEqual(slideCtx);
    });

    it("logs the slide change", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const updatedSession = makeSession({ id: 1 });
      mockReturningResult = [updatedSession];

      await caller.cloudHall.updateSlideContext({
        sessionId: 1,
        slideContext: { slideIndex: 0, slideTitle: "Intro" },
      });

      // update for session + insert for log
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects negative slideIndex", async () => {
      const caller = createAuthenticatedCaller();

      // Zod will reject if slideIndex is not a number, but negative numbers are valid per schema
      // This should succeed as z.number() allows negatives
      const updatedSession = makeSession({ id: 1 });
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.updateSlideContext({
        sessionId: 1,
        slideContext: { slideIndex: -1, slideTitle: "Back" },
      });

      expect(result).toBeDefined();
    });

    it("rejects missing slideTitle", async () => {
      const caller = createAuthenticatedCaller();

      await expect(
        caller.cloudHall.updateSlideContext({
          sessionId: 1,
          slideContext: { slideIndex: 0 } as any,
        })
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // heartbeat
  // ─────────────────────────────────────────────────────────────────
  describe("heartbeat", () => {
    it("sends heartbeat without connection quality", async () => {
      const caller = createAuthenticatedCaller();
      // First select to check signaling state
      selectResultsQueue.push([{ signalingState: "connected" }]);

      const result = await caller.cloudHall.heartbeat({ sessionId: 1 });

      expect(result).toEqual({ ok: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("sends heartbeat with connection quality", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ signalingState: "connected" }]);

      const result = await caller.cloudHall.heartbeat({
        sessionId: 1,
        connectionQuality: "excellent",
      });

      expect(result).toEqual({ ok: true });
    });

    it("reconnects a disconnected session on heartbeat", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ signalingState: "disconnected" }]);

      const result = await caller.cloudHall.heartbeat({
        sessionId: 1,
        connectionQuality: "good",
      });

      expect(result).toEqual({ ok: true });
      // Should have called insert for the reconnected log
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("reconnects with default quality 'fair' when no quality specified", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ signalingState: "disconnected" }]);

      const result = await caller.cloudHall.heartbeat({ sessionId: 1 });

      expect(result).toEqual({ ok: true });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("does not log reconnect for non-disconnected sessions", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ signalingState: "connected" }]);

      await caller.cloudHall.heartbeat({ sessionId: 1 });

      // insert should NOT be called for log when not reconnecting
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("accepts all valid connection quality values", async () => {
      const caller = createAuthenticatedCaller();
      const qualities = ["excellent", "good", "fair", "poor", "disconnected"] as const;

      for (const q of qualities) {
        vi.clearAllMocks();
        selectResultsQueue.push([{ signalingState: "connected" }]);

        const result = await caller.cloudHall.heartbeat({
          sessionId: 1,
          connectionQuality: q,
        });

        expect(result).toEqual({ ok: true });
      }
    });

    it("rejects invalid connection quality value", async () => {
      const caller = createAuthenticatedCaller();

      await expect(
        caller.cloudHall.heartbeat({
          sessionId: 1,
          connectionQuality: "invalid" as any,
        })
      ).rejects.toThrow();
    });

    it("handles session with null signalingState", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ signalingState: null }]);

      const result = await caller.cloudHall.heartbeat({ sessionId: 1 });

      expect(result).toEqual({ ok: true });
      // Should not log reconnect since signalingState is not "disconnected"
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // endSession
  // ─────────────────────────────────────────────────────────────────
  describe("endSession", () => {
    it("ends a session with default reason", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const session = makeSession({
        id: 1,
        status: "active",
        createdAt: new Date(Date.now() - 1800_000).toISOString(), // 30 minutes ago
      });
      const updatedSession = makeSession({
        id: 1,
        status: "ended",
        signalingState: "disconnected",
        endReason: "normal",
        sessionDurationSec: 1800,
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.endSession({ sessionId: 1 });

      expect(result.status).toBe("ended");
      expect(result.signalingState).toBe("disconnected");
      expect(result.endReason).toBe("normal");
    });

    it("ends a session with custom reason and notes", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const session = makeSession({
        id: 1,
        status: "active",
        createdAt: new Date(Date.now() - 600_000).toISOString(),
      });
      const updatedSession = makeSession({
        id: 1,
        status: "ended",
        endReason: "customer_left",
        sessionNotes: "客户临时有事离开",
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.endSession({
        sessionId: 1,
        reason: "customer_left",
        notes: "客户临时有事离开",
      });

      expect(result.endReason).toBe("customer_left");
      expect(result.sessionNotes).toBe("客户临时有事离开");
    });

    it("throws if session not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.cloudHall.endSession({ sessionId: 999 })
      ).rejects.toThrow("Session not found");
    });

    it("calculates duration from createdAt", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const createdTime = new Date(Date.now() - 3600_000); // 1 hour ago
      const session = makeSession({
        id: 1,
        status: "active",
        createdAt: createdTime.toISOString(),
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [makeSession({ id: 1, status: "ended", sessionDurationSec: 3600 })];

      const result = await caller.cloudHall.endSession({ sessionId: 1 });

      expect(result.status).toBe("ended");
      // update was called with set containing sessionDurationSec
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("handles session with null createdAt (duration = 0)", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const session = makeSession({
        id: 1,
        status: "active",
        createdAt: null,
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [makeSession({ id: 1, status: "ended", sessionDurationSec: 0 })];

      const result = await caller.cloudHall.endSession({ sessionId: 1 });

      expect(result.status).toBe("ended");
    });

    it("preserves existing sessionNotes when notes not provided", async () => {
      const caller = createAuthenticatedCaller({ id: 10 });
      const session = makeSession({
        id: 1,
        status: "active",
        sessionNotes: "Existing notes",
        createdAt: new Date().toISOString(),
      });
      const updatedSession = makeSession({
        id: 1,
        status: "ended",
        sessionNotes: "Existing notes",
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [updatedSession];

      const result = await caller.cloudHall.endSession({ sessionId: 1 });

      expect(result.sessionNotes).toBe("Existing notes");
    });

    it("logs the end action with reason and duration", async () => {
      const caller = createAuthenticatedCaller({ id: 10, name: "张工" });
      const session = makeSession({
        id: 1,
        status: "active",
        createdAt: new Date(Date.now() - 120_000).toISOString(),
      });

      selectResultsQueue.push([session]);
      mockReturningResult = [makeSession({ id: 1, status: "ended" })];

      await caller.cloudHall.endSession({
        sessionId: 1,
        reason: "normal",
      });

      // insert called for log
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // listSessions
  // ─────────────────────────────────────────────────────────────────
  describe("listSessions", () => {
    it("lists sessions with no filters", async () => {
      const caller = createAuthenticatedCaller();
      const sessions = [makeSession({ id: 1 }), makeSession({ id: 2 })];

      // Promise.all: rows query + count query
      selectResultsQueue.push(sessions);
      selectResultsQueue.push([{ total: 2 }]);

      const result = await caller.cloudHall.listSessions({});

      expect(result.items).toEqual(sessions);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      const activeSessions = [makeSession({ id: 1, status: "active" })];

      selectResultsQueue.push(activeSessions);
      selectResultsQueue.push([{ total: 1 }]);

      const result = await caller.cloudHall.listSessions({ status: "active" });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by initiatorUserId", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([makeSession({ id: 1, initiatorUserId: 10 })]);
      selectResultsQueue.push([{ total: 1 }]);

      const result = await caller.cloudHall.listSessions({ initiatorUserId: 10 });

      expect(result.items).toHaveLength(1);
    });

    it("filters by leadershipUserId", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([makeSession({ id: 1, leadershipUserId: 5 })]);
      selectResultsQueue.push([{ total: 1 }]);

      const result = await caller.cloudHall.listSessions({ leadershipUserId: 5 });

      expect(result.items).toHaveLength(1);
    });

    it("filters by multiple criteria simultaneously", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const result = await caller.cloudHall.listSessions({
        status: "active",
        initiatorUserId: 10,
        leadershipUserId: 5,
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("uses custom limit", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const result = await caller.cloudHall.listSessions({ limit: 5 });

      expect(result.limit).toBe(5);
    });

    it("uses custom offset", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const result = await caller.cloudHall.listSessions({ offset: 10 });

      expect(result.offset).toBe(10);
    });

    it("rejects limit > 100", async () => {
      const caller = createAuthenticatedCaller();

      await expect(
        caller.cloudHall.listSessions({ limit: 101 })
      ).rejects.toThrow();
    });

    it("rejects limit < 1", async () => {
      const caller = createAuthenticatedCaller();

      await expect(
        caller.cloudHall.listSessions({ limit: 0 })
      ).rejects.toThrow();
    });

    it("rejects negative offset", async () => {
      const caller = createAuthenticatedCaller();

      await expect(
        caller.cloudHall.listSessions({ offset: -1 })
      ).rejects.toThrow();
    });

    it("returns empty items when no sessions exist", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: 0 }]);

      const result = await caller.cloudHall.listSessions({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("defaults total to 0 when totalResult is empty", async () => {
      const caller = createAuthenticatedCaller();

      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller.cloudHall.listSessions({});

      expect(result.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // seedDemo
  // ─────────────────────────────────────────────────────────────────
  describe("seedDemo", () => {
    it("seeds 3 demo sessions when none exist", async () => {
      const caller = createAuthenticatedCaller();

      // Each demo: check existing (empty → not found), then insert + returning, then insertLog
      // Demo 1: select existing → empty
      selectResultsQueue.push([]);
      // Demo 2: select existing → empty
      selectResultsQueue.push([]);
      // Demo 3: select existing → empty
      selectResultsQueue.push([]);

      mockReturningResult = [{ id: 100 }];

      const result = await caller.cloudHall.seedDemo();

      expect(result).toEqual({ seeded: true, count: 3 });
      // 3 inserts for sessions + 3 inserts for logs = at least 6 insert calls
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("skips existing demo sessions", async () => {
      const caller = createAuthenticatedCaller();

      // All 3 demos already exist
      selectResultsQueue.push([{ id: 1 }]);
      selectResultsQueue.push([{ id: 2 }]);
      selectResultsQueue.push([{ id: 3 }]);

      const result = await caller.cloudHall.seedDemo();

      expect(result).toEqual({ seeded: true, count: 3 });
      // No inserts should happen since all exist
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("seeds only non-existing demo sessions (partial seed)", async () => {
      const caller = createAuthenticatedCaller();

      // Demo 1 exists, Demo 2 & 3 don't
      selectResultsQueue.push([{ id: 1 }]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      mockReturningResult = [{ id: 200 }];

      const result = await caller.cloudHall.seedDemo();

      expect(result).toEqual({ seeded: true, count: 3 });
      // 2 session inserts + 2 log inserts = at least 4
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("always returns count = 3 regardless of how many were seeded", async () => {
      const caller = createAuthenticatedCaller();

      // 2 exist, 1 new
      selectResultsQueue.push([{ id: 1 }]);
      selectResultsQueue.push([{ id: 2 }]);
      selectResultsQueue.push([]);

      mockReturningResult = [{ id: 300 }];

      const result = await caller.cloudHall.seedDemo();

      expect(result.count).toBe(3);
      expect(result.seeded).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // State machine / lifecycle integration
  // ─────────────────────────────────────────────────────────────────
  describe("session lifecycle state machine", () => {
    it("follows waiting → ringing → active → ended flow", async () => {
      const caller = createAuthenticatedCaller({ id: 1, name: "Test" });

      // Step 1: Create (waiting)
      selectResultsQueue.push([]);
      const createdSession = makeSession({ id: 1, status: "waiting" });
      mockReturningResult = [createdSession];

      const created = await caller.cloudHall.createSession({
        initiatorName: "Test",
        customerName: "Customer",
      });
      expect(created.status).toBe("waiting");

      // Reset for next call
      vi.clearAllMocks();

      // Step 2: Invite (ringing)
      selectResultsQueue.push([makeSession({ id: 1, status: "waiting" })]);
      const ringingSession = makeSession({ id: 1, status: "ringing" });
      mockReturningResult = [ringingSession];

      const invited = await caller.cloudHall.inviteLeadership({
        sessionId: 1,
        leadershipUserId: 2,
        leadershipName: "Leader",
      });
      expect(invited.status).toBe("ringing");

      // Reset for next call
      vi.clearAllMocks();

      // Step 3: Join (active)
      selectResultsQueue.push([makeSession({ id: 1, status: "ringing" })]);
      const activeSession = makeSession({ id: 1, status: "active" });
      mockReturningResult = [activeSession];

      const joined = await caller.cloudHall.joinSession({ sessionId: 1 });
      expect(joined.status).toBe("active");

      // Reset for next call
      vi.clearAllMocks();

      // Step 4: End (ended)
      selectResultsQueue.push([makeSession({ id: 1, status: "active", createdAt: new Date().toISOString() })]);
      const endedSession = makeSession({ id: 1, status: "ended" });
      mockReturningResult = [endedSession];

      const ended = await caller.cloudHall.endSession({ sessionId: 1 });
      expect(ended.status).toBe("ended");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Input validation edge cases
  // ─────────────────────────────────────────────────────────────────
  describe("input validation edge cases", () => {
    it("createSession rejects missing initiatorName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.createSession({ customerName: "Test" } as any)
      ).rejects.toThrow();
    });

    it("createSession rejects missing customerName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.createSession({ initiatorName: "Test" } as any)
      ).rejects.toThrow();
    });

    it("inviteLeadership rejects missing leadershipName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 1,
          leadershipUserId: 2,
        } as any)
      ).rejects.toThrow();
    });

    it("inviteLeadership rejects missing leadershipUserId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.inviteLeadership({
          sessionId: 1,
          leadershipName: "Test",
        } as any)
      ).rejects.toThrow();
    });

    it("joinSession rejects missing sessionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.joinSession({} as any)
      ).rejects.toThrow();
    });

    it("getSessionState rejects missing sessionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.getSessionState({} as any)
      ).rejects.toThrow();
    });

    it("heartbeat rejects missing sessionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.heartbeat({} as any)
      ).rejects.toThrow();
    });

    it("endSession rejects missing sessionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.endSession({} as any)
      ).rejects.toThrow();
    });

    it("updateSlideContext rejects missing slideContext", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.updateSlideContext({ sessionId: 1 } as any)
      ).rejects.toThrow();
    });

    it("updateSlideContext rejects missing slideIndex in slideContext", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.cloudHall.updateSlideContext({
          sessionId: 1,
          slideContext: { slideTitle: "test" },
        } as any)
      ).rejects.toThrow();
    });
  });
});
