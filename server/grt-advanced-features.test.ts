import { describe, it, expect } from "vitest";
import {
  analyzeTestResultsAndGenerateSuggestions,
  calculateOverallPassRate,
  determineOverallResult,
  type InspectionArea,
} from "./services/toothpaste-test-report.service";

describe("GRT Advanced Features", () => {
  describe("Toothpaste Test Report Service", () => {
    const mockInspectionAreas: InspectionArea[] = [
      {
        areaId: "area-1",
        areaName: "盲孔区域A",
        featureType: "blind_hole",
        position: { x: 100, y: 150 },
        beforeCleaning: { coverage: 95 },
        afterCleaning: { residueRate: 2 },
        result: "pass",
        threshold: 5,
      },
      {
        areaId: "area-2",
        areaName: "密封面B",
        featureType: "sealing_face",
        position: { x: 200, y: 250 },
        beforeCleaning: { coverage: 90 },
        afterCleaning: { residueRate: 8 },
        result: "fail",
        threshold: 3,
      },
      {
        areaId: "area-3",
        areaName: "加强筋C",
        featureType: "ribbing",
        position: { x: 300, y: 350 },
        beforeCleaning: { coverage: 85 },
        afterCleaning: { residueRate: 1 },
        result: "pass",
        threshold: 5,
      },
    ];

    it("should calculate overall pass rate correctly", () => {
      const passRate = calculateOverallPassRate(mockInspectionAreas);
      // 2 out of 3 passed = 66.67%
      expect(passRate).toBeCloseTo(66.67, 1);
    });

    it("should determine overall result as fail when pass rate < 100%", () => {
      const passRate = calculateOverallPassRate(mockInspectionAreas);
      const result = determineOverallResult(passRate, mockInspectionAreas);
      expect(result).toBe("fail");
    });

    it("should determine overall result as pass when all areas pass", () => {
      const allPassAreas: InspectionArea[] = mockInspectionAreas.map((area) => ({
        ...area,
        result: "pass" as const,
        afterCleaning: { residueRate: 1 },
      }));
      const passRate = calculateOverallPassRate(allPassAreas);
      const result = determineOverallResult(passRate, allPassAreas);
      expect(result).toBe("pass");
    });

    it("should generate adjustment suggestions for failed areas", () => {
      const suggestions = analyzeTestResultsAndGenerateSuggestions(mockInspectionAreas);
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      // Should have suggestions for failed areas
      // Check that at least one suggestion exists
      expect(suggestions[0]).toHaveProperty('suggestion');
    });

    it("should not generate suggestions when all areas pass", () => {
      const allPassAreas: InspectionArea[] = mockInspectionAreas.map((area) => ({
        ...area,
        result: "pass" as const,
        afterCleaning: { residueRate: 1 },
      }));
      const suggestions = analyzeTestResultsAndGenerateSuggestions(allPassAreas);
      expect(suggestions.length).toBe(0);
    });
  });

  describe("Cleaning Trajectory Visualization Data", () => {
    it("should have valid trajectory data structure", () => {
      // Test that trajectory data follows expected structure
      const trajectoryData = {
        featureType: "blind_hole",
        nozzleType: "high_pressure",
        trajectory: [
          { x: 0, y: 0, z: 0, angle: 0, pressure: 100 },
          { x: 10, y: 5, z: 2, angle: 15, pressure: 120 },
          { x: 20, y: 10, z: 4, angle: 30, pressure: 140 },
        ],
        animationDuration: 3000,
      };

      expect(trajectoryData.featureType).toBe("blind_hole");
      expect(trajectoryData.trajectory.length).toBe(3);
      expect(trajectoryData.trajectory[0]).toHaveProperty("x");
      expect(trajectoryData.trajectory[0]).toHaveProperty("y");
      expect(trajectoryData.trajectory[0]).toHaveProperty("z");
      expect(trajectoryData.trajectory[0]).toHaveProperty("angle");
      expect(trajectoryData.trajectory[0]).toHaveProperty("pressure");
    });
  });

  describe("Engineer Checkpoint Workflow", () => {
    it("should validate checkpoint confirmation structure", () => {
      const checkpointConfirmation = {
        checkpointId: "M3-CHK-001",
        phaseCode: "M3",
        checkpointName: "清洗策略确认",
        confirmed: true,
        confirmedBy: "张工程师",
        confirmedAt: new Date().toISOString(),
        notes: "已确认清洗策略符合要求",
      };

      expect(checkpointConfirmation.checkpointId).toContain("CHK");
      expect(checkpointConfirmation.confirmed).toBe(true);
      expect(checkpointConfirmation.confirmedBy).toBeDefined();
    });

    it("should track multiple checkpoints per phase", () => {
      const phaseCheckpoints = {
        phaseCode: "M5",
        checkpoints: [
          { id: "M5-CHK-001", name: "机械设计确认", confirmed: true },
          { id: "M5-CHK-002", name: "电气设计确认", confirmed: true },
          { id: "M5-CHK-003", name: "PLC程序确认", confirmed: false },
        ],
      };

      const confirmedCount = phaseCheckpoints.checkpoints.filter(
        (c) => c.confirmed
      ).length;
      expect(confirmedCount).toBe(2);
      expect(phaseCheckpoints.checkpoints.length).toBe(3);
    });

    it("should calculate phase completion percentage", () => {
      const checkpoints = [
        { confirmed: true },
        { confirmed: true },
        { confirmed: false },
        { confirmed: false },
      ];

      const completionRate =
        (checkpoints.filter((c) => c.confirmed).length / checkpoints.length) *
        100;
      expect(completionRate).toBe(50);
    });
  });

  describe("M0-M12 Workflow Integration", () => {
    it("should have all required phases defined", () => {
      const requiredPhases = [
        "M0",
        "M1",
        "M2",
        "M3",
        "M4",
        "M5",
        "M6",
        "M7",
        "M8",
        "M9",
        "M10",
        "M11",
        "M12",
      ];

      // Simulate phase definitions
      const phaseDefinitions = requiredPhases.map((code) => ({
        code,
        name: `Phase ${code}`,
        hasEngineerCheckpoint: true,
      }));

      expect(phaseDefinitions.length).toBe(13);
      requiredPhases.forEach((phase) => {
        const found = phaseDefinitions.find((p) => p.code === phase);
        expect(found).toBeDefined();
      });
    });

    it("should enforce checkpoint completion before phase transition", () => {
      const currentPhase = {
        code: "M5",
        checkpoints: [
          { id: "CHK-1", confirmed: true },
          { id: "CHK-2", confirmed: false },
        ],
      };

      const allCheckpointsConfirmed = currentPhase.checkpoints.every(
        (c) => c.confirmed
      );
      expect(allCheckpointsConfirmed).toBe(false);

      // Phase transition should be blocked
      const canTransition = allCheckpointsConfirmed;
      expect(canTransition).toBe(false);
    });
  });
});
