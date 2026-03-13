/**
 * IDO Router — Unit Tests (Intelligent Document Optimization)
 *
 * Tests ~25 procedures across 4 groups:
 *   mapping: list, byStage, byUiPage, matrix, create, update, delete, seed
 *   storage: recommend, accept, reject, history
 *   context: fileOpen, stageProgress, logFileOpen
 *   workflow: projectCompletion, missingDocs, gateReadiness
 *   analytics: overview
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
      execute: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    };
  }),
}));

// ── Mock drizzle-orm ────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  inArray: vi.fn((...args: any[]) => args),
  like: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Mock schemas ────────────────────────────────────────────
vi.mock("../../drizzle/ido-schema", () => ({
  idoStageDocumentUiMap: {
    id: "id", stageCode: "stageCode", documentTypeKey: "documentTypeKey",
    documentName: "documentName", documentCategory: "documentCategory",
    isActive: "isActive", sortOrder: "sortOrder", uiPagePath: "uiPagePath",
    fileExtensions: "fileExtensions", isMandatory: "isMandatory",
  },
  idoStorageRecommendations: {
    id: "id", userId: "userId", projectId: "projectId",
    stageCode: "stageCode", userAction: "userAction", createdAt: "createdAt",
  },
  idoFileContextLog: {
    id: "id", userId: "userId", fileId: "fileId", fileSource: "fileSource",
    clickedRelatedDoc: "clickedRelatedDoc",
  },
}));

vi.mock("../../drizzle/schema", () => ({
  projectDocuments: { title: "title", projectId: "projectId" },
  projects: { id: "id", currentStage: "currentStage", projectCode: "projectCode", status: "status" },
}));

vi.mock("../../shared/stage-definitions", () => ({
  STAGES: [
    { id: "M0", code: "M0", name: "商机识别", nameEn: "Opportunity", category: "concept", color: "bg-slate-500" },
    { id: "M5", code: "M5", name: "详细设计", nameEn: "Detailed Design", category: "design", color: "bg-cyan-500" },
  ],
  STAGE_MAP: {
    M0: { id: "M0", code: "M0", name: "商机识别", nameEn: "Opportunity", category: "concept", color: "bg-slate-500" },
    M5: { id: "M5", code: "M5", name: "详细设计", nameEn: "Detailed Design", category: "design", color: "bg-cyan-500" },
  },
}));

// ── Mock IDO services ───────────────────────────────────────
vi.mock("../services/ido.service", () => ({
  recommendStorage: vi.fn(async () => ({
    recommendedPath: "P-2026-015/05_BOM_Procurement/BOM",
    sharepointFolder: "05_BOM_Procurement",
    sharepointSubfolder: "BOM",
    uiPagePath: "/bom-management",
    uiPageName: "BOM管理",
    matchedMapId: 20,
    confidence: 92,
    reasoning: "文件匹配到M5阶段的BOM清单(终版)",
    classification: { fileCategory: "spreadsheet", documentCategory: "design", documentTypeHint: "bom", keywordMatches: ["bom"], confidence: 70 },
  })),
  buildFileOpenContext: vi.fn(async () => ({
    currentDoc: { documentName: "BOM清单(终版)", stageCode: "M5", stageName: "详细设计", uiPagePath: "/bom-management" },
    relatedDocs: [
      { id: 18, documentName: "详细机械图纸", uiPagePath: "/mechanical-design", fulfilled: true },
      { id: 19, documentName: "电气接线图", uiPagePath: "/electrical-design", fulfilled: true },
      { id: 21, documentName: "PLC程序文档", uiPagePath: "/electrical-design", fulfilled: false },
    ],
    nextActions: ["M5阶段还缺 1 份文档"],
    stageProgress: { stageCode: "M5", stageName: "详细设计", totalRequired: 4, fulfilled: 3, completionPct: 75 },
  })),
  getProjectDocumentCompletion: vi.fn(async () => [
    { stageCode: "M0", stageName: "商机识别", category: "concept", color: "bg-slate-500", totalRequired: 2, totalMandatory: 2, fulfilled: 2, mandatoryFulfilled: 2, completionPct: 100, mandatoryCompletionPct: 100, missingDocs: [] },
    { stageCode: "M5", stageName: "详细设计", category: "design", color: "bg-cyan-500", totalRequired: 4, totalMandatory: 4, fulfilled: 3, mandatoryFulfilled: 3, completionPct: 75, mandatoryCompletionPct: 75, missingDocs: [{ mapId: 21, documentName: "PLC程序文档", documentNameEn: "PLC Program", uiPagePath: "/electrical-design", uiPageName: "电气设计", isMandatory: true }] },
  ]),
  seedMappingTable: vi.fn(async () => 47),
}));

// ── Reset state ─────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

// ── Sample data ─────────────────────────────────────────────
const sampleMapping = {
  id: 1,
  stageCode: "M5",
  documentTypeKey: "m5_bom_final",
  documentName: "BOM清单(终版)",
  documentNameEn: "BOM (Final)",
  documentCategory: "design",
  fileExtensions: ".xlsx,.csv",
  uiPagePath: "/bom-management",
  uiPageName: "BOM管理",
  uiPageNameEn: "BOM Management",
  sharepointFolder: "05_BOM_Procurement",
  sharepointSubfolder: null,
  plmDocType: null,
  orgDocDomain: null,
  isMandatory: true,
  sortOrder: 3,
  responsibleRoles: ["bu_mech", "bu_elec"],
  isActive: true,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-03-08T00:00:00.000Z",
  updatedAt: "2026-03-08T00:00:00.000Z",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPPING GROUP
// ═══════════════════════════════════════════════════════════════════════════

describe("ido.mappingList", () => {
  it("returns paginated mappings", async () => {
    selectResultsQueue.push([sampleMapping]); // items
    selectResultsQueue.push([{ value: 1 }]); // count
    const result = await (await caller()).ido.mappingList({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("supports stageCode filter", async () => {
    selectResultsQueue.push([sampleMapping]);
    selectResultsQueue.push([{ value: 1 }]);
    const result = await (await caller()).ido.mappingList({ stageCode: "M5" });
    expect(result.items[0].stageCode).toBe("M5");
  });
});

describe("ido.mappingByStage", () => {
  it("returns mappings for M5", async () => {
    selectResultsQueue.push([sampleMapping]);
    const result = await (await caller()).ido.mappingByStage({ stageCode: "M5" });
    expect(result).toHaveLength(1);
    expect(result[0].documentName).toBe("BOM清单(终版)");
  });
});

describe("ido.mappingByUiPage", () => {
  it("returns mappings for a UI page path", async () => {
    selectResultsQueue.push([sampleMapping]);
    const result = await (await caller()).ido.mappingByUiPage({ uiPagePath: "/bom-management" });
    expect(result).toHaveLength(1);
  });
});

describe("ido.mappingMatrix", () => {
  it("returns stages with grouped documents", async () => {
    selectResultsQueue.push([sampleMapping]);
    const result = await (await caller()).ido.mappingMatrix();
    expect(result).toHaveProperty("stages");
    expect(result).toHaveProperty("matrix");
    expect(result).toHaveProperty("totalDocuments", 1);
    expect(result.stages.length).toBeGreaterThan(0);
  });
});

describe("ido.mappingCreate", () => {
  it("creates a new mapping entry", async () => {
    returningQueue.push([{ id: 99, ...sampleMapping }]);
    const result = await (await caller()).ido.mappingCreate({
      stageCode: "M5",
      documentTypeKey: "m5_test_doc",
      documentName: "测试文档",
      documentCategory: "report",
    });
    expect(result).toHaveProperty("id");
  });
});

describe("ido.mappingUpdate", () => {
  it("updates a mapping entry", async () => {
    returningQueue.push([{ ...sampleMapping, documentName: "更新后的BOM" }]);
    const result = await (await caller()).ido.mappingUpdate({
      id: 1,
      documentName: "更新后的BOM",
    });
    expect(result.documentName).toBe("更新后的BOM");
  });
});

describe("ido.mappingDelete", () => {
  it("soft-deletes a mapping entry", async () => {
    returningQueue.push([{ ...sampleMapping, isActive: false }]);
    const result = await (await caller()).ido.mappingDelete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("ido.mappingSeed", () => {
  it("seeds default mapping rows", async () => {
    const result = await (await caller()).ido.mappingSeed();
    expect(result).toEqual({ seeded: 47 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE GROUP
// ═══════════════════════════════════════════════════════════════════════════

describe("ido.storageRecommend", () => {
  it("recommends storage for a BOM file", async () => {
    const result = await (await caller()).ido.storageRecommend({
      fileName: "BOM清单_P-2026-015_终版.xlsx",
    });
    expect(result).toHaveProperty("recommendedPath");
    expect(result).toHaveProperty("confidence");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.sharepointFolder).toBe("05_BOM_Procurement");
  });
});

describe("ido.storageAccept", () => {
  it("accepts a recommendation", async () => {
    const result = await (await caller()).ido.storageAccept({ recommendationId: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("ido.storageReject", () => {
  it("rejects a recommendation with custom path", async () => {
    const result = await (await caller()).ido.storageReject({
      recommendationId: 1,
      actualPath: "/custom/path",
    });
    expect(result).toEqual({ success: true });
  });
});

describe("ido.storageHistory", () => {
  it("returns recommendation history", async () => {
    selectResultsQueue.push([
      { id: 1, fileName: "BOM.xlsx", confidenceScore: 92, userAction: "accepted" },
    ]);
    const result = await (await caller()).ido.storageHistory({});
    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT GROUP
// ═══════════════════════════════════════════════════════════════════════════

describe("ido.contextFileOpen", () => {
  it("returns file context with related docs and stage progress", async () => {
    const result = await (await caller()).ido.contextFileOpen({
      fileName: "BOM清单(终版).xlsx",
      projectId: 42,
      stageCode: "M5",
    });
    expect(result).toHaveProperty("currentDoc");
    expect(result).toHaveProperty("relatedDocs");
    expect(result).toHaveProperty("nextActions");
    expect(result).toHaveProperty("stageProgress");
    expect(result.currentDoc.documentName).toBe("BOM清单(终版)");
    expect(result.stageProgress?.completionPct).toBe(75);
  });
});

describe("ido.contextStageProgress", () => {
  it("returns stage progress for M5", async () => {
    const result = await (await caller()).ido.contextStageProgress({
      projectId: 42,
      stageCode: "M5",
    });
    expect(result).not.toBeNull();
    expect(result?.completionPct).toBe(75);
    expect(result?.missingDocs).toHaveLength(1);
  });

  it("returns null for unknown stage", async () => {
    const result = await (await caller()).ido.contextStageProgress({
      projectId: 42,
      stageCode: "M99",
    });
    expect(result).toBeNull();
  });
});

describe("ido.contextLogFileOpen", () => {
  it("logs a file open event", async () => {
    const result = await (await caller()).ido.contextLogFileOpen({
      fileSource: "plm",
      projectId: 42,
      stageCode: "M5",
      relatedDocCount: 3,
    });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW GROUP
// ═══════════════════════════════════════════════════════════════════════════

describe("ido.workflowProjectCompletion", () => {
  it("returns M0-M12 completion data", async () => {
    const result = await (await caller()).ido.workflowProjectCompletion({ projectId: 42 });
    expect(result).toHaveLength(2);
    expect(result[0].stageCode).toBe("M0");
    expect(result[0].completionPct).toBe(100);
    expect(result[1].stageCode).toBe("M5");
    expect(result[1].completionPct).toBe(75);
  });
});

describe("ido.workflowMissingDocs", () => {
  it("returns missing documents by stage", async () => {
    const result = await (await caller()).ido.workflowMissingDocs({ projectId: 42 });
    expect(result).toHaveLength(1); // Only M5 has missing docs
    expect(result[0].stageCode).toBe("M5");
    expect(result[0].missingMandatory).toHaveLength(1);
    expect(result[0].missingMandatory[0].documentName).toBe("PLC程序文档");
  });
});

describe("ido.workflowGateReadiness", () => {
  it("returns not-ready for M5 with missing mandatory docs", async () => {
    const result = await (await caller()).ido.workflowGateReadiness({
      projectId: 42,
      stageCode: "M5",
    });
    expect(result.ready).toBe(false);
    expect(result.missingMandatory).toHaveLength(1);
    expect(result.message).toContain("1 份必要文档");
  });

  it("returns ready for M0 with all docs complete", async () => {
    const result = await (await caller()).ido.workflowGateReadiness({
      projectId: 42,
      stageCode: "M0",
    });
    expect(result.ready).toBe(true);
    expect(result.missingMandatory).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

describe("ido.analyticsOverview", () => {
  it("returns recommendation and engagement stats", async () => {
    // recommendation stats: total, accepted, rejected
    selectResultsQueue.push([{ value: 100 }]); // total
    selectResultsQueue.push([{ value: 75 }]);  // accepted
    selectResultsQueue.push([{ value: 10 }]);  // rejected
    // file open stats: total, engaged
    selectResultsQueue.push([{ value: 50 }]);  // total opens
    selectResultsQueue.push([{ value: 20 }]);  // engaged opens

    const result = await (await caller()).ido.analyticsOverview();
    expect(result).toHaveProperty("recommendations");
    expect(result).toHaveProperty("fileOpens");
    expect(result.recommendations.total).toBe(100);
    expect(result.recommendations.accepted).toBe(75);
    expect(result.recommendations.acceptanceRate).toBe(75);
    expect(result.fileOpens.total).toBe(50);
    expect(result.fileOpens.engagementRate).toBe(40);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH GUARD
// ═══════════════════════════════════════════════════════════════════════════

describe("IDO auth guards", () => {
  it("rejects anonymous access to mappingList", async () => {
    const anonCaller = await createAnonymousCaller();
    await expect(anonCaller.ido.mappingList({})).rejects.toThrow();
  });
});
