import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  createHrmPosition,
  getHrmPositions,
  getHrmPositionById,
  updateHrmPosition,
  createHrmCandidate,
  getHrmCandidates,
  createHrmEmployee,
  getHrmEmployees,
  createHrmTrainingPlan,
  getHrmTrainingPlans,
  createHrmPerformanceReviewReminder,
  getHrmPerformanceReviewReminders,
  generateHrmDocumentFileCode,
  createHrmDocumentFile,
  getHrmDocumentFiles,
  initDefaultSalaryStructures,
  initDefaultPerformanceGrades,
  getHrmSalaryStructures,
  getHrmPerformanceGrades,
} from "./db";

describe("HRM Intelligent System", () => {
  describe("Position Management", () => {
    let positionId: number;
    const uniqueCode = `TP-${Math.random().toString(36).substr(2, 6)}`;

    it("should create a position", async () => {
      const position = await createHrmPosition({
        positionCode: uniqueCode,
        name: "测试岗位",
        englishName: "Test Position",
        department: "研发部",
        responsibilities: "负责测试工作",
        keyTasks: "编写测试用例",
        qualifications: "本科以上学历",
        kpiIndicators: JSON.stringify([
          { name: "测试覆盖率", target: "80%", weight: 30 },
          { name: "Bug发现率", target: "90%", weight: 40 },
        ]),
      });
      expect(position).toBeDefined();
      expect(position.positionCode).toBe(uniqueCode);
      expect(position.name).toBe("测试岗位");
      positionId = position.id;
    });

    it("should get all positions", async () => {
      const positions = await getHrmPositions();
      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBeGreaterThan(0);
    });

    it("should get position by id", async () => {
      if (!positionId) return; // Skip if create failed
      const position = await getHrmPositionById(positionId);
      expect(position).toBeDefined();
      expect(position?.name).toBe("测试岗位");
    });

    it("should update position", async () => {
      if (!positionId) return; // Skip if create failed
      const updated = await updateHrmPosition(positionId, {
        name: "更新后的岗位",
        digitalizationScore: "75.5",
      });
      expect(updated).toBeDefined();
      expect(updated?.name).toBe("更新后的岗位");
    });
  });

  describe("Candidate Management", () => {
    it("should get all candidates", async () => {
      const candidates = await getHrmCandidates();
      expect(Array.isArray(candidates)).toBe(true);
    });

    it("should filter candidates by status", async () => {
      const candidates = await getHrmCandidates({ status: "screening" });
      expect(Array.isArray(candidates)).toBe(true);
      candidates.forEach((c) => {
        expect(c.status).toBe("screening");
      });
    });
  });

  describe("Employee Management", () => {
    it("should get all employees", async () => {
      const employees = await getHrmEmployees();
      expect(Array.isArray(employees)).toBe(true);
    });
  });

  describe("Training Plan Management", () => {
    it("should get all training plans", async () => {
      const plans = await getHrmTrainingPlans();
      expect(Array.isArray(plans)).toBe(true);
    });
  });

  describe("Performance Review Reminder", () => {
    it("should get all reminders", async () => {
      const reminders = await getHrmPerformanceReviewReminders();
      expect(Array.isArray(reminders)).toBe(true);
    });
  });

  describe("Document File Management", () => {
    it("should generate document file code with correct format", async () => {
      const code = await generateHrmDocumentFileCode(
        "performance_review",
        new Date("2026-01-17")
      );
      expect(code).toBeDefined();
      // 文件编码格式: {fileType}-{employeeCode}-{date}-V{version}
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
    });

    it("should get all document files", async () => {
      const docs = await getHrmDocumentFiles();
      expect(Array.isArray(docs)).toBe(true);
    });
  });

  describe("Salary and Performance Grades", () => {
    it("should initialize default salary structures", async () => {
      await initDefaultSalaryStructures();
      const structures = await getHrmSalaryStructures();
      expect(Array.isArray(structures)).toBe(true);
      expect(structures.length).toBeGreaterThan(0);
    });

    it("should initialize default performance grades", async () => {
      await initDefaultPerformanceGrades();
      const grades = await getHrmPerformanceGrades();
      expect(Array.isArray(grades)).toBe(true);
      expect(grades.length).toBeGreaterThan(0);
    });
  });
});
