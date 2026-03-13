/**
 * GRT Cloud Vault Router — Unit Tests
 *
 * Tests 6 procedures:
 *   1. list       — query:    paginated vault files by projectId + optional fileType filter
 *   2. getById    — query:    single vault file by id
 *   3. upload     — mutation: insert vault file record
 *   4. checkin    — mutation: select file, increment version, update
 *   5. listEcos   — query:    paginated ECOs by projectId
 *   6. createEco  — mutation: insert ECO record
 *
 * Mock queue consumption order:
 *   list     → 2 entries (items select + count select via Promise.all)
 *   getById  → 1 entry  (select)
 *   upload   → 0 entries (insert → returning)
 *   checkin  → 1 select entry (current file) + 1 returning entry (updated file)
 *   listEcos → 2 entries (items select + count select via Promise.all)
 *   createEco→ 0 entries (insert → returning)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
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
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  ne: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  inArray: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Mock schema ─────────────────────────────────────────────
vi.mock("../../drizzle/digital-thread-schema", () => ({
  grtVaultFiles: { id: "id", projectId: "projectId", fileType: "fileType", updatedAt: "updatedAt" },
  engineeringChangeOrders: { id: "id", projectId: "projectId", updatedAt: "updatedAt" },
}));

// ── Reset state before each test ────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

// ── Sample data ─────────────────────────────────────────────
const sampleVaultFile = {
  id: 1,
  projectId: 42,
  fileName: "motor-assembly.sldprt",
  fileType: "SOLIDWORKS",
  fileSizeBytes: 2048000,
  version: 1,
  uploadedBy: 1,
  createdAt: "2026-03-01T10:00:00Z",
  updatedAt: "2026-03-01T10:00:00Z",
};

const sampleVaultFile2 = {
  id: 2,
  projectId: 42,
  fileName: "wiring-diagram.epl",
  fileType: "EPLAN",
  fileSizeBytes: 512000,
  version: 3,
  uploadedBy: 1,
  createdAt: "2026-03-01T09:00:00Z",
  updatedAt: "2026-03-01T11:00:00Z",
};

const sampleEco = {
  id: 1,
  projectId: 42,
  ecoNumber: "ECO-2026-001",
  title: "Replace motor bearing",
  description: "Upgrade bearing from SKF to NSK",
  status: "DRAFT",
  requestedBy: 1,
  affectedFiles: [1, 2],
  createdAt: "2026-03-01T10:00:00Z",
  updatedAt: "2026-03-01T10:00:00Z",
};

// ═══════════════════════════════════════════════════════════
//  Authentication Guards
// ═══════════════════════════════════════════════════════════
describe("vault router — authentication", () => {
  it("rejects anonymous for list", async () => {
    await expect(
      createAnonymousCaller().vault.list({ projectId: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous for getById", async () => {
    await expect(
      createAnonymousCaller().vault.getById({ id: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous for upload", async () => {
    await expect(
      createAnonymousCaller().vault.upload({
        projectId: 1, fileName: "test.pdf", fileType: "PDF",
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous for checkin", async () => {
    await expect(
      createAnonymousCaller().vault.checkin({ id: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous for listEcos", async () => {
    await expect(
      createAnonymousCaller().vault.listEcos({ projectId: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous for createEco", async () => {
    await expect(
      createAnonymousCaller().vault.createEco({
        projectId: 1, ecoNumber: "ECO-001", title: "Test",
      }),
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
//  list
// ═══════════════════════════════════════════════════════════
describe("vault.list", () => {
  it("returns items and total count", async () => {
    // Promise.all: 1st = items select, 2nd = count select
    selectResultsQueue.push([sampleVaultFile, sampleVaultFile2]);
    selectResultsQueue.push([{ value: 2 }]);

    const result = await caller().vault.list({ projectId: 42 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.items[0]).toEqual(sampleVaultFile);
    expect(result.items[1]).toEqual(sampleVaultFile2);
  });

  it("returns empty items and zero total when no files", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);

    const result = await caller().vault.list({ projectId: 999 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("accepts string projectId", async () => {
    selectResultsQueue.push([sampleVaultFile]);
    selectResultsQueue.push([{ value: 1 }]);

    const result = await caller().vault.list({ projectId: "42" });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("accepts optional fileType filter", async () => {
    selectResultsQueue.push([sampleVaultFile]);
    selectResultsQueue.push([{ value: 1 }]);

    const result = await caller().vault.list({
      projectId: 42,
      fileType: "SOLIDWORKS",
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("accepts all valid fileType enum values", async () => {
    const validTypes = ["SOLIDWORKS", "EPLAN", "WORD", "PDF", "EMAIL_EML", "MEETING_RECORD"] as const;
    for (const ft of validTypes) {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);

      const result = await caller().vault.list({ projectId: 1, fileType: ft });
      expect(result.total).toBe(0);
    }
  });

  it("rejects invalid fileType enum value", async () => {
    await expect(
      caller().vault.list({ projectId: 1, fileType: "INVALID" as any }),
    ).rejects.toThrow();
  });

  it("uses default limit 50 and offset 0", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);

    const result = await caller().vault.list({ projectId: 1 });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("respects custom limit and offset", async () => {
    selectResultsQueue.push([sampleVaultFile]);
    selectResultsQueue.push([{ value: 5 }]);

    const result = await caller().vault.list({
      projectId: 42,
      limit: 1,
      offset: 2,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(5);
  });

  it("coerces string total to number", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: "15" }]);

    const result = await caller().vault.list({ projectId: 1 });
    expect(result.total).toBe(15);
    expect(typeof result.total).toBe("number");
  });
});

// ═══════════════════════════════════════════════════════════
//  getById
// ═══════════════════════════════════════════════════════════
describe("vault.getById", () => {
  it("returns file when found", async () => {
    selectResultsQueue.push([sampleVaultFile]);

    const result = await caller().vault.getById({ id: 1 });
    expect(result).toEqual(sampleVaultFile);
  });

  it("returns null when file not found", async () => {
    selectResultsQueue.push([]);

    const result = await caller().vault.getById({ id: 999 });
    expect(result).toBeNull();
  });

  it("accepts string id", async () => {
    selectResultsQueue.push([sampleVaultFile]);

    const result = await caller().vault.getById({ id: "1" });
    expect(result).toEqual(sampleVaultFile);
  });

  it("accepts numeric id", async () => {
    selectResultsQueue.push([sampleVaultFile2]);

    const result = await caller().vault.getById({ id: 2 });
    expect(result).toEqual(sampleVaultFile2);
  });
});

// ═══════════════════════════════════════════════════════════
//  upload
// ═══════════════════════════════════════════════════════════
describe("vault.upload", () => {
  it("inserts file and returns inserted row", async () => {
    const inserted = { ...sampleVaultFile, id: 10 };
    returningQueue.push([inserted]);

    const result = await caller().vault.upload({
      projectId: 42,
      fileName: "motor-assembly.sldprt",
      fileType: "SOLIDWORKS",
      size: 2048000,
    });
    expect(result).toEqual(inserted);
  });

  it("inserts without optional size", async () => {
    const inserted = { ...sampleVaultFile, fileSizeBytes: null };
    returningQueue.push([inserted]);

    const result = await caller().vault.upload({
      projectId: 42,
      fileName: "report.pdf",
      fileType: "PDF",
    });
    expect(result).toEqual(inserted);
  });

  it("accepts string projectId", async () => {
    returningQueue.push([{ ...sampleVaultFile, id: 11 }]);

    const result = await caller().vault.upload({
      projectId: "42",
      fileName: "drawing.epl",
      fileType: "EPLAN",
    });
    expect(result.id).toBe(11);
  });

  it("rejects empty fileName", async () => {
    await expect(
      caller().vault.upload({
        projectId: 1,
        fileName: "",
        fileType: "PDF",
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid fileType", async () => {
    await expect(
      caller().vault.upload({
        projectId: 1,
        fileName: "test.xyz",
        fileType: "INVALID_TYPE" as any,
      }),
    ).rejects.toThrow();
  });

  it("accepts all valid fileType values", async () => {
    const validTypes = ["SOLIDWORKS", "EPLAN", "WORD", "PDF", "EMAIL_EML", "MEETING_RECORD"] as const;
    for (const ft of validTypes) {
      returningQueue.push([{ ...sampleVaultFile, fileType: ft }]);
      const result = await caller().vault.upload({
        projectId: 1,
        fileName: `file.${ft.toLowerCase()}`,
        fileType: ft,
      });
      expect(result.fileType).toBe(ft);
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  checkin
// ═══════════════════════════════════════════════════════════
describe("vault.checkin", () => {
  it("increments version and returns updated file", async () => {
    // select: current file with version 3
    selectResultsQueue.push([{ ...sampleVaultFile, version: 3 }]);
    // returning: updated file with version 4
    returningQueue.push([{ ...sampleVaultFile, version: 4 }]);

    const result = await caller().vault.checkin({ id: 1 });
    expect(result.version).toBe(4);
  });

  it("throws when file not found", async () => {
    selectResultsQueue.push([]); // empty select result

    await expect(
      caller().vault.checkin({ id: 999 }),
    ).rejects.toThrow("Vault file not found: id=999");
  });

  it("accepts string id", async () => {
    selectResultsQueue.push([{ ...sampleVaultFile, version: 1 }]);
    returningQueue.push([{ ...sampleVaultFile, version: 2 }]);

    const result = await caller().vault.checkin({ id: "1" });
    expect(result.version).toBe(2);
  });

  it("treats non-numeric version as 1 and bumps to 2", async () => {
    // version is not a number — router defaults to 1, bumps to 2
    selectResultsQueue.push([{ ...sampleVaultFile, version: "not-a-number" }]);
    returningQueue.push([{ ...sampleVaultFile, version: 2 }]);

    const result = await caller().vault.checkin({ id: 1 });
    expect(result.version).toBe(2);
  });

  it("handles version 1 bump to 2", async () => {
    selectResultsQueue.push([{ ...sampleVaultFile, version: 1 }]);
    returningQueue.push([{ ...sampleVaultFile, version: 2 }]);

    const result = await caller().vault.checkin({ id: 1 });
    expect(result.version).toBe(2);
  });

  it("error message includes the provided id", async () => {
    selectResultsQueue.push([]);
    await expect(caller().vault.checkin({ id: 42 })).rejects.toThrow("id=42");
  });

  it("error message includes string id", async () => {
    selectResultsQueue.push([]);
    await expect(caller().vault.checkin({ id: "abc" })).rejects.toThrow("id=abc");
  });
});

// ═══════════════════════════════════════════════════════════
//  listEcos
// ═══════════════════════════════════════════════════════════
describe("vault.listEcos", () => {
  it("returns items and total count", async () => {
    selectResultsQueue.push([sampleEco]);
    selectResultsQueue.push([{ value: 1 }]);

    const result = await caller().vault.listEcos({ projectId: 42 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(sampleEco);
  });

  it("returns empty items and zero total when no ECOs", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);

    const result = await caller().vault.listEcos({ projectId: 999 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("accepts string projectId", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);

    const result = await caller().vault.listEcos({ projectId: "42" });
    expect(result.total).toBe(0);
  });

  it("respects custom limit and offset", async () => {
    selectResultsQueue.push([sampleEco]);
    selectResultsQueue.push([{ value: 10 }]);

    const result = await caller().vault.listEcos({
      projectId: 42,
      limit: 1,
      offset: 5,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(10);
  });

  it("uses default limit 50 and offset 0", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: 0 }]);

    const result = await caller().vault.listEcos({ projectId: 1 });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("coerces string total to number", async () => {
    selectResultsQueue.push([]);
    selectResultsQueue.push([{ value: "25" }]);

    const result = await caller().vault.listEcos({ projectId: 1 });
    expect(result.total).toBe(25);
    expect(typeof result.total).toBe("number");
  });

  it("returns multiple ECOs", async () => {
    const eco2 = { ...sampleEco, id: 2, ecoNumber: "ECO-2026-002", title: "Update wiring" };
    selectResultsQueue.push([sampleEco, eco2]);
    selectResultsQueue.push([{ value: 2 }]);

    const result = await caller().vault.listEcos({ projectId: 42 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════
//  createEco
// ═══════════════════════════════════════════════════════════
describe("vault.createEco", () => {
  it("inserts ECO and returns inserted row", async () => {
    returningQueue.push([sampleEco]);

    const result = await caller().vault.createEco({
      projectId: 42,
      ecoNumber: "ECO-2026-001",
      title: "Replace motor bearing",
      description: "Upgrade bearing from SKF to NSK",
      affectedFiles: [1, 2],
    });
    expect(result).toEqual(sampleEco);
  });

  it("inserts ECO without optional fields", async () => {
    const inserted = { ...sampleEco, description: "", affectedFiles: [] };
    returningQueue.push([inserted]);

    const result = await caller().vault.createEco({
      projectId: 42,
      ecoNumber: "ECO-2026-002",
      title: "Minor fix",
    });
    expect(result.description).toBe("");
    expect(result.affectedFiles).toEqual([]);
  });

  it("accepts string projectId", async () => {
    returningQueue.push([{ ...sampleEco, id: 5 }]);

    const result = await caller().vault.createEco({
      projectId: "42",
      ecoNumber: "ECO-003",
      title: "Wiring update",
    });
    expect(result.id).toBe(5);
  });

  it("rejects empty ecoNumber", async () => {
    await expect(
      caller().vault.createEco({
        projectId: 1,
        ecoNumber: "",
        title: "Test",
      }),
    ).rejects.toThrow();
  });

  it("rejects empty title", async () => {
    await expect(
      caller().vault.createEco({
        projectId: 1,
        ecoNumber: "ECO-001",
        title: "",
      }),
    ).rejects.toThrow();
  });

  it("accepts affectedFiles as empty array", async () => {
    returningQueue.push([{ ...sampleEco, affectedFiles: [] }]);

    const result = await caller().vault.createEco({
      projectId: 1,
      ecoNumber: "ECO-004",
      title: "No affected files",
      affectedFiles: [],
    });
    expect(result.affectedFiles).toEqual([]);
  });

  it("accepts affectedFiles with multiple IDs", async () => {
    const inserted = { ...sampleEco, affectedFiles: [1, 2, 3, 4, 5] };
    returningQueue.push([inserted]);

    const result = await caller().vault.createEco({
      projectId: 42,
      ecoNumber: "ECO-005",
      title: "Multiple files affected",
      affectedFiles: [1, 2, 3, 4, 5],
    });
    expect(result.affectedFiles).toEqual([1, 2, 3, 4, 5]);
  });
});

// ═══════════════════════════════════════════════════════════
//  Input validation
// ═══════════════════════════════════════════════════════════
describe("vault router — input validation", () => {
  it("list rejects missing projectId", async () => {
    await expect(caller().vault.list({} as any)).rejects.toThrow();
  });

  it("getById rejects missing id", async () => {
    await expect(caller().vault.getById({} as any)).rejects.toThrow();
  });

  it("upload rejects missing fileName", async () => {
    await expect(
      caller().vault.upload({ projectId: 1, fileType: "PDF" } as any),
    ).rejects.toThrow();
  });

  it("upload rejects missing fileType", async () => {
    await expect(
      caller().vault.upload({ projectId: 1, fileName: "test.pdf" } as any),
    ).rejects.toThrow();
  });

  it("checkin rejects missing id", async () => {
    await expect(caller().vault.checkin({} as any)).rejects.toThrow();
  });

  it("listEcos rejects missing projectId", async () => {
    await expect(caller().vault.listEcos({} as any)).rejects.toThrow();
  });

  it("createEco rejects missing ecoNumber", async () => {
    await expect(
      caller().vault.createEco({ projectId: 1, title: "T" } as any),
    ).rejects.toThrow();
  });

  it("createEco rejects missing title", async () => {
    await expect(
      caller().vault.createEco({ projectId: 1, ecoNumber: "E1" } as any),
    ).rejects.toThrow();
  });
});
