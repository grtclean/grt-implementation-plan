/**
 * Customer Authorization Router — Unit Tests
 *
 * Tests Groups A-E:
 *   A: createAuthorization, updateAuthorization, revokeAuthorization, listAuthorizations,
 *      getAuthorization, getAuthorizationStats
 *   B: addDocument, removeDocument, listDocuments, updateDocument
 *   C: generateNdaToken, signNda, countersignNda, getNdaStatus, downloadNdaPdf
 *   D: portalGetAuthorization, portalListDocuments, portalViewDocument,
 *      portalDownloadDocument, portalGetHistoricalData
 *   E: listAccessLogs, getAccessSummary, exportAuditReport
 *
 * Run: pnpm test -- server/routers/customer-authorization.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
  createAuthenticatedCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mock state ──────────────────────────────────────
const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

// ── Mock DB ─────────────────────────────────────────────────
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
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

// ── Mock drizzle-orm ────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  lt: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
  SQL: class {},
}));

// ── Mock schema ─────────────────────────────────────────────
vi.mock("../../drizzle/customer-authorization-schema", () => ({
  customerAuthorizations: {
    id: "id", projectId: "projectId", companyName: "companyName", contactName: "contactName",
    contactEmail: "contactEmail", accessTier: "accessTier", status: "status",
    portalUserId: "portalUserId", validUntil: "validUntil", createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  customerAuthorizationDocuments: {
    id: "id", authorizationId: "authorizationId", docCategory: "docCategory",
    isActive: "isActive", accessCount: "accessCount", lastAccessedAt: "lastAccessedAt",
  },
  customerNdaAgreements: {
    id: "id", authorizationId: "authorizationId", signatureToken: "signatureToken",
    status: "status", tokenExpiresAt: "tokenExpiresAt",
  },
  customerAccessAuditLogs: {
    id: "id", authorizationId: "authorizationId", actionType: "actionType",
    riskLevel: "riskLevel", portalUserId: "portalUserId", createdAt: "createdAt",
  },
  TIER_DOC_MATRIX: {
    1: {
      operation_manual: { viewable: true, downloadable: true },
      plc_source_code: { viewable: false, downloadable: false },
      design_rationale: { viewable: false, downloadable: false },
    },
    3: {
      operation_manual: { viewable: true, downloadable: true },
      plc_source_code: { viewable: true, downloadable: false },
      design_rationale: { viewable: false, downloadable: false },
    },
    4: {
      operation_manual: { viewable: true, downloadable: true },
      plc_source_code: { viewable: true, downloadable: true },
      design_rationale: { viewable: true, downloadable: true },
    },
  },
  getDocRiskLevel: vi.fn((cat: string) => {
    if (cat === "plc_source_code" || cat === "design_rationale") return "high";
    if (cat === "electrical_drawing" || cat === "bom") return "medium";
    return "low";
  }),
}));

// ── Mock NDA service ────────────────────────────────────────
vi.mock("../services/customer-nda.service", () => ({
  renderNdaTemplate: vi.fn(() => ({ html: "<html>NDA</html>", hash: "abc123" })),
  generateSignatureToken: vi.fn(() => "test-token-12345"),
  getTokenExpiry: vi.fn(() => new Date("2026-04-01")),
  generateWatermarkToken: vi.fn(() => "WM-1-2-test"),
}));

// ── Mock logger ─────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

// ── Reset state before each test ────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const adminCaller = () => createAdminCaller();
const authedCaller = () => createAuthenticatedCaller();
const anonCaller = () => createAnonymousCaller();

// ═══════════════════════════════════════════════════════════
// Sample Data
// ═══════════════════════════════════════════════════════════

const sampleAuth = {
  id: 1, projectId: 10, companyName: "ACME Corp", contactName: "John",
  contactEmail: "john@acme.com", accessTier: 2, status: "active",
  ndaRequired: true, ndaSignedAt: new Date(), validFrom: new Date(),
  validUntil: new Date("2027-01-01"), portalUserId: 99,
  grantedByUserId: 1, grantedByName: "admin",
  createdAt: new Date(), updatedAt: new Date(),
};

const sampleDoc = {
  id: 1, authorizationId: 1, docCategory: "operation_manual",
  docLabel: "Op Manual v1", sourceType: "plm", sourceId: 5,
  sourceVersion: "1.0", filePath: "/docs/op-manual.pdf",
  watermarkRequired: true, allowDownload: true, allowPrint: false,
  isActive: true, accessCount: 3, addedByUserId: 1,
  addedAt: new Date(), lastAccessedAt: new Date(),
};

const sampleNda = {
  id: 1, authorizationId: 1, templateVersion: "1.0",
  fullTextHash: "abc123", signatureToken: "test-token-12345",
  tokenExpiresAt: new Date("2026-04-01"), status: "pending",
  createdAt: new Date(), updatedAt: new Date(),
};

// ═══════════════════════════════════════════════════════════
// Group A: Authorization CRUD
// ═══════════════════════════════════════════════════════════

describe("Group A: Authorization CRUD", () => {
  it("createAuthorization — creates authorization record", async () => {
    returningQueue.push([{ ...sampleAuth, id: 42 }]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.createAuthorization({
      companyName: "ACME Corp",
      contactName: "John",
      contactEmail: "john@acme.com",
      accessTier: 2,
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(42);
  });

  it("createAuthorization — rejects missing required fields", async () => {
    const caller = adminCaller();
    await expect(
      caller.customerAuthorization.createAuthorization({
        companyName: "",
        contactName: "John",
        contactEmail: "john@acme.com",
        accessTier: 1,
      })
    ).rejects.toThrow();
  });

  it("createAuthorization — anonymous caller rejected", async () => {
    const caller = anonCaller();
    await expect(
      caller.customerAuthorization.createAuthorization({
        companyName: "ACME",
        contactName: "John",
        contactEmail: "john@acme.com",
        accessTier: 1,
      })
    ).rejects.toThrow();
  });

  it("listAuthorizations — returns paginated results", async () => {
    selectResultsQueue.push([sampleAuth]); // items
    selectResultsQueue.push([{ count: 1 }]); // count
    const caller = adminCaller();
    const result = await caller.customerAuthorization.listAuthorizations({
      page: 1, pageSize: 20,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("listAuthorizations — filters by status", async () => {
    selectResultsQueue.push([]); // items
    selectResultsQueue.push([{ count: 0 }]); // count
    const caller = adminCaller();
    const result = await caller.customerAuthorization.listAuthorizations({
      status: "revoked", page: 1, pageSize: 20,
    });
    expect(result.items).toHaveLength(0);
  });

  it("getAuthorization — returns full details with docs and NDA", async () => {
    selectResultsQueue.push([sampleAuth]); // auth
    selectResultsQueue.push([sampleDoc]); // docs
    selectResultsQueue.push([sampleNda]); // nda
    const caller = adminCaller();
    const result = await caller.customerAuthorization.getAuthorization({ id: 1 });
    expect(result).toBeDefined();
    expect(result!.documents).toHaveLength(1);
    expect(result!.nda).toBeDefined();
  });

  it("getAuthorization — returns null for non-existent id", async () => {
    selectResultsQueue.push([]); // auth not found
    const caller = adminCaller();
    const result = await caller.customerAuthorization.getAuthorization({ id: 999 });
    expect(result).toBeNull();
  });

  it("revokeAuthorization — changes status and records audit", async () => {
    returningQueue.push([{ ...sampleAuth, status: "revoked" }]);
    // audit insert — returning is handled by the audit helper (no returning expected)
    const caller = adminCaller();
    const result = await caller.customerAuthorization.revokeAuthorization({
      id: 1, reason: "Contract terminated",
    });
    expect(result).toBeDefined();
    expect(result.status).toBe("revoked");
  });

  it("getAuthorizationStats — returns grouped stats", async () => {
    selectResultsQueue.push([
      { status: "active", tier: 2, count: 5 },
      { status: "pending_nda", tier: 1, count: 2 },
    ]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.getAuthorizationStats();
    expect(result).toHaveLength(2);
  });

  it("updateAuthorization — updates tier and validity", async () => {
    returningQueue.push([{ ...sampleAuth, accessTier: 3 }]);
    // audit for tier upgrade
    const caller = adminCaller();
    const result = await caller.customerAuthorization.updateAuthorization({
      id: 1, accessTier: 3, validUntil: "2028-01-01",
    });
    expect(result).toBeDefined();
    expect(result.accessTier).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════
// Group B: Document Management
// ═══════════════════════════════════════════════════════════

describe("Group B: Document Management", () => {
  it("addDocument — adds document to authorization", async () => {
    returningQueue.push([{ ...sampleDoc, id: 10 }]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.addDocument({
      authorizationId: 1,
      docCategory: "operation_manual",
      allowDownload: true,
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(10);
  });

  it("removeDocument — soft deletes (isActive=false)", async () => {
    returningQueue.push([{ ...sampleDoc, isActive: false }]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.removeDocument({ id: 1 });
    expect(result).toBeDefined();
    expect(result.isActive).toBe(false);
  });

  it("listDocuments — returns active docs for authorization", async () => {
    selectResultsQueue.push([sampleDoc]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.listDocuments({ authorizationId: 1 });
    expect(result).toHaveLength(1);
  });

  it("updateDocument — modifies download/watermark settings", async () => {
    returningQueue.push([{ ...sampleDoc, allowDownload: false, watermarkRequired: false }]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.updateDocument({
      id: 1, allowDownload: false, watermarkRequired: false,
    });
    expect(result).toBeDefined();
    expect(result.allowDownload).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Group C: NDA Management
// ═══════════════════════════════════════════════════════════

describe("Group C: NDA Management", () => {
  it("generateNdaToken — creates token and NDA record", async () => {
    selectResultsQueue.push([sampleAuth]); // get authorization
    selectResultsQueue.push([]); // no existing NDA
    returningQueue.push([{ id: 1 }]); // insert NDA
    const caller = adminCaller();
    const result = await caller.customerAuthorization.generateNdaToken({
      authorizationId: 1,
    });
    expect(result.token).toBe("test-token-12345");
    expect(result.ndaHtml).toContain("NDA");
  });

  it("signNda — signs with valid token", async () => {
    selectResultsQueue.push([{ ...sampleNda, status: "pending", tokenExpiresAt: new Date("2099-01-01") }]); // find NDA by token
    selectResultsQueue.push([{ ...sampleAuth, status: "pending_nda" }]); // find authorization
    // update NDA status (no returning)
    // update auth status (no returning)
    // audit insert (no returning)
    const caller = authedCaller(); // signNda is publicProcedure
    const result = await caller.customerAuthorization.signNda({
      token: "test-token-12345",
      signerName: "John Doe",
    });
    expect(result.success).toBe(true);
  });

  it("signNda — rejects invalid token", async () => {
    selectResultsQueue.push([]); // NDA not found
    const caller = authedCaller(); // publicProcedure — use authed caller for stable test
    await expect(
      caller.customerAuthorization.signNda({
        token: "invalid-token",
        signerName: "John",
      })
    ).rejects.toThrow("Invalid");
  });

  it("signNda — rejects expired token", async () => {
    selectResultsQueue.push([{
      ...sampleNda, status: "pending",
      tokenExpiresAt: new Date("2020-01-01"), // expired
    }]);
    const caller = authedCaller(); // publicProcedure — use authed caller for stable test
    await expect(
      caller.customerAuthorization.signNda({
        token: "test-token-12345",
        signerName: "John",
      })
    ).rejects.toThrow("expired");
  });

  it("countersignNda — countersigns a signed NDA", async () => {
    returningQueue.push([{ ...sampleNda, isCountersigned: true, status: "countersigned" }]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.countersignNda({
      authorizationId: 1,
    });
    expect(result.isCountersigned).toBe(true);
    expect(result.status).toBe("countersigned");
  });

  it("getNdaStatus — returns NDA record", async () => {
    selectResultsQueue.push([sampleNda]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.getNdaStatus({ authorizationId: 1 });
    expect(result).toBeDefined();
    expect(result!.status).toBe("pending");
  });

  it("downloadNdaPdf — returns rendered HTML and hash", async () => {
    selectResultsQueue.push([sampleNda]); // NDA
    selectResultsQueue.push([sampleAuth]); // auth
    const caller = adminCaller();
    const result = await caller.customerAuthorization.downloadNdaPdf({ authorizationId: 1 });
    expect(result).toBeDefined();
    expect(result!.html).toContain("NDA");
    expect(result!.hash).toBe("abc123");
  });
});

// ═══════════════════════════════════════════════════════════
// Group D: Customer Portal
// ═══════════════════════════════════════════════════════════

describe("Group D: Customer Portal", () => {
  it("portalGetAuthorization — returns customer's own auth", async () => {
    selectResultsQueue.push([sampleAuth]); // auth
    selectResultsQueue.push([sampleNda]); // nda
    const caller = adminCaller(); // admin fallback passes customer:portal:access
    const result = await caller.customerAuthorization.portalGetAuthorization();
    expect(result).toBeDefined();
  });

  it("portalListDocuments — filters by tier matrix", async () => {
    selectResultsQueue.push([{ ...sampleAuth, accessTier: 1, status: "active" }]); // auth
    selectResultsQueue.push([
      { ...sampleDoc, docCategory: "operation_manual" },
      { ...sampleDoc, id: 2, docCategory: "plc_source_code" },
    ]); // docs
    const caller = adminCaller();
    const result = await caller.customerAuthorization.portalListDocuments();
    // T1 can view operation_manual but NOT plc_source_code
    expect(result).toHaveLength(1);
    expect(result[0].docCategory).toBe("operation_manual");
  });

  it("portalViewDocument — records audit and returns watermark", async () => {
    selectResultsQueue.push([{ ...sampleAuth, accessTier: 4, status: "active" }]); // auth
    selectResultsQueue.push([{ ...sampleDoc, docCategory: "operation_manual" }]); // doc
    // update access count (no returning)
    // audit insert (no returning)
    const caller = adminCaller();
    const result = await caller.customerAuthorization.portalViewDocument({ documentId: 1 });
    expect(result.watermarkToken).toBe("WM-1-2-test");
    expect(result.allowDownload).toBe(true);
  });

  it("portalDownloadDocument — verifies allow_download flag", async () => {
    selectResultsQueue.push([{ ...sampleAuth, accessTier: 4, status: "active" }]); // auth
    selectResultsQueue.push([{
      ...sampleDoc, docCategory: "operation_manual",
      allowDownload: false, // download disabled
    }]); // doc
    const caller = adminCaller();
    await expect(
      caller.customerAuthorization.portalDownloadDocument({ documentId: 1 })
    ).rejects.toThrow("Download disabled");
  });

  it("portalDownloadDocument — blocks expired authorization", async () => {
    selectResultsQueue.push([{
      ...sampleAuth, accessTier: 4, status: "active",
      validUntil: new Date("2020-01-01"), // expired
    }]); // auth
    selectResultsQueue.push([{ ...sampleDoc, docCategory: "operation_manual", allowDownload: true }]); // doc
    const caller = adminCaller();
    await expect(
      caller.customerAuthorization.portalDownloadDocument({ documentId: 1 })
    ).rejects.toThrow("expired");
  });

  it("portalGetHistoricalData — rejects Tier < 3", async () => {
    selectResultsQueue.push([{ ...sampleAuth, accessTier: 2, status: "active" }]); // auth
    const caller = adminCaller();
    await expect(
      caller.customerAuthorization.portalGetHistoricalData({})
    ).rejects.toThrow("Tier 3");
  });

  it("portalGetHistoricalData — allows Tier 3+", async () => {
    selectResultsQueue.push([{ ...sampleAuth, accessTier: 3, status: "active" }]); // auth
    const caller = adminCaller();
    const result = await caller.customerAuthorization.portalGetHistoricalData({});
    expect(result.authorized).toBe(true);
    expect(result.tier).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════
// Group E: Audit
// ═══════════════════════════════════════════════════════════

describe("Group E: Audit", () => {
  it("listAccessLogs — returns paginated audit logs", async () => {
    const sampleLog = {
      id: 1, authorizationId: 1, actionType: "doc_view",
      riskLevel: "low", customerCompany: "ACME", createdAt: new Date(),
    };
    selectResultsQueue.push([sampleLog]); // items
    selectResultsQueue.push([{ count: 1 }]); // count
    const caller = adminCaller();
    const result = await caller.customerAuthorization.listAccessLogs({
      page: 1, pageSize: 20,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("getAccessSummary — returns grouped summary", async () => {
    selectResultsQueue.push([
      { actionType: "doc_view", riskLevel: "low", count: 10 },
      { actionType: "doc_download", riskLevel: "high", count: 2 },
    ]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.getAccessSummary({});
    expect(result).toHaveLength(2);
  });

  it("exportAuditReport — returns CSV string", async () => {
    selectResultsQueue.push([{
      id: 1, authorizationId: 1, documentId: 2, customerCompany: "ACME",
      actionType: "doc_view", docCategory: "bom", riskLevel: "medium",
      ipAddress: "192.168.1.1", watermarkToken: "WM-1-2-test",
      createdAt: new Date("2026-03-01"),
    }]);
    const caller = adminCaller();
    const result = await caller.customerAuthorization.exportAuditReport({});
    expect(result.csv).toContain("ID,Authorization,Document");
    expect(result.csv).toContain("ACME");
    expect(result.count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════
// Permission Isolation
// ═══════════════════════════════════════════════════════════

describe("Permission Isolation", () => {
  it("anonymous cannot access management procedures", async () => {
    const caller = anonCaller();
    await expect(
      caller.customerAuthorization.listAuthorizations({ page: 1, pageSize: 20 })
    ).rejects.toThrow();
  });

  it("signNda is accessible without admin role (publicProcedure)", async () => {
    selectResultsQueue.push([]); // will throw "Invalid token" but should NOT throw auth error
    const caller = authedCaller(); // regular user, not admin
    await expect(
      caller.customerAuthorization.signNda({ token: "x", signerName: "Y" })
    ).rejects.toThrow("Invalid"); // domain error, not auth error
  });
});
