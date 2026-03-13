/**
 * Digital Twin Router — Unit Tests
 * Tests 12 procedures: listAssets, getAsset, createAsset, updateAsset,
 * submitForReview, publishVersion, approveAsset, freezeAsset, verifyHash,
 * listAssemblyNodes, createAssemblyNode, listAuditLogs, getStats
 *
 * Mocking strategy:
 *   - Service functions (createAsset, publishAssetVersion, approveAsset, freezeAsset, verifyHash)
 *     are mocked via vi.mock("../services/digital-twin.service")
 *   - DB (requireDb) is mocked for direct Drizzle ORM queries
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const {
  mockCreateAsset,
  mockPublishAssetVersion,
  mockApproveAsset,
  mockFreezeAsset,
  mockVerifyHash,
  selectResultsQueue,
  mockReturningResult,
} = vi.hoisted(() => {
  const mockCreateAsset = vi.fn();
  const mockPublishAssetVersion = vi.fn();
  const mockApproveAsset = vi.fn();
  const mockFreezeAsset = vi.fn();
  const mockVerifyHash = vi.fn();
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return {
    mockCreateAsset,
    mockPublishAssetVersion,
    mockApproveAsset,
    mockFreezeAsset,
    mockVerifyHash,
    selectResultsQueue,
    mockReturningResult,
  };
});

// Mock service functions
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../services/digital-twin.service", () => ({
  createAsset: mockCreateAsset,
  publishAssetVersion: mockPublishAssetVersion,
  approveAsset: mockApproveAsset,
  freezeAsset: mockFreezeAsset,
  verifyHash: mockVerifyHash,
}));

// Mock DB
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
        const r = mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
        mockReturningResult.length = 0;
        return Object.assign(Promise.resolve(r), { then: (resolve: any) => Promise.resolve(r).then(resolve), catch: (fn: any) => Promise.resolve(r) });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };

    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
    return db;
  }),
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  ilike: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

const caller = () => createAuthenticatedCaller();

// ── Sample data ──
const sampleAsset = {
  id: 1, projectId: 10, projectCode: "PRJ-001", assetName: "Robot Arm V1",
  assetNumber: "DT-001", version: 1, versionString: "V1.0",
  fileFormat: "glb", storageUrl: "/uploads/robot.glb",
  sha256Hash: "abc123def456", status: "draft", isLatest: true,
  designFrozen: false, ownerUserId: 1, ownerName: "Test User",
  description: "Main robot arm", tags: ["robot"], createdBy: 1,
  updatedBy: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleNode = {
  id: 1, dtAssetId: 1, partNumber: "P-001", partName: "Gripper",
  positionX: "0", positionY: "0", positionZ: "0",
  assemblySequence: 1, toolRequired: "Torque Wrench",
};

const sampleAuditLog = {
  id: 1, assetId: 1, action: "upload", actorId: 1, actorName: "Test User",
  hashAtAction: "abc123", previousStatus: null, newStatus: "draft",
  assetVersion: 1, timestampUtc: "2026-01-01T00:00:00Z",
  details: "Initial upload",
};

describe("digital-twin router", () => {

  // ═══ listAssets ═══
  describe("listAssets", () => {
    it("returns items and total with no filters", async () => {
      selectResultsQueue.push([sampleAsset]); // items
      selectResultsQueue.push([{ value: 1 }]); // count
      const result = await caller().digitalTwin.listAssets();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 1);
    });

    it("applies projectId filter", async () => {
      selectResultsQueue.push([]); // items
      selectResultsQueue.push([{ value: 0 }]); // count
      const result = await caller().digitalTwin.listAssets({ projectId: 10 });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it("applies search filter", async () => {
      selectResultsQueue.push([sampleAsset]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().digitalTwin.listAssets({ search: "Robot" });
      expect(result.items).toHaveLength(1);
    });

    it("applies fileFormat and status filters", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller().digitalTwin.listAssets({
        fileFormat: "step", status: "released",
      });
      expect(result.total).toBe(0);
    });

    it("applies isLatest filter", async () => {
      selectResultsQueue.push([sampleAsset]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().digitalTwin.listAssets({ isLatest: true });
      expect(result.items).toHaveLength(1);
    });

    it("supports pagination", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 20 }]);
      const result = await caller().digitalTwin.listAssets({ limit: 10, offset: 10 });
      expect(result.total).toBe(20);
    });
  });

  // ═══ getAsset ═══
  describe("getAsset", () => {
    it("returns asset with version chain, assembly nodes, and audit logs", async () => {
      // First select: asset lookup
      selectResultsQueue.push([sampleAsset]);
      // Promise.all: versionChain, assemblyNodes, auditLogs
      selectResultsQueue.push([sampleAsset]); // version chain
      selectResultsQueue.push([sampleNode]); // assembly nodes
      selectResultsQueue.push([sampleAuditLog]); // audit logs
      const result = await caller().digitalTwin.getAsset({ id: 1 });
      expect(result).toHaveProperty("assetName", "Robot Arm V1");
      expect(result).toHaveProperty("versionChain");
      expect(result).toHaveProperty("assemblyNodes");
      expect(result).toHaveProperty("auditLogs");
    });

    it("returns null for missing asset", async () => {
      selectResultsQueue.push([]);
      const result = await caller().digitalTwin.getAsset({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string ID", async () => {
      selectResultsQueue.push([sampleAsset]);
      selectResultsQueue.push([]); // version chain (no assetNumber match)
      selectResultsQueue.push([]); // assembly nodes
      selectResultsQueue.push([]); // audit logs
      const result = await caller().digitalTwin.getAsset({ id: "1" });
      expect(result).toBeTruthy();
    });
  });

  // ═══ createAsset ═══
  describe("createAsset", () => {
    it("delegates to service createAsset", async () => {
      const expected = { id: 5, assetName: "New Asset" };
      mockCreateAsset.mockResolvedValueOnce(expected);
      const result = await caller().digitalTwin.createAsset({
        assetName: "New Asset",
        fileFormat: "glb",
        storageUrl: "/uploads/new.glb",
        sha256Hash: "hash123",
      });
      expect(mockCreateAsset).toHaveBeenCalledTimes(1);
      expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({
        assetName: "New Asset",
        fileFormat: "glb",
        createdBy: 1, // ctx.user.id
      }));
      expect(result).toEqual(expected);
    });

    it("passes optional fields to service", async () => {
      mockCreateAsset.mockResolvedValueOnce({ id: 6 });
      await caller().digitalTwin.createAsset({
        assetName: "Full Asset",
        fileFormat: "step",
        storageUrl: "/uploads/full.step",
        sha256Hash: "fullhash",
        projectId: 10,
        description: "Detailed asset",
        tags: ["mechanical", "v2"],
        vertexCount: 5000,
        faceCount: 3000,
      });
      expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 10,
        description: "Detailed asset",
        tags: ["mechanical", "v2"],
        vertexCount: 5000,
        faceCount: 3000,
      }));
    });

    it("rejects empty assetName", async () => {
      await expect(caller().digitalTwin.createAsset({
        assetName: "",
        fileFormat: "glb",
        storageUrl: "/uploads/x.glb",
        sha256Hash: "h",
      })).rejects.toThrow();
    });

    it("rejects invalid fileFormat", async () => {
      await expect(caller().digitalTwin.createAsset({
        assetName: "X",
        fileFormat: "invalid" as any,
        storageUrl: "/x",
        sha256Hash: "h",
      })).rejects.toThrow();
    });
  });

  // ═══ updateAsset ═══
  describe("updateAsset", () => {
    it("updates mutable fields on non-frozen asset", async () => {
      selectResultsQueue.push([{ ...sampleAsset, designFrozen: false }]); // exists check
      // No ownerUserId → skip FK check
      mockReturningResult.push({ ...sampleAsset, assetName: "Updated Name" });
      const result = await caller().digitalTwin.updateAsset({
        id: 1, assetName: "Updated Name",
      });
      expect(result).toHaveProperty("assetName", "Updated Name");
    });

    it("throws for missing asset", async () => {
      selectResultsQueue.push([]); // not found
      await expect(caller().digitalTwin.updateAsset({
        id: 999, assetName: "X",
      })).rejects.toThrow(/not found/);
    });

    it("throws for design-frozen asset", async () => {
      selectResultsQueue.push([{ ...sampleAsset, designFrozen: true }]);
      await expect(caller().digitalTwin.updateAsset({
        id: 1, assetName: "X",
      })).rejects.toThrow(/design-frozen/);
    });

    it("validates ownerUserId FK", async () => {
      selectResultsQueue.push([{ ...sampleAsset, designFrozen: false }]); // exists
      selectResultsQueue.push([]); // user FK check fails
      await expect(caller().digitalTwin.updateAsset({
        id: 1, ownerUserId: 999,
      })).rejects.toThrow(/FK violation/);
    });
  });

  // ═══ submitForReview ═══
  describe("submitForReview", () => {
    it("transitions draft → pending_review", async () => {
      selectResultsQueue.push([{ ...sampleAsset, status: "draft" }]); // exists
      mockReturningResult.push({ ...sampleAsset, status: "pending_review" });
      // audit log insert is fire-and-forget
      const result = await caller().digitalTwin.submitForReview({ assetId: 1 });
      expect(result).toHaveProperty("status", "pending_review");
    });

    it("throws for non-draft asset", async () => {
      selectResultsQueue.push([{ ...sampleAsset, status: "released" }]);
      await expect(caller().digitalTwin.submitForReview({ assetId: 1 }))
        .rejects.toThrow(/must be 'draft'/);
    });

    it("throws for missing asset", async () => {
      selectResultsQueue.push([]);
      await expect(caller().digitalTwin.submitForReview({ assetId: 999 }))
        .rejects.toThrow(/not found/);
    });
  });

  // ═══ publishVersion ═══
  describe("publishVersion", () => {
    it("delegates to publishAssetVersion service", async () => {
      const newAsset = { id: 2, version: 2, versionString: "V2.0" };
      mockPublishAssetVersion.mockResolvedValueOnce(newAsset);
      const result = await caller().digitalTwin.publishVersion({
        previousAssetId: 1,
        storageUrl: "/uploads/v2.glb",
        sha256Hash: "newhash",
      });
      expect(mockPublishAssetVersion).toHaveBeenCalledTimes(1);
      expect(mockPublishAssetVersion).toHaveBeenCalledWith(expect.objectContaining({
        previousAssetId: 1,
        uploadedBy: 1,
      }));
      expect(result).toEqual(newAsset);
    });

    it("passes optional fileFormat", async () => {
      mockPublishAssetVersion.mockResolvedValueOnce({ id: 3 });
      await caller().digitalTwin.publishVersion({
        previousAssetId: 1,
        storageUrl: "/x",
        sha256Hash: "h",
        fileFormat: "step",
      });
      expect(mockPublishAssetVersion).toHaveBeenCalledWith(expect.objectContaining({
        fileFormat: "step",
      }));
    });
  });

  // ═══ approveAsset ═══
  describe("approveAsset", () => {
    it("delegates to approveAsset service", async () => {
      const released = { id: 1, status: "released" };
      mockApproveAsset.mockResolvedValueOnce(released);
      const result = await caller().digitalTwin.approveAsset({ assetId: 1 });
      expect(mockApproveAsset).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 1,
        approvedBy: 1,
      }));
      expect(result).toEqual(released);
    });

    it("passes comments and ipAddress", async () => {
      mockApproveAsset.mockResolvedValueOnce({ id: 1 });
      await caller().digitalTwin.approveAsset({
        assetId: 1,
        comments: "LGTM",
        ipAddress: "192.168.1.1",
      });
      expect(mockApproveAsset).toHaveBeenCalledWith(expect.objectContaining({
        comments: "LGTM",
        ipAddress: "192.168.1.1",
      }));
    });
  });

  // ═══ freezeAsset ═══
  describe("freezeAsset", () => {
    it("delegates to freezeAsset service", async () => {
      const frozen = { id: 1, designFrozen: true };
      mockFreezeAsset.mockResolvedValueOnce(frozen);
      const result = await caller().digitalTwin.freezeAsset({ assetId: 1 });
      expect(mockFreezeAsset).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 1,
        frozenBy: 1,
      }));
      expect(result).toEqual(frozen);
    });
  });

  // ═══ verifyHash ═══
  describe("verifyHash", () => {
    it("delegates to verifyHash service", async () => {
      const verification = { isValid: true, expectedHash: "abc", computedHash: "abc" };
      mockVerifyHash.mockResolvedValueOnce(verification);
      const result = await caller().digitalTwin.verifyHash({
        assetId: 1,
        computedHash: "abc",
      });
      expect(mockVerifyHash).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 1,
        computedHash: "abc",
        verifiedBy: 1,
      }));
      expect(result).toEqual(verification);
    });
  });

  // ═══ listAssemblyNodes ═══
  describe("listAssemblyNodes", () => {
    it("returns nodes for given asset", async () => {
      selectResultsQueue.push([sampleNode, { ...sampleNode, id: 2, partNumber: "P-002" }]);
      const result = await caller().digitalTwin.listAssemblyNodes({ dtAssetId: 1 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 2);
    });

    it("returns empty for asset with no nodes", async () => {
      selectResultsQueue.push([]);
      const result = await caller().digitalTwin.listAssemblyNodes({ dtAssetId: 999 });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ createAssemblyNode ═══
  describe("createAssemblyNode", () => {
    it("creates node after validating asset FK", async () => {
      selectResultsQueue.push([{ id: 1 }]); // asset exists
      mockReturningResult.push(sampleNode);
      const result = await caller().digitalTwin.createAssemblyNode({
        dtAssetId: 1,
        partNumber: "P-001",
        positionX: "0",
        positionY: "0",
        positionZ: "0",
      });
      expect(result).toHaveProperty("partNumber", "P-001");
    });

    it("throws for non-existent asset", async () => {
      selectResultsQueue.push([]); // asset not found
      await expect(caller().digitalTwin.createAssemblyNode({
        dtAssetId: 999,
        partNumber: "P-001",
        positionX: "0",
        positionY: "0",
        positionZ: "0",
      })).rejects.toThrow(/FK violation/);
    });

    it("rejects empty partNumber", async () => {
      await expect(caller().digitalTwin.createAssemblyNode({
        dtAssetId: 1,
        partNumber: "",
        positionX: "0",
        positionY: "0",
        positionZ: "0",
      })).rejects.toThrow();
    });
  });

  // ═══ listAuditLogs ═══
  describe("listAuditLogs", () => {
    it("returns logs and total with no filters", async () => {
      selectResultsQueue.push([sampleAuditLog]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().digitalTwin.listAuditLogs();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 1);
    });

    it("applies assetId filter", async () => {
      selectResultsQueue.push([sampleAuditLog]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().digitalTwin.listAuditLogs({ assetId: 1 });
      expect(result.total).toBe(1);
    });

    it("applies actorId and action filters", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller().digitalTwin.listAuditLogs({
        actorId: 1, action: "approve",
      });
      expect(result.total).toBe(0);
    });

    it("supports pagination", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 50 }]);
      const result = await caller().digitalTwin.listAuditLogs({ limit: 10, offset: 20 });
      expect(result.total).toBe(50);
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns dashboard stats", async () => {
      selectResultsQueue.push([{ value: 100 }]); // total
      selectResultsQueue.push([{ value: 60 }]);  // released
      selectResultsQueue.push([{ value: 10 }]);  // pendingReview
      selectResultsQueue.push([{ value: 40 }]);  // frozen
      selectResultsQueue.push([{ value: 30 }]);  // glb
      const result = await caller().digitalTwin.getStats();
      expect(result).toEqual({
        total: 100,
        released: 60,
        pendingReview: 10,
        frozen: 40,
        glbViewable: 30,
        complianceRate: 100, // (60 + 40) / 100 * 100
      });
    });

    it("returns 0 complianceRate when no assets", async () => {
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller().digitalTwin.getStats();
      expect(result.complianceRate).toBe(0);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([{ value: 5 }]);
      selectResultsQueue.push([{ value: 3 }]);
      selectResultsQueue.push([{ value: 1 }]);
      selectResultsQueue.push([{ value: 2 }]);
      selectResultsQueue.push([{ value: 4 }]);
      const result = await caller().digitalTwin.getStats({ projectId: 10 });
      expect(result.total).toBe(5);
      expect(result.complianceRate).toBe(100); // (3+2)/5*100 = 100
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for listAssets", async () => {
      await expect(createAnonymousCaller().digitalTwin.listAssets()).rejects.toThrow();
    });
    it("rejects anonymous for getAsset", async () => {
      await expect(createAnonymousCaller().digitalTwin.getAsset({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for createAsset", async () => {
      await expect(createAnonymousCaller().digitalTwin.createAsset({
        assetName: "X", fileFormat: "glb", storageUrl: "/x", sha256Hash: "h",
      })).rejects.toThrow();
    });
    it("rejects anonymous for updateAsset", async () => {
      await expect(createAnonymousCaller().digitalTwin.updateAsset({
        id: 1, assetName: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for submitForReview", async () => {
      await expect(createAnonymousCaller().digitalTwin.submitForReview({ assetId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for publishVersion", async () => {
      await expect(createAnonymousCaller().digitalTwin.publishVersion({
        previousAssetId: 1, storageUrl: "/x", sha256Hash: "h",
      })).rejects.toThrow();
    });
    it("rejects anonymous for approveAsset", async () => {
      await expect(createAnonymousCaller().digitalTwin.approveAsset({ assetId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for freezeAsset", async () => {
      await expect(createAnonymousCaller().digitalTwin.freezeAsset({ assetId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for verifyHash", async () => {
      await expect(createAnonymousCaller().digitalTwin.verifyHash({
        assetId: 1, computedHash: "h",
      })).rejects.toThrow();
    });
    it("rejects anonymous for listAssemblyNodes", async () => {
      await expect(createAnonymousCaller().digitalTwin.listAssemblyNodes({ dtAssetId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for createAssemblyNode", async () => {
      await expect(createAnonymousCaller().digitalTwin.createAssemblyNode({
        dtAssetId: 1, partNumber: "P", positionX: "0", positionY: "0", positionZ: "0",
      })).rejects.toThrow();
    });
    it("rejects anonymous for listAuditLogs", async () => {
      await expect(createAnonymousCaller().digitalTwin.listAuditLogs()).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().digitalTwin.getStats()).rejects.toThrow();
    });
  });
});
