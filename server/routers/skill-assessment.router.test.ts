/**
 * Skill Assessment Router Tests — 岗位能力等级测评
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock service ──
const mockSvc = vi.hoisted(() => ({
  // Positions
  listPositionProfiles: vi.fn().mockResolvedValue([
    { id: 1, positionKey: "mechanical_assembly", positionName: "机械装配", skillDomains: [] },
    { id: 2, positionKey: "electrical_engineer", positionName: "电气工程师", skillDomains: [] },
  ]),
  getPositionProfile: vi.fn().mockResolvedValue({
    id: 1, positionKey: "mechanical_assembly", positionName: "机械装配",
    skillDomains: [{ key: "assembly_process", name: "装配工艺", weight: 30 }],
    passThresholds: { L1: 60, L2: 70, L3: 80, L4: 85, L5: 90 },
  }),
  upsertPositionProfile: vi.fn().mockResolvedValue({ success: true, positionKey: "welding" }),

  // Questions
  listQuestions: vi.fn().mockResolvedValue([
    { id: 1, positionKey: "mechanical_assembly", content: "螺栓拧紧顺序？", questionType: "single_choice" },
  ]),
  getQuestion: vi.fn().mockResolvedValue({
    id: 1, positionKey: "mechanical_assembly", content: "螺栓拧紧顺序？",
    options: [{ key: "A", text: "对角拧紧", isCorrect: true }],
  }),
  createQuestion: vi.fn().mockResolvedValue({ id: 10, positionKey: "welding", isManualEntry: true }),
  updateQuestion: vi.fn().mockResolvedValue({ success: true }),
  deleteQuestion: vi.fn().mockResolvedValue({ success: true }),
  batchImportQuestions: vi.fn().mockResolvedValue({ created: 5 }),
  getQuestionStats: vi.fn().mockResolvedValue({ total: 50, manualEntries: 12, byDifficultyAndType: [] }),

  // Papers
  listPapers: vi.fn().mockResolvedValue([{ id: 1, title: "机械装配L1考核", isPublished: true }]),
  createPaper: vi.fn().mockResolvedValue({ id: 2, title: "焊工L2考核" }),
  publishPaper: vi.fn().mockResolvedValue({ success: true }),

  // Sessions
  startSession: vi.fn().mockResolvedValue({ id: 1, status: "in_progress", paperId: 1 }),
  submitAnswer: vi.fn().mockResolvedValue({ questionId: 1, isCorrect: true, pointsEarned: 2 }),
  submitSession: vi.fn().mockResolvedValue({ sessionId: 1, status: "completed", finalScore: 85.5, passed: true }),
  getSessionDetail: vi.fn().mockResolvedValue({ id: 1, status: "completed", answers: [] }),
  listMySessions: vi.fn().mockResolvedValue([{ id: 1, status: "completed", finalScore: "85.50" }]),
  listPendingGrading: vi.fn().mockResolvedValue([{ id: 2, status: "grading" }]),
  completeGrading: vi.fn().mockResolvedValue({ sessionId: 2, finalScore: 78.0, passed: true }),

  // Grading
  gradeAnswer: vi.fn().mockResolvedValue({ success: true }),

  // Certs
  getMyCerts: vi.fn().mockResolvedValue([{ id: 1, positionKey: "mechanical_assembly", level: "L2", status: "active" }]),
  getCertsByPosition: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, level: "L3" }]),
  revokeCert: vi.fn().mockResolvedValue({ success: true }),
  getDashboardStats: vi.fn().mockResolvedValue({
    positionProfiles: 22, totalQuestions: 150, manualQuestions: 35,
    sessionsByStatus: [], activeCertsByLevel: [],
  }),
}));

vi.mock("../services/skill-assessment.service", () => mockSvc);

vi.mock("../../drizzle/skill-assessment-schema", () => ({
  skillPositionProfiles: { positionKey: "position_key", department: "department", isActive: "is_active" },
  skillQuestionBank: { id: "id", positionKey: "position_key", isActive: "is_active", isManualEntry: "is_manual_entry" },
  skillAssessmentPapers: { id: "id", positionKey: "position_key", isPublished: "is_published" },
  skillAssessmentSessions: { id: "id", employeeId: "employee_id", status: "status" },
  skillAssessmentAnswers: { id: "id", sessionId: "session_id", questionId: "question_id" },
  skillLevelCerts: { id: "id", employeeId: "employee_id", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((...a: any[]) => a), { raw: vi.fn((s: string) => s) }),
  desc: vi.fn((col: any) => col),
  inArray: vi.fn((...a: any[]) => a),
}));

vi.mock("../_core/trpc", () => {
  const passthrough = {
    use: vi.fn(() => passthrough),
    input: vi.fn(() => passthrough),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: { ...passthrough },
    publicProcedure: { ...passthrough },
    requirePermission: vi.fn(() => passthrough),
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { skillAssessmentRouter } from "./skill-assessment.router";

describe("skill-assessment.router", () => {
  beforeEach(() => vi.clearAllMocks());

  const ctx = { user: { id: 1, name: "TestAdmin", role: "admin" } } as any;
  const call = (fn: any, input?: any) => fn({ ctx, input, rawInput: undefined, path: "", type: "query" as const });
  const mutate = (fn: any, input?: any) => fn({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });

  // ── Position Profiles ──
  describe("positions", () => {
    it("list returns position profiles", async () => {
      const result = await call(skillAssessmentRouter.positions.list, {});
      expect(mockSvc.listPositionProfiles).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("get returns single profile", async () => {
      const result = await call(skillAssessmentRouter.positions.get, { positionKey: "mechanical_assembly" });
      expect(mockSvc.getPositionProfile).toHaveBeenCalledWith("mechanical_assembly");
      expect(result).toHaveProperty("positionName", "机械装配");
    });

    it("upsert creates/updates profile", async () => {
      const result = await mutate(skillAssessmentRouter.positions.upsert, {
        positionKey: "welding", positionName: "焊工",
        skillDomains: [{ key: "technique", name: "焊接技术", weight: 35 }],
      });
      expect(mockSvc.upsertPositionProfile).toHaveBeenCalled();
      expect(result).toHaveProperty("success", true);
    });
  });

  // ── Questions (人为输入题目) ──
  describe("questions", () => {
    it("list returns questions for a position", async () => {
      const result = await call(skillAssessmentRouter.questions.list, { positionKey: "mechanical_assembly" });
      expect(mockSvc.listQuestions).toHaveBeenCalledWith({ positionKey: "mechanical_assembly" });
      expect(result).toHaveLength(1);
    });

    it("get returns single question", async () => {
      const result = await call(skillAssessmentRouter.questions.get, { id: 1 });
      expect(mockSvc.getQuestion).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("content");
    });

    it("create allows manual question entry (人为输入题目)", async () => {
      const result = await mutate(skillAssessmentRouter.questions.create, {
        positionKey: "welding", domainKey: "welding_technique",
        questionType: "single_choice", difficulty: "basic",
        targetLevels: ["L1", "L2"],
        content: "CO2气体保护焊焊丝伸出长度？",
        options: [
          { key: "A", text: "5-8mm" },
          { key: "B", text: "10-15mm", isCorrect: true },
        ],
        correctAnswer: "B",
      });
      expect(mockSvc.createQuestion).toHaveBeenCalled();
      const calledArgs = mockSvc.createQuestion.mock.calls[0][0];
      expect(calledArgs.createdBy).toBe(1);
      expect(result).toHaveProperty("isManualEntry", true);
    });

    it("update modifies question", async () => {
      const result = await mutate(skillAssessmentRouter.questions.update, {
        id: 1, content: "Updated question", points: 3,
      });
      expect(mockSvc.updateQuestion).toHaveBeenCalledWith(1, { content: "Updated question", points: 3 });
      expect(result).toHaveProperty("success", true);
    });

    it("delete soft-deletes question", async () => {
      const result = await mutate(skillAssessmentRouter.questions.delete, { id: 1 });
      expect(mockSvc.deleteQuestion).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("success", true);
    });

    it("batchImport imports multiple questions", async () => {
      const questions = [
        {
          positionKey: "welding", domainKey: "safety",
          questionType: "true_false", difficulty: "basic",
          targetLevels: ["L1"], content: "焊接时不需要戴面罩",
        },
      ];
      const result = await mutate(skillAssessmentRouter.questions.batchImport, { questions });
      expect(mockSvc.batchImportQuestions).toHaveBeenCalled();
      expect(result).toHaveProperty("created", 5);
    });

    it("stats returns question bank statistics", async () => {
      const result = await call(skillAssessmentRouter.questions.stats, { positionKey: "mechanical_assembly" });
      expect(mockSvc.getQuestionStats).toHaveBeenCalledWith("mechanical_assembly");
      expect(result).toHaveProperty("total", 50);
      expect(result).toHaveProperty("manualEntries", 12);
    });
  });

  // ── Papers ──
  describe("papers", () => {
    it("list returns assessment papers", async () => {
      const result = await call(skillAssessmentRouter.papers.list, {});
      expect(mockSvc.listPapers).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("create builds a new paper", async () => {
      const result = await mutate(skillAssessmentRouter.papers.create, {
        title: "焊工L2考核", positionKey: "welding", targetLevel: "L2",
        totalPoints: 100, passScore: 70,
        questionComposition: [{ questionId: 1, points: 5, order: 1 }],
      });
      expect(mockSvc.createPaper).toHaveBeenCalled();
      expect(result).toHaveProperty("title", "焊工L2考核");
    });

    it("publish activates a paper", async () => {
      const result = await mutate(skillAssessmentRouter.papers.publish, { id: 1 });
      expect(mockSvc.publishPaper).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("success", true);
    });
  });

  // ── Sessions ──
  describe("sessions", () => {
    it("start creates a new assessment session", async () => {
      const result = await mutate(skillAssessmentRouter.sessions.start, { paperId: 1 });
      expect(mockSvc.startSession).toHaveBeenCalledWith(1, 1);
      expect(result).toHaveProperty("status", "in_progress");
    });

    it("submitAnswer records and auto-grades", async () => {
      const result = await mutate(skillAssessmentRouter.sessions.submitAnswer, {
        sessionId: 1, questionId: 1, selectedOptions: ["A"],
      });
      expect(mockSvc.submitAnswer).toHaveBeenCalled();
      expect(result).toHaveProperty("isCorrect", true);
    });

    it("submit finalizes session", async () => {
      const result = await mutate(skillAssessmentRouter.sessions.submit, { sessionId: 1 });
      expect(mockSvc.submitSession).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("passed", true);
    });

    it("getDetail returns session with answers", async () => {
      const result = await call(skillAssessmentRouter.sessions.getDetail, { sessionId: 1 });
      expect(mockSvc.getSessionDetail).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("status", "completed");
    });

    it("myList returns employee's sessions", async () => {
      const result = await call(skillAssessmentRouter.sessions.myList, {});
      expect(mockSvc.listMySessions).toHaveBeenCalledWith(1, {});
      expect(result).toHaveLength(1);
    });

    it("pendingGrading returns sessions awaiting grading", async () => {
      const result = await call(skillAssessmentRouter.sessions.pendingGrading, {});
      expect(mockSvc.listPendingGrading).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("completeGrading finalizes all subjective scoring", async () => {
      const result = await mutate(skillAssessmentRouter.sessions.completeGrading, { sessionId: 2 });
      expect(mockSvc.completeGrading).toHaveBeenCalledWith(2, 1);
      expect(result).toHaveProperty("passed", true);
    });
  });

  // ── Grading ──
  describe("grading", () => {
    it("gradeAnswer scores a subjective question", async () => {
      const result = await mutate(skillAssessmentRouter.grading.gradeAnswer, {
        answerId: 5, manualScore: 8, manualFeedback: "分析较完整",
      });
      expect(mockSvc.gradeAnswer).toHaveBeenCalledWith(5, {
        manualScore: 8, manualFeedback: "分析较完整", gradedBy: 1,
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  // ── Certs ──
  describe("certs", () => {
    it("myCerts returns employee certificates", async () => {
      const result = await call(skillAssessmentRouter.certs.myCerts);
      expect(mockSvc.getMyCerts).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });

    it("byPosition returns certs for a position", async () => {
      const result = await call(skillAssessmentRouter.certs.byPosition, { positionKey: "mechanical_assembly" });
      expect(mockSvc.getCertsByPosition).toHaveBeenCalledWith("mechanical_assembly");
      expect(result).toHaveLength(1);
    });

    it("revoke deactivates a certificate", async () => {
      const result = await mutate(skillAssessmentRouter.certs.revoke, { certId: 1, reason: "考核作弊" });
      expect(mockSvc.revokeCert).toHaveBeenCalledWith(1, "考核作弊");
      expect(result).toHaveProperty("success", true);
    });

    it("dashboard returns system-wide stats", async () => {
      const result = await call(skillAssessmentRouter.certs.dashboard);
      expect(mockSvc.getDashboardStats).toHaveBeenCalled();
      expect(result).toHaveProperty("positionProfiles", 22);
      expect(result).toHaveProperty("totalQuestions", 150);
    });
  });
});
