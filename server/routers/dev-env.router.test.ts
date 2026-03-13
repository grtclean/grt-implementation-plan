/**
 * Dev-Env Router — Unit Tests
 *
 * Covers 4 procedures:
 *   checkMechElecSync, runOilingSimulation, getSharePointTree, getInitStatus
 *
 * Run: npx vitest run server/routers/dev-env.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ────────────────────────────────────────────────────────────

const selectResultsQueue: any[] = [];
const returningQueue: any[] = [];

function makeChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => {
    if (returningQueue.length > 0) return Promise.resolve(returningQueue.shift()!);
    return Promise.resolve([{ id: 1 }]);
  });
  chain.then = (resolve: any, reject?: any) => {
    try {
      if (selectResultsQueue.length > 0) return resolve(selectResultsQueue.shift()!);
      return resolve([]);
    } catch (e) { if (reject) return reject(e); throw e; }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => makeChain()),
  insert: vi.fn(() => makeChain()),
  update: vi.fn(() => makeChain()),
  delete: vi.fn(() => makeChain()),
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
  transaction: vi.fn(async (fn: any) => fn(mockDb)),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock design-conflict-check service ────────────────────────────────

const mockConflictResult = {
  projectId: 1,
  hasConflicts: false,
  conflicts: [],
  plcVersion: "v1.0.0",
  recommendation: "No conflicts detected",
};

const mockCheckDesignConflicts = vi.fn(async () => ({ ...mockConflictResult }));
const mockLogDesignSyncEvent = vi.fn(async () => {});

vi.mock("../services/design-conflict-check.service", () => ({
  checkDesignConflicts: (...args: any[]) => mockCheckDesignConflicts(...args),
  logDesignSyncEvent: (...args: any[]) => mockLogDesignSyncEvent(...args),
}));

// ── Mock oiling-control-guard service ─────────────────────────────────

const mockComputeVedScore = vi.fn(() => 85);

vi.mock("../services/oiling-control-guard.service", () => ({
  computeVedScore: (...args: any[]) => mockComputeVedScore(...args),
}));

// ── Mock telemetry SSE ────────────────────────────────────────────────

const mockPublish = vi.fn();

vi.mock("../services/telemetry-sse.service", () => ({
  sseManager: { publish: (...args: any[]) => mockPublish(...args) },
}));

// ── Mock SharePoint service ───────────────────────────────────────────

const mockListSites = vi.fn(async () => [
  { id: 1, siteCode: "GRT-HQ", cluster: "A", name: "总部", nameEn: "HQ", isActive: true },
  { id: 2, siteCode: "GRT-SH", cluster: "A", name: "上海", nameEn: "Shanghai", isActive: true },
]);
const mockGetClusterSummary = vi.fn(async () => [
  { cluster: "A", clusterName: "核心", clusterNameEn: "Core", siteCount: 2, totalFolders: 24 },
]);

vi.mock("../services/microsoft-graph/sharepoint-site.service", () => ({
  sharepointSiteService: {
    listSites: (...args: any[]) => mockListSites(...args),
    getClusterSummary: (...args: any[]) => mockGetClusterSummary(...args),
  },
}));

// ── Mock logger ────────────────────────────────────────────────────────

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

// ── Import callers AFTER mocks ─────────────────────────────────────────

import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Helpers ────────────────────────────────────────────────────────────

function resetQueues() {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
}

function queueSelect(...results: any[]) { selectResultsQueue.push(...results); }
function queueReturning(...results: any[]) { returningQueue.push(...results); }

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("devEnv router", () => {
  beforeEach(resetQueues);

  // ─── Auth guards ───────────────────────────────────────────────

  describe("auth guards", () => {
    it("rejects anonymous on checkMechElecSync", async () => {
      const anon = createAnonymousCaller();
      await expect(
        anon.devEnv.checkMechElecSync({ projectId: 1 }),
      ).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });

    it("rejects anonymous on runOilingSimulation", async () => {
      const anon = createAnonymousCaller();
      await expect(
        anon.devEnv.runOilingSimulation({ projectId: 1 }),
      ).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });

    it("rejects anonymous on getSharePointTree", async () => {
      const anon = createAnonymousCaller();
      await expect(
        anon.devEnv.getSharePointTree({}),
      ).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });

    it("rejects anonymous on getInitStatus", async () => {
      const anon = createAnonymousCaller();
      await expect(
        anon.devEnv.getInitStatus(),
      ).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });
  });

  // ─── checkMechElecSync ─────────────────────────────────────────

  describe("checkMechElecSync", () => {
    it("returns blockedPush=false when no conflicts", async () => {
      mockCheckDesignConflicts.mockResolvedValueOnce({
        projectId: 1,
        hasConflicts: false,
        conflicts: [],
        plcVersion: "v1.0.0",
        recommendation: "All clear",
      });

      const caller = createAdminCaller();
      const result = await caller.devEnv.checkMechElecSync({ projectId: 1 });

      expect(result.blockedPush).toBe(false);
      expect(result.blockingConflictCount).toBe(0);
      expect(mockCheckDesignConflicts).toHaveBeenCalledWith(1);
      expect(mockLogDesignSyncEvent).not.toHaveBeenCalled();
    });

    it("returns blockedPush=true with blocking conflicts", async () => {
      mockCheckDesignConflicts.mockResolvedValueOnce({
        projectId: 1,
        hasConflicts: true,
        conflicts: [
          {
            stationId: 10,
            stationCode: "ST-01",
            stationName: "Pre-Wash",
            lastMechUpdate: "2026-03-10T10:00:00Z",
            lastPlcGen: null,
            lastEplanGen: null,
            conflictType: "NO_PLC_VERSION",
            severity: "blocking",
            message: "No PLC version for station ST-01",
          },
          {
            stationId: 11,
            stationCode: "ST-02",
            stationName: "Spray",
            lastMechUpdate: "2026-03-10T10:00:00Z",
            lastPlcGen: "2026-03-09T10:00:00Z",
            lastEplanGen: null,
            conflictType: "MECH_UPDATED_AFTER_PLC",
            severity: "blocking",
            message: "Mechanical changes after PLC gen",
          },
        ],
        plcVersion: "v0.9.0",
        recommendation: "Regenerate PLC code",
      });

      const caller = createAdminCaller();
      const result = await caller.devEnv.checkMechElecSync({ projectId: 1 });

      expect(result.blockedPush).toBe(true);
      expect(result.blockingConflictCount).toBe(2);
      expect(mockLogDesignSyncEvent).toHaveBeenCalledOnce();
      expect(mockLogDesignSyncEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 1,
          eventType: "conflict_detected",
          severity: "critical",
        }),
      );
    });

    it("ignores warning-level conflicts for push blocking", async () => {
      mockCheckDesignConflicts.mockResolvedValueOnce({
        projectId: 1,
        hasConflicts: true,
        conflicts: [
          {
            stationId: 10,
            stationCode: "ST-01",
            stationName: "Rinse",
            lastMechUpdate: "2026-03-10T10:00:00Z",
            lastPlcGen: "2026-03-10T10:00:00Z",
            lastEplanGen: "2026-03-09T10:00:00Z",
            conflictType: "EPLAN_STALE",
            severity: "warning",
            message: "EPLAN export is stale",
          },
        ],
        plcVersion: "v1.0.0",
        recommendation: "Consider re-exporting EPLAN",
      });

      const caller = createAdminCaller();
      const result = await caller.devEnv.checkMechElecSync({ projectId: 1 });

      expect(result.blockedPush).toBe(false);
      expect(result.blockingConflictCount).toBe(0);
      expect(result.hasConflicts).toBe(true);
    });
  });

  // ─── runOilingSimulation ───────────────────────────────────────

  describe("runOilingSimulation", () => {
    it("returns pass=true when all readings within tolerance", async () => {
      // Make computeVedScore return high score (all pass scenario)
      mockComputeVedScore.mockReturnValue(95);

      const caller = createAdminCaller();
      // Mock Math.random to produce small jitter (well within 0.5mm)
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Produces 0 jitter (center)
      try {
        const result = await caller.devEnv.runOilingSimulation({ projectId: 1 });
        expect(result.pass).toBe(true);
        expect(result.readings).toHaveLength(5);
        expect(result.riskWarningLogged).toBe(false);
        expect(mockPublish).not.toHaveBeenCalled();
      } finally {
        Math.random = originalRandom;
      }
    });

    it("logs warning when ΔPos > 0.5mm", async () => {
      mockComputeVedScore.mockReturnValue(30);

      const caller = createAdminCaller();
      // Mock Math.random to produce large jitter (exceeds 0.5mm)
      const originalRandom = Math.random;
      Math.random = () => 1.0; // Produces +0.8mm jitter per axis → ~1.39mm delta
      try {
        const result = await caller.devEnv.runOilingSimulation({ projectId: 1 });
        expect(result.pass).toBe(false);
        expect(result.riskWarningLogged).toBe(true);
        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockPublish).toHaveBeenCalledWith(
          "dev:oiling-check",
          expect.objectContaining({
            type: "oiling_simulation_warning",
            projectId: 1,
          }),
        );
      } finally {
        Math.random = originalRandom;
      }
    });

    it("calls computeVedScore for each reading", async () => {
      mockComputeVedScore.mockReturnValue(85);

      const caller = createAdminCaller();
      const originalRandom = Math.random;
      Math.random = () => 0.5;
      try {
        await caller.devEnv.runOilingSimulation({});
        expect(mockComputeVedScore).toHaveBeenCalledTimes(5);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("defaults projectId to 1 when not provided", async () => {
      mockComputeVedScore.mockReturnValue(95);
      const caller = createAdminCaller();
      const originalRandom = Math.random;
      Math.random = () => 0.5;
      try {
        const result = await caller.devEnv.runOilingSimulation({});
        expect(result.pass).toBe(true);
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  // ─── getSharePointTree ─────────────────────────────────────────

  describe("getSharePointTree", () => {
    it("returns site list and cluster summary", async () => {
      const caller = createAdminCaller();
      const result = await caller.devEnv.getSharePointTree({});

      expect(result.totalSites).toBe(2);
      expect(result.sites).toHaveLength(2);
      expect(result.clusterSummary).toHaveLength(1);
      expect(result.projectFolderTemplate).toHaveLength(12);
      expect(mockListSites).toHaveBeenCalledWith(undefined);
    });

    it("passes cluster filter", async () => {
      const caller = createAdminCaller();
      await caller.devEnv.getSharePointTree({ cluster: "B" });
      expect(mockListSites).toHaveBeenCalledWith("B");
    });
  });

  // ─── getInitStatus ─────────────────────────────────────────────

  describe("getInitStatus", () => {
    it("returns 5 checklist items", async () => {
      const caller = createAdminCaller();
      const result = await caller.devEnv.getInitStatus();

      expect(result.checks).toHaveLength(5);
      expect(result.initScript).toBe("bash scripts/grt-init-dev-env.sh");
      expect(result.initScriptWindows).toBe("powershell scripts/grt-init-dev-env.ps1");
    });

    it("marks API connectivity as pass (always true when called)", async () => {
      const caller = createAdminCaller();
      const result = await caller.devEnv.getInitStatus();

      const apiCheck = result.checks.find((c: any) => c.step === "api_connectivity");
      expect(apiCheck).toBeDefined();
      expect((apiCheck as any).pass).toBe(true);
    });

    it("marks SharePoint as pass when sites available", async () => {
      const caller = createAdminCaller();
      const result = await caller.devEnv.getInitStatus();

      const spCheck = result.checks.find((c: any) => c.step === "sharepoint_access");
      expect(spCheck).toBeDefined();
      expect((spCheck as any).pass).toBe(true);
      expect((spCheck as any).siteCount).toBe(2);
    });

    it("marks SharePoint as fail when service throws", async () => {
      mockListSites.mockRejectedValueOnce(new Error("SP unavailable"));

      const caller = createAdminCaller();
      const result = await caller.devEnv.getInitStatus();

      const spCheck = result.checks.find((c: any) => c.step === "sharepoint_access");
      expect((spCheck as any).pass).toBe(false);
    });
  });
});
