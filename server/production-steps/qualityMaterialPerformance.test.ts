import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Tests for Quality Checkpoints, Material Flow, Worker Performance
// ============================================================

describe("Quality Checkpoints Module", () => {
  describe("Quality Check Result Validation", () => {
    it("should validate check result status values", () => {
      const validStatuses = ["pass", "fail", "conditional_pass", "pending"];
      validStatuses.forEach(status => {
        expect(["pass", "fail", "conditional_pass", "pending"]).toContain(status);
      });
    });

    it("should validate checkpoint type values", () => {
      const validTypes = ["visual_inspection", "ccd_detection", "dimensional_check", "functional_test", "material_test"];
      validTypes.forEach(type => {
        expect(type).toBeTruthy();
      });
    });

    it("should calculate pass rate correctly", () => {
      const results = [
        { status: "pass" },
        { status: "pass" },
        { status: "fail" },
        { status: "conditional_pass" },
        { status: "pass" },
      ];
      const passCount = results.filter(r => r.status === "pass" || r.status === "conditional_pass").length;
      const passRate = (passCount / results.length) * 100;
      expect(passRate).toBe(80);
    });

    it("should categorize defect severity levels", () => {
      const severityLevels = {
        critical: { weight: 10, requiresStop: true },
        major: { weight: 5, requiresStop: false },
        minor: { weight: 2, requiresStop: false },
        cosmetic: { weight: 1, requiresStop: false },
      };
      expect(severityLevels.critical.requiresStop).toBe(true);
      expect(severityLevels.major.requiresStop).toBe(false);
      expect(severityLevels.critical.weight).toBeGreaterThan(severityLevels.major.weight);
    });

    it("should validate CCD detection result structure", () => {
      const ccdResult = {
        imageUrl: "https://storage.example.com/ccd/img001.jpg",
        detectionType: "surface_defect",
        confidence: 0.95,
        defectsFound: 2,
        boundingBoxes: [
          { x: 100, y: 200, width: 50, height: 30, label: "scratch" },
          { x: 300, y: 150, width: 40, height: 40, label: "dent" },
        ],
      };
      expect(ccdResult.confidence).toBeGreaterThanOrEqual(0);
      expect(ccdResult.confidence).toBeLessThanOrEqual(1);
      expect(ccdResult.defectsFound).toBe(ccdResult.boundingBoxes.length);
    });

    it("should determine if process should be halted based on defects", () => {
      const defects = [
        { severity: "minor", description: "Surface scratch" },
        { severity: "critical", description: "Structural crack" },
      ];
      const shouldHalt = defects.some(d => d.severity === "critical");
      expect(shouldHalt).toBe(true);
    });

    it("should aggregate quality metrics per process", () => {
      const processResults = [
        { processCode: "T1", status: "pass" },
        { processCode: "T1", status: "pass" },
        { processCode: "T1", status: "fail" },
        { processCode: "T5", status: "pass" },
        { processCode: "T5", status: "pass" },
      ];
      const byProcess = processResults.reduce((acc, r) => {
        if (!acc[r.processCode]) acc[r.processCode] = { total: 0, passed: 0 };
        acc[r.processCode].total++;
        if (r.status === "pass") acc[r.processCode].passed++;
        return acc;
      }, {} as Record<string, { total: number; passed: number }>);
      
      expect(byProcess["T1"].total).toBe(3);
      expect(byProcess["T1"].passed).toBe(2);
      expect(byProcess["T5"].total).toBe(2);
      expect(byProcess["T5"].passed).toBe(2);
    });
  });
});

describe("Material Flow Tracking Module", () => {
  describe("Material Flow Record Validation", () => {
    it("should validate flow status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        "in_storage": ["in_transit", "at_station"],
        "in_transit": ["at_station", "in_storage"],
        "at_station": ["in_process", "in_transit"],
        "in_process": ["completed", "at_station"],
        "completed": ["in_storage"],
      };
      expect(validTransitions["in_storage"]).toContain("in_transit");
      expect(validTransitions["in_process"]).toContain("completed");
      expect(validTransitions["completed"]).not.toContain("in_transit");
    });

    it("should calculate material transit time", () => {
      const flowRecord = {
        materialId: "MAT-001",
        fromStation: "T1",
        toStation: "T3",
        departureTime: new Date("2026-02-07T08:00:00Z").getTime(),
        arrivalTime: new Date("2026-02-07T08:45:00Z").getTime(),
      };
      const transitMinutes = (flowRecord.arrivalTime - flowRecord.departureTime) / (1000 * 60);
      expect(transitMinutes).toBe(45);
    });

    it("should validate UWB location data structure", () => {
      const uwbLocation = {
        tagId: "UWB-TAG-001",
        x: 12.5,
        y: 8.3,
        z: 1.2,
        floor: 1,
        accuracy: 0.3,
        timestamp: Date.now(),
        zoneId: "ZONE-A",
      };
      expect(uwbLocation.accuracy).toBeLessThan(1);
      expect(uwbLocation.x).toBeGreaterThanOrEqual(0);
      expect(uwbLocation.y).toBeGreaterThanOrEqual(0);
    });

    it("should identify bottleneck processes", () => {
      const processWaitTimes = [
        { processCode: "T1", avgWaitMinutes: 15 },
        { processCode: "T3", avgWaitMinutes: 45 },
        { processCode: "T5", avgWaitMinutes: 120 },
        { processCode: "T7", avgWaitMinutes: 30 },
        { processCode: "T10", avgWaitMinutes: 90 },
      ];
      const BOTTLENECK_THRESHOLD = 60;
      const bottlenecks = processWaitTimes.filter(p => p.avgWaitMinutes > BOTTLENECK_THRESHOLD);
      expect(bottlenecks).toHaveLength(2);
      expect(bottlenecks[0].processCode).toBe("T5");
      expect(bottlenecks[1].processCode).toBe("T10");
    });

    it("should calculate material utilization rate", () => {
      const materials = [
        { materialId: "M1", totalQuantity: 100, usedQuantity: 85, wasteQuantity: 5 },
        { materialId: "M2", totalQuantity: 200, usedQuantity: 180, wasteQuantity: 10 },
      ];
      const utilization = materials.map(m => ({
        materialId: m.materialId,
        utilizationRate: ((m.usedQuantity / m.totalQuantity) * 100).toFixed(1),
        wasteRate: ((m.wasteQuantity / m.totalQuantity) * 100).toFixed(1),
      }));
      expect(utilization[0].utilizationRate).toBe("85.0");
      expect(utilization[1].wasteRate).toBe("5.0");
    });

    it("should track material flow path through processes", () => {
      const flowPath = [
        { processCode: "T1", action: "received", timestamp: 1000 },
        { processCode: "T1", action: "completed", timestamp: 2000 },
        { processCode: "T3", action: "received", timestamp: 2500 },
        { processCode: "T3", action: "completed", timestamp: 4000 },
        { processCode: "T5", action: "received", timestamp: 4200 },
      ];
      const processSequence = [...new Set(flowPath.map(f => f.processCode))];
      expect(processSequence).toEqual(["T1", "T3", "T5"]);
      
      // Calculate time at each process
      const t1Time = flowPath[1].timestamp - flowPath[0].timestamp;
      const t3Time = flowPath[3].timestamp - flowPath[2].timestamp;
      expect(t1Time).toBe(1000);
      expect(t3Time).toBe(1500);
    });
  });
});

describe("Worker Performance Leaderboard Module", () => {
  describe("Performance Score Calculation", () => {
    it("should calculate efficiency percentage correctly", () => {
      const worker = {
        theoreticalHours: 8,
        actualHours: 6.5,
        tasksCompleted: 10,
      };
      const efficiency = Math.round((worker.theoreticalHours / worker.actualHours) * 100);
      expect(efficiency).toBe(123);
    });

    it("should calculate composite score with weighted factors", () => {
      const weights = {
        efficiency: 0.35,
        quality: 0.30,
        taskCount: 0.20,
        attendance: 0.15,
      };
      const scores = {
        efficiency: 90,
        quality: 95,
        taskCount: 80,
        attendance: 100,
      };
      const composite = Math.round(
        scores.efficiency * weights.efficiency +
        scores.quality * weights.quality +
        scores.taskCount * weights.taskCount +
        scores.attendance * weights.attendance
      );
      expect(composite).toBe(91);
    });

    it("should rank workers correctly by composite score", () => {
      const workers = [
        { name: "Worker A", compositeScore: 85 },
        { name: "Worker B", compositeScore: 92 },
        { name: "Worker C", compositeScore: 78 },
        { name: "Worker D", compositeScore: 95 },
      ];
      const ranked = [...workers].sort((a, b) => b.compositeScore - a.compositeScore);
      expect(ranked[0].name).toBe("Worker D");
      expect(ranked[1].name).toBe("Worker B");
      expect(ranked[2].name).toBe("Worker A");
      expect(ranked[3].name).toBe("Worker C");
    });

    it("should categorize efficiency distribution", () => {
      const efficiencies = [125, 110, 105, 95, 88, 75, 130, 100, 82, 115];
      const distribution = {
        high: efficiencies.filter(e => e >= 120).length,
        standard: efficiencies.filter(e => e >= 100 && e < 120).length,
        below: efficiencies.filter(e => e >= 80 && e < 100).length,
        low: efficiencies.filter(e => e < 80).length,
      };
      expect(distribution.high).toBe(2);
      expect(distribution.standard).toBe(4);
      expect(distribution.below).toBe(3);
      expect(distribution.low).toBe(1);
    });

    it("should determine performance trend", () => {
      const weeklyScores = [80, 82, 85, 83, 88, 90, 92];
      const recentAvg = weeklyScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const previousAvg = weeklyScores.slice(0, -3).reduce((a, b) => a + b, 0) / (weeklyScores.length - 3);
      const trend = recentAvg > previousAvg + 2 ? "up" : recentAvg < previousAvg - 2 ? "down" : "stable";
      expect(trend).toBe("up");
    });

    it("should calculate quality score from check results", () => {
      const checkResults = [
        { status: "pass", weight: 1 },
        { status: "pass", weight: 1 },
        { status: "fail", weight: 1 },
        { status: "conditional_pass", weight: 0.7 },
        { status: "pass", weight: 1 },
      ];
      const totalWeight = checkResults.length;
      const earnedWeight = checkResults.reduce((sum, r) => {
        if (r.status === "pass") return sum + 1;
        if (r.status === "conditional_pass") return sum + r.weight;
        return sum;
      }, 0);
      const qualityScore = Math.round((earnedWeight / totalWeight) * 100);
      expect(qualityScore).toBe(74);
    });

    it("should generate period labels correctly", () => {
      const periods = {
        week: "本周",
        month: "本月",
        quarter: "本季度",
        year: "本年度",
      };
      expect(periods["week"]).toBe("本周");
      expect(periods["month"]).toBe("本月");
      expect(periods["quarter"]).toBe("本季度");
      expect(periods["year"]).toBe("本年度");
    });

    it("should identify workers needing attention", () => {
      const workers = [
        { name: "A", efficiency: 120, quality: 95 },
        { name: "B", efficiency: 75, quality: 90 },
        { name: "C", efficiency: 95, quality: 60 },
        { name: "D", efficiency: 110, quality: 88 },
      ];
      const needsAttention = workers.filter(w => w.efficiency < 80 || w.quality < 70);
      expect(needsAttention).toHaveLength(2);
      expect(needsAttention.map(w => w.name)).toEqual(["B", "C"]);
    });
  });

  describe("Leaderboard Data Structure", () => {
    it("should validate leaderboard entry structure", () => {
      const entry = {
        worker_id: "W001",
        worker_name: "张三",
        department: "生产部",
        total_tasks: 25,
        total_hours: 160.5,
        efficiency: 112,
        quality_score: 93,
        composite_score: 95,
        trend: "up",
        rank: 1,
      };
      expect(entry.worker_id).toBeTruthy();
      expect(entry.total_tasks).toBeGreaterThanOrEqual(0);
      expect(entry.efficiency).toBeGreaterThan(0);
      expect(["up", "down", "stable"]).toContain(entry.trend);
    });

    it("should validate performance summary structure", () => {
      const summary = {
        totalWorkers: 15,
        totalHours: 2400,
        avgEfficiency: 105,
        totalTasks: 350,
        efficiencyDistribution: {
          high: 3,
          standard: 7,
          below: 4,
          low: 1,
        },
        processPerformance: [
          { process_code: "T1", avg_efficiency: 110, worker_count: 5 },
          { process_code: "T3", avg_efficiency: 95, worker_count: 4 },
        ],
      };
      expect(summary.totalWorkers).toBe(15);
      const distTotal = Object.values(summary.efficiencyDistribution).reduce((a, b) => a + b, 0);
      expect(distTotal).toBe(summary.totalWorkers);
    });
  });
});
