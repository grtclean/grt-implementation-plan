/**
 * Collaboration Docs Router — Unit Tests
 * Tests 7 procedures: listFiles, getFile, uploadFile, saveFile,
 * listFolders, createFolder, approveFile
 *
 * This router uses raw SQL via db.execute(sql`...`) exclusively.
 * Module-level state: tablesEnsured, seeded.
 * ensureTables() calls db.execute() twice (CREATE TABLE IF NOT EXISTS).
 * seedIfEmpty() calls db.execute() for count check, then seed inserts + setval.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { executeResults } = vi.hoisted(() => {
  const executeResults: any[] = [];
  return { executeResults };
});

// Mock DB — all queries use db.execute(sql`...`)
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
    }),
  })),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  sql: Object.assign(
    (..._args: any[]) => "sql-tag",
    { raw: vi.fn() }
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
});

const caller = () => createAuthenticatedCaller();

// Sample data
const sampleFile = {
  id: 1, title: "CEO 3-Week Masterplan", fileName: "plan.xlsx",
  fileType: "xlsx", fileSize: 52480, folderId: null,
  uploadedBy: "CEO", status: "active", modifiedAt: "2026-02-27",
};
const sampleFolder = {
  id: 1, name: "CEO 文件", parentId: null,
  createdBy: "CEO", createdAt: "2026-02-10",
};

describe("collaboration-docs router", () => {

  // ═══ listFiles ═══
  describe("listFiles", () => {
    it("returns files with no filters", async () => {
      // ensureTables: 2 db.execute (CREATE TABLE)
      executeResults.push({}); // CREATE folders table
      executeResults.push({}); // CREATE files table
      // seedIfEmpty: count check
      executeResults.push({ rows: [{ cnt: 4 }] }); // already seeded
      // actual query
      executeResults.push({ rows: [sampleFile] });
      const result = await caller().collaborationDocs.listFiles();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 1);
    });

    it("returns files with search filter", async () => {
      // ensureTables + seedIfEmpty are no-ops after first call
      executeResults.push({ rows: [sampleFile] });
      const result = await caller().collaborationDocs.listFiles({ search: "CEO" });
      expect(result.items).toHaveLength(1);
    });

    it("returns files with fileType filter", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().collaborationDocs.listFiles({ fileType: "csv" });
      expect(result.items).toHaveLength(0);
    });

    it("returns files with search and fileType", async () => {
      executeResults.push({ rows: [sampleFile] });
      const result = await caller().collaborationDocs.listFiles({
        search: "CEO", fileType: "xlsx",
      });
      expect(result.items).toHaveLength(1);
    });

    it("returns files filtered by folderId", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().collaborationDocs.listFiles({ folderId: 1 });
      expect(result.items).toEqual([]);
    });

    it("handles null folderId (root files)", async () => {
      executeResults.push({ rows: [sampleFile] });
      const result = await caller().collaborationDocs.listFiles({ folderId: null });
      expect(result.total).toBe(1);
    });
  });

  // ═══ getFile ═══
  describe("getFile", () => {
    it("returns file with parsed content", async () => {
      const fileWithContent = {
        ...sampleFile,
        parsedContent: [["A", "B"], ["1", "2"]],
      };
      executeResults.push({ rows: [fileWithContent] });
      const result = await caller().collaborationDocs.getFile({ id: 1 });
      expect(result).toBeTruthy();
      expect(result.title).toBe("CEO 3-Week Masterplan");
      expect(result.parsedContent).toBeTruthy();
    });

    it("returns null for missing file", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().collaborationDocs.getFile({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ uploadFile ═══
  describe("uploadFile", () => {
    it("uploads file with auto-detected extension", async () => {
      executeResults.push({ rows: [{ id: 5, title: "report", fileName: "report.xlsx", status: "active" }] });
      const result = await caller().collaborationDocs.uploadFile({
        fileName: "report.xlsx",
        userRole: "dept_manager", // level 3 → status=active
      });
      expect(result).toHaveProperty("id", 5);
    });

    it("sets pending_approval for low-level roles", async () => {
      executeResults.push({ rows: [{ id: 6, status: "pending_approval" }] });
      const result = await caller().collaborationDocs.uploadFile({
        fileName: "data.csv",
        userRole: "employee", // level 1 → status=pending_approval
      });
      expect(result).toHaveProperty("id", 6);
    });

    it("uploads to a specific folder", async () => {
      executeResults.push({ rows: [{ id: 7, folderId: 1 }] });
      const result = await caller().collaborationDocs.uploadFile({
        fileName: "notes.xlsx",
        folderId: 1,
      });
      expect(result).toHaveProperty("folderId", 1);
    });

    it("defaults userRole to employee", async () => {
      executeResults.push({ rows: [{ id: 8, status: "pending_approval" }] });
      const result = await caller().collaborationDocs.uploadFile({
        fileName: "test.pdf",
      });
      expect(result).toHaveProperty("id", 8);
    });

    it("rejects empty fileName", async () => {
      await expect(caller().collaborationDocs.uploadFile({
        fileName: "",
      })).rejects.toThrow();
    });
  });

  // ═══ saveFile ═══
  describe("saveFile", () => {
    it("saves parsed content and returns success", async () => {
      executeResults.push({}); // UPDATE query
      const result = await caller().collaborationDocs.saveFile({
        id: 1,
        parsedContent: [["A", "B"], ["1", "2"]],
      });
      expect(result).toEqual({ success: true, id: 1 });
    });

    it("handles empty content array", async () => {
      executeResults.push({});
      const result = await caller().collaborationDocs.saveFile({
        id: 2,
        parsedContent: [],
      });
      expect(result).toEqual({ success: true, id: 2 });
    });
  });

  // ═══ listFolders ═══
  describe("listFolders", () => {
    it("returns root folders when no parentId", async () => {
      executeResults.push({ rows: [sampleFolder] });
      const result = await caller().collaborationDocs.listFolders();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("name", "CEO 文件");
    });

    it("returns child folders for parentId", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().collaborationDocs.listFolders({ parentId: 1 });
      expect(result).toEqual([]);
    });

    it("returns empty for no folders", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().collaborationDocs.listFolders({ parentId: null });
      expect(result).toEqual([]);
    });
  });

  // ═══ createFolder ═══
  describe("createFolder", () => {
    it("creates folder at root level", async () => {
      executeResults.push({ rows: [{ id: 3, name: "New Folder", parentId: null, createdBy: "Current User" }] });
      const result = await caller().collaborationDocs.createFolder({ name: "New Folder" });
      expect(result).toHaveProperty("id", 3);
      expect(result).toHaveProperty("name", "New Folder");
    });

    it("creates subfolder with parentId", async () => {
      executeResults.push({ rows: [{ id: 4, name: "Sub", parentId: 1, createdBy: "Current User" }] });
      const result = await caller().collaborationDocs.createFolder({
        name: "Sub", parentId: 1,
      });
      expect(result).toHaveProperty("parentId", 1);
    });

    it("rejects empty name", async () => {
      await expect(caller().collaborationDocs.createFolder({
        name: "",
      })).rejects.toThrow();
    });
  });

  // ═══ approveFile ═══
  describe("approveFile", () => {
    it("approves a pending file", async () => {
      executeResults.push({}); // UPDATE query
      const result = await caller().collaborationDocs.approveFile({ fileId: 1 });
      expect(result).toEqual({ success: true, fileId: 1 });
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for listFiles", async () => {
      await expect(createAnonymousCaller().collaborationDocs.listFiles()).rejects.toThrow();
    });
    it("rejects anonymous for getFile", async () => {
      await expect(createAnonymousCaller().collaborationDocs.getFile({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for uploadFile", async () => {
      await expect(createAnonymousCaller().collaborationDocs.uploadFile({
        fileName: "x.xlsx",
      })).rejects.toThrow();
    });
    it("rejects anonymous for saveFile", async () => {
      await expect(createAnonymousCaller().collaborationDocs.saveFile({
        id: 1, parsedContent: [],
      })).rejects.toThrow();
    });
    it("rejects anonymous for listFolders", async () => {
      await expect(createAnonymousCaller().collaborationDocs.listFolders()).rejects.toThrow();
    });
    it("rejects anonymous for createFolder", async () => {
      await expect(createAnonymousCaller().collaborationDocs.createFolder({
        name: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for approveFile", async () => {
      await expect(createAnonymousCaller().collaborationDocs.approveFile({
        fileId: 1,
      })).rejects.toThrow();
    });
  });
});
