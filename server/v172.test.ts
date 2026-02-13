/**
 * v1.7.2 Unit Tests
 * Tests: CCD WebSocket Push, BOM Excel Import, Salary Approval Workflow
 *
 * mysql2 db.execute returns [rows, fields] for SELECT
 * and [ResultSetHeader, undefined] for INSERT/UPDATE/DELETE
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockExecute } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute };
});

// Mock the database module
vi.mock("./db", () => ({
  requireDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
  getDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
}));

vi.mock("./utils/db-helpers", () => ({
  requireDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
  getDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
  getDbConnection: vi.fn().mockResolvedValue({ execute: mockExecute }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock xlsx for BOM Excel tests
vi.mock("xlsx", () => {
  const mockSheet = { "!ref": "A1:H6" };
  const mockWorkbook = {
    SheetNames: ["BOM清单", "填写说明"],
    Sheets: {
      "BOM清单": mockSheet,
      "填写说明": {},
    },
  };
  return {
    utils: {
      book_new: vi.fn().mockReturnValue({ SheetNames: [], Sheets: {} }),
      json_to_sheet: vi.fn().mockReturnValue(mockSheet),
      book_append_sheet: vi.fn(),
      sheet_to_json: vi.fn().mockReturnValue([
        {
          "物料编码": "MAT-001",
          "物料名称": "清洗喷嘴组件",
          "物料规格": "DN50不锈钢",
          "需求数量": 4,
          "是否关键物料": "Y",
          "工序代码": "T3",
          "供应商": "上海精密",
          "备注": "核心部件",
        },
        {
          "物料编码": "MAT-002",
          "物料名称": "传动链条",
          "物料规格": "08B-1标准链",
          "需求数量": 2,
          "是否关键物料": "N",
          "工序代码": "T4",
          "供应商": "东莞链条",
          "备注": "",
        },
      ]),
    },
    read: vi.fn().mockReturnValue(mockWorkbook),
    write: vi.fn().mockReturnValue(Buffer.from("mock-xlsx-data")),
  };
});

// Mock bomVerification.service for addBomChecklistItems
vi.mock("./production-steps/bomVerification.service", () => ({
  addBomChecklistItems: vi.fn().mockResolvedValue({ added: 2 }),
}));

// Mock bomImport.service for detectDuplicates
vi.mock("./production-steps/bomImport.service", () => ({
  detectDuplicates: vi.fn().mockReturnValue([]),
  parseBomCsv: vi.fn(),
  executeBomImport: vi.fn(),
  generateBomCsvTemplate: vi.fn(),
  getImportHistory: vi.fn(),
  rollbackImport: vi.fn(),
  syncFromJianDaoYun: vi.fn(),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Helper: Drizzle/pg execute result — the service accesses .rows
function selectResult(rows: any[]) {
  return { rows };
}

// Helper: Drizzle INSERT result
function insertResult(insertId: number) {
  return { rows: [{ id: insertId }], rowCount: 1 };
}

// Helper: Drizzle UPDATE/DELETE result
function updateResult(affectedRows: number = 1) {
  return { rows: [], rowCount: affectedRows };
}

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@grt.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

// ==========================================
// 功能1: CCD WebSocket实时推送
// ==========================================
describe("ccdWebSocket", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("getStats", () => {
    it("should return WebSocket connection statistics", async () => {
      const result = await caller.ccdWebSocket.getStats();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalConnections");
      expect(result).toHaveProperty("projectSubscriptions");
      expect(result).toHaveProperty("processSubscriptions");
      expect(result).toHaveProperty("allSubscribers");
      expect(result).toHaveProperty("connections");
      expect(typeof result.totalConnections).toBe("number");
      expect(Array.isArray(result.connections)).toBe(true);
    });

    it("should return zero connections when no clients are connected", async () => {
      const result = await caller.ccdWebSocket.getStats();
      expect(result.totalConnections).toBe(0);
      expect(result.allSubscribers).toBe(0);
      expect(result.connections).toHaveLength(0);
    });
  });

  describe("testPush", () => {
    it("should push a detection result and return push stats", async () => {
      const result = await caller.ccdWebSocket.testPush({
        detectionId: "DET-001",
        stationId: "STATION-A",
        projectId: "PRJ-001",
        processCode: "T3",
        overallScore: 45,
        severity: "major",
        defectCount: 2,
        triggeredInterlock: true,
        defects: [
          { defectType: "scratch", location: "surface-A", confidence: 0.92 },
          { defectType: "dent", location: "edge-B", confidence: 0.85 },
        ],
      });

      expect(result).toBeDefined();
      expect(result.pushed).toBe(true);
      expect(result).toHaveProperty("targetCount");
      expect(result).toHaveProperty("sentCount");
      expect(result).toHaveProperty("failedCount");
      expect(typeof result.targetCount).toBe("number");
    });

    it("should handle push with minimal parameters", async () => {
      const result = await caller.ccdWebSocket.testPush({
        detectionId: "DET-002",
        stationId: "STATION-B",
        projectId: "PRJ-002",
        processCode: "T5",
        overallScore: 95,
        severity: "pass",
        defectCount: 0,
        triggeredInterlock: false,
      });

      expect(result.pushed).toBe(true);
      expect(result.sentCount).toBe(0); // No connected clients
    });

    it("should handle critical severity detection push", async () => {
      const result = await caller.ccdWebSocket.testPush({
        detectionId: "DET-003",
        stationId: "STATION-C",
        projectId: "PRJ-001",
        processCode: "T4",
        overallScore: 15,
        severity: "critical",
        defectCount: 5,
        triggeredInterlock: true,
        inCooldown: false,
        defects: [
          { defectType: "crack", location: "center", confidence: 0.98, description: "严重裂纹" },
        ],
      });

      expect(result.pushed).toBe(true);
    });
  });
});

// ==========================================
// 功能2: BOM Excel导入
// ==========================================
describe("bomExcelImport", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("getTemplate", () => {
    it("should generate an Excel template with correct metadata", async () => {
      const result = await caller.bomExcelImport.getTemplate();
      expect(result).toBeDefined();
      expect(result.fileName).toBe("BOM导入模板.xlsx");
      expect(result.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(typeof result.data).toBe("string"); // base64
      expect(result.data.length).toBeGreaterThan(0);
      expect(typeof result.size).toBe("number");
    });
  });

  describe("preview", () => {
    it("should preview an xlsx file and return parsed rows", async () => {
      const fakeBase64 = Buffer.from("fake-excel-data").toString("base64");
      const result = await caller.bomExcelImport.preview({
        fileData: fakeBase64,
        fileName: "test.xlsx",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sheetName).toBe("BOM清单");
      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toHaveProperty("materialCode", "MAT-001");
      expect(result.rows[0]).toHaveProperty("materialName", "清洗喷嘴组件");
      expect(result.rows[1]).toHaveProperty("materialCode", "MAT-002");
    });

    it("should reject non-xlsx files", async () => {
      const result = await caller.bomExcelImport.preview({
        fileData: Buffer.from("csv,data").toString("base64"),
        fileName: "test.csv",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("不支持的文件格式");
    });

    it("should reject unsupported file formats", async () => {
      const result = await caller.bomExcelImport.preview({
        fileData: Buffer.from("data").toString("base64"),
        fileName: "test.pdf",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("import", () => {
    it("should execute Excel BOM import successfully", async () => {
      // Mock: check existing duplicates for MAT-001 (none found)
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // Mock: check existing duplicates for MAT-002 (none found)
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // Mock: insert import history
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const fakeBase64 = Buffer.from("fake-excel-data").toString("base64");
      const result = await caller.bomExcelImport.import({
        projectId: "PRJ-001",
        verificationId: 1,
        fileData: fakeBase64,
        fileName: "bom-data.xlsx",
        skipDuplicates: true,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.message).toContain("成功从Excel导入");
    });

    it("should reject non-xlsx files during import", async () => {
      const result = await caller.bomExcelImport.import({
        projectId: "PRJ-001",
        verificationId: 1,
        fileData: Buffer.from("data").toString("base64"),
        fileName: "test.txt",
      });

      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
    });
  });

  describe("detectType", () => {
    it("should detect xlsx file type", async () => {
      const result = await caller.bomExcelImport.detectType({ fileName: "data.xlsx" });
      expect(result.fileType).toBe("xlsx");
      expect(result.supported).toBe(true);
      expect(result.suggestedAction).toBe("使用Excel导入");
    });

    it("should detect csv file type", async () => {
      const result = await caller.bomExcelImport.detectType({ fileName: "data.csv" });
      expect(result.fileType).toBe("csv");
      expect(result.supported).toBe(true);
      expect(result.suggestedAction).toBe("使用CSV导入");
    });

    it("should detect unknown file type", async () => {
      const result = await caller.bomExcelImport.detectType({ fileName: "data.pdf" });
      expect(result.fileType).toBe("unknown");
      expect(result.supported).toBe(false);
    });

    it("should handle xls file extension", async () => {
      const result = await caller.bomExcelImport.detectType({ fileName: "legacy.xls" });
      expect(result.fileType).toBe("xlsx");
      expect(result.supported).toBe(true);
    });
  });
});

// ==========================================
// 功能3: 薪酬审批工作流
// ==========================================
describe("salaryApproval", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  const sampleWorkflow = {
    id: 1,
    workflow_name: "标准薪酬审批",
    workflow_code: "SAL-STD",
    description: "标准四级审批流程",
    steps: JSON.stringify([
      { step: 1, role: "supervisor", title: "主管审核", required: true },
      { step: 2, role: "hr", title: "HR确认", required: true },
      { step: 3, role: "finance", title: "财务审批", required: true },
      { step: 4, role: "director", title: "总监签批", required: false },
    ]),
    auto_trigger: 0,
    trigger_condition: null,
    is_active: 1,
    created_by: "admin",
    created_at: Date.now(),
    updated_at: null,
  };

  beforeEach(() => {
    mockExecute.mockReset();
  });

  // ========== 工作流定义 ==========
  describe("getWorkflows", () => {
    it("should return active workflows", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([sampleWorkflow]));

      const result = await caller.salaryApproval.getWorkflows({});
      expect(result).toHaveLength(1);
      expect(result[0].workflow_name).toBe("标准薪酬审批");
      expect(result[0].steps).toHaveLength(4);
      expect(result[0].steps[0].role).toBe("supervisor");
    });

    it("should return empty array when no workflows exist", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.salaryApproval.getWorkflows({});
      expect(result).toHaveLength(0);
    });
  });

  describe("getWorkflow", () => {
    it("should return a specific workflow by ID", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([sampleWorkflow]));

      const result = await caller.salaryApproval.getWorkflow({ workflowId: 1 });
      expect(result).toBeDefined();
      expect(result!.workflow_code).toBe("SAL-STD");
    });

    it("should return null for non-existent workflow", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.salaryApproval.getWorkflow({ workflowId: 999 });
      expect(result).toBeNull();
    });
  });

  describe("createWorkflow", () => {
    it("should create a new approval workflow", async () => {
      mockExecute.mockResolvedValueOnce(insertResult(2));

      const result = await caller.salaryApproval.createWorkflow({
        workflowName: "简化审批流程",
        workflowCode: "SAL-SIMPLE",
        description: "两级审批",
        steps: [
          { step: 1, role: "supervisor", title: "主管审核", required: true },
          { step: 2, role: "finance", title: "财务审批", required: true },
        ],
      });

      expect(result.created).toBe(true);
      expect(result.id).toBe(2);
    });
  });

  describe("updateWorkflow", () => {
    it("should update an existing workflow", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryApproval.updateWorkflow({
        workflowId: 1,
        workflowName: "更新后的审批流程",
        isActive: false,
      });

      expect(result.updated).toBe(true);
    });
  });

  // ========== 审批操作 ==========
  describe("submit", () => {
    it("should submit a salary approval successfully", async () => {
      // Mock: getWorkflowById (called inside submitSalaryApproval)
      mockExecute.mockResolvedValueOnce(selectResult([sampleWorkflow]));
      // Mock: INSERT approval record
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const result = await caller.salaryApproval.submit({
        workflowId: 1,
        batchTitle: "2026年1月绩效奖金",
        totalAmount: 85000,
        workerCount: 25,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.status).toBe("in_progress");
      expect(result.currentStep).toBe(1);
      expect(result.nextApprover).toBe("supervisor");
      expect(result.batchCode).toMatch(/^SAL-/);
    });

    it("should throw error for non-existent workflow", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      await expect(
        caller.salaryApproval.submit({
          workflowId: 999,
          batchTitle: "测试",
          totalAmount: 1000,
          workerCount: 1,
        })
      ).rejects.toThrow("审批工作流不存在");
    });

    it("should throw error for inactive workflow", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{ ...sampleWorkflow, is_active: 0 }]));

      await expect(
        caller.salaryApproval.submit({
          workflowId: 1,
          batchTitle: "测试",
          totalAmount: 1000,
          workerCount: 1,
        })
      ).rejects.toThrow("审批工作流已停用");
    });
  });

  describe("process (approve)", () => {
    it("should approve and advance to next step", async () => {
      const approvalRecord = {
        id: 1,
        workflow_id: 1,
        batch_code: "SAL-202601-123456",
        batch_title: "2026年1月绩效奖金",
        current_step: 1,
        status: "in_progress",
        approval_history: JSON.stringify([
          { step: 0, role: "submitter", approver: "user1", action: "submit", comment: "提交审批", timestamp: Date.now() },
        ]),
      };

      // Mock: get approval record
      mockExecute.mockResolvedValueOnce(selectResult([approvalRecord]));
      // Mock: getWorkflowById
      mockExecute.mockResolvedValueOnce(selectResult([sampleWorkflow]));
      // Mock: UPDATE approval record (advance to step 2)
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryApproval.process({
        recordId: 1,
        action: "approve",
        comment: "主管审核通过",
      });

      expect(result.status).toBe("in_progress");
      expect(result.currentStep).toBe(2);
      expect(result.nextApprover).toBe("hr");
      expect(result.message).toContain("已通过");
    });

    it("should approve final step and complete workflow", async () => {
      const approvalRecord = {
        id: 1,
        workflow_id: 1,
        batch_code: "SAL-202601-123456",
        current_step: 4, // last step
        status: "in_progress",
        approval_history: JSON.stringify([
          { step: 0, role: "submitter", approver: "user1", action: "submit", comment: "提交", timestamp: Date.now() },
          { step: 1, role: "supervisor", approver: "sup1", action: "approve", comment: "通过", timestamp: Date.now() },
          { step: 2, role: "hr", approver: "hr1", action: "approve", comment: "通过", timestamp: Date.now() },
          { step: 3, role: "finance", approver: "fin1", action: "approve", comment: "通过", timestamp: Date.now() },
        ]),
      };

      // Mock: get approval record
      mockExecute.mockResolvedValueOnce(selectResult([approvalRecord]));
      // Mock: getWorkflowById
      mockExecute.mockResolvedValueOnce(selectResult([sampleWorkflow]));
      // Mock: UPDATE approval record (complete)
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryApproval.process({
        recordId: 1,
        action: "approve",
        comment: "总监签批通过",
      });

      expect(result.status).toBe("approved");
      expect(result.message).toContain("已完成");
    });
  });

  describe("process (reject)", () => {
    it("should reject an approval", async () => {
      const approvalRecord = {
        id: 1,
        workflow_id: 1,
        current_step: 2,
        status: "in_progress",
        approval_history: JSON.stringify([
          { step: 0, role: "submitter", approver: "user1", action: "submit", comment: "提交", timestamp: Date.now() },
          { step: 1, role: "supervisor", approver: "sup1", action: "approve", comment: "通过", timestamp: Date.now() },
        ]),
      };

      // Mock: get approval record
      mockExecute.mockResolvedValueOnce(selectResult([approvalRecord]));
      // Mock: getWorkflowById
      mockExecute.mockResolvedValueOnce(selectResult([sampleWorkflow]));
      // Mock: UPDATE approval record (reject)
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryApproval.process({
        recordId: 1,
        action: "reject",
        comment: "金额有误，请重新核算",
      });

      expect(result.status).toBe("rejected");
      expect(result.message).toContain("拒绝");
    });

    it("should throw error for already completed approval", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        workflow_id: 1,
        current_step: 4,
        status: "approved",
        approval_history: "[]",
      }]));

      await expect(
        caller.salaryApproval.process({
          recordId: 1,
          action: "approve",
        })
      ).rejects.toThrow("无法操作");
    });
  });

  describe("cancel", () => {
    it("should cancel an in-progress approval", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        workflow_id: 1,
        current_step: 1,
        status: "in_progress",
        approval_history: JSON.stringify([
          { step: 0, role: "submitter", approver: "user1", action: "submit", comment: "提交", timestamp: Date.now() },
        ]),
      }]));
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryApproval.cancel({
        recordId: 1,
        reason: "数据需要修正",
      });

      expect(result.status).toBe("cancelled");
      expect(result.message).toContain("已取消");
    });

    it("should throw error when cancelling approved record", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        status: "approved",
        approval_history: "[]",
      }]));

      await expect(
        caller.salaryApproval.cancel({ recordId: 1 })
      ).rejects.toThrow("已批准的审批不能取消");
    });

    it("should throw error when cancelling already cancelled record", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        status: "cancelled",
        approval_history: "[]",
      }]));

      await expect(
        caller.salaryApproval.cancel({ recordId: 1 })
      ).rejects.toThrow("审批已取消");
    });
  });

  // ========== 查询 ==========
  describe("getRecords", () => {
    it("should return approval records with pagination", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        {
          id: 1,
          batch_code: "SAL-202601-001",
          batch_title: "1月奖金",
          status: "approved",
          total_amount: 85000,
          worker_count: 25,
          approval_history: "[]",
          workflow_steps: JSON.stringify([
            { step: 1, role: "supervisor", title: "主管审核", required: true },
          ]),
          workflow_name: "标准审批",
        },
      ]));
      // Mock: count query
      mockExecute.mockResolvedValueOnce(selectResult([{ total: 1 }]));

      const result = await caller.salaryApproval.getRecords({});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.records[0].batch_code).toBe("SAL-202601-001");
    });
  });

  describe("getDetail", () => {
    it("should return detailed approval record", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        batch_code: "SAL-202601-001",
        batch_title: "1月奖金",
        status: "in_progress",
        current_step: 2,
        total_amount: 85000,
        approval_history: JSON.stringify([
          { step: 0, role: "submitter", approver: "user1", action: "submit", comment: "提交", timestamp: Date.now() },
          { step: 1, role: "supervisor", approver: "sup1", action: "approve", comment: "通过", timestamp: Date.now() },
        ]),
        workflow_steps: JSON.stringify([
          { step: 1, role: "supervisor", title: "主管审核", required: true },
          { step: 2, role: "hr", title: "HR确认", required: true },
        ]),
        workflow_name: "标准审批",
        workflow_description: "标准四级审批",
      }]));

      const result = await caller.salaryApproval.getDetail({ recordId: 1 });
      expect(result).toBeDefined();
      expect(result!.batch_code).toBe("SAL-202601-001");
      expect(result!.approval_history).toHaveLength(2);
      expect(result!.workflow_steps).toHaveLength(2);
    });

    it("should return null for non-existent record", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.salaryApproval.getDetail({ recordId: 999 });
      expect(result).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return approval statistics by status", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { status: "approved", count: 10, total_amount: 500000, total_workers: 150 },
        { status: "in_progress", count: 3, total_amount: 120000, total_workers: 45 },
        { status: "rejected", count: 2, total_amount: 80000, total_workers: 30 },
      ]));
      // Mock: avg duration query
      mockExecute.mockResolvedValueOnce(selectResult([{ avg_duration: 86400000 }])); // 1 day in ms

      const result = await caller.salaryApproval.getStats();
      expect(result).toBeDefined();
      expect(result.byStatus).toHaveProperty("approved");
      expect(result.byStatus.approved.count).toBe(10);
      expect(result.byStatus.in_progress.count).toBe(3);
      expect(result.avgApprovalDurationMs).toBe(86400000);
      expect(result.avgApprovalDurationHours).toBe(24);
    });
  });

  describe("getPending", () => {
    it("should return pending approvals for a specific role", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        {
          id: 1,
          current_step: 2,
          status: "in_progress",
          batch_title: "1月奖金",
          approval_history: "[]",
          workflow_steps: JSON.stringify([
            { step: 1, role: "supervisor", title: "主管审核", required: true },
            { step: 2, role: "hr", title: "HR确认", required: true },
          ]),
          workflow_name: "标准审批",
        },
      ]));

      const result = await caller.salaryApproval.getPending({ role: "hr" });
      expect(result).toHaveLength(1);
      expect(result[0].batch_title).toBe("1月奖金");
    });

    it("should return empty array when no pending approvals for role", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        {
          id: 1,
          current_step: 1,
          status: "in_progress",
          approval_history: "[]",
          workflow_steps: JSON.stringify([
            { step: 1, role: "supervisor", title: "主管审核", required: true },
            { step: 2, role: "hr", title: "HR确认", required: true },
          ]),
        },
      ]));

      const result = await caller.salaryApproval.getPending({ role: "finance" });
      expect(result).toHaveLength(0); // step 1 is supervisor, not finance
    });
  });
});
