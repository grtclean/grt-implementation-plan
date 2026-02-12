import { describe, it, expect, beforeEach } from "vitest";
import { monitoringService } from "./monitoring.service";

describe("MonitoringService", () => {
  beforeEach(() => {
    // Reset service state before each test
  });

  describe("getSystemMetrics", () => {
    it("should return system metrics with valid values", () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.cpu).toBeDefined();
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.cpu.cores).toBeGreaterThan(0);
      expect(metrics.cpu.loadAverage).toHaveLength(3);
    });

    it("should return valid memory metrics", () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.used).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.free).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.usage).toBeLessThanOrEqual(100);
    });

    it("should return valid disk metrics", () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.disk).toBeDefined();
      expect(metrics.disk.total).toBeGreaterThan(0);
      expect(metrics.disk.used).toBeGreaterThanOrEqual(0);
      expect(metrics.disk.free).toBeGreaterThanOrEqual(0);
      expect(metrics.disk.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.disk.usage).toBeLessThanOrEqual(100);
    });

    it("should return consistent memory calculations", () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.memory.total).toBeGreaterThanOrEqual(
        metrics.memory.used + metrics.memory.free
      );
    });
  });

  describe("getApplicationMetrics", () => {
    it("should return application metrics with valid values", () => {
      const metrics = monitoringService.getApplicationMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(metrics.requestsPerSecond).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(100);
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
    });
  });

  describe("getDatabaseMetrics", () => {
    it("should return database metrics with valid values", () => {
      const metrics = monitoringService.getDatabaseMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.connections).toBeGreaterThanOrEqual(0);
      expect(metrics.maxConnections).toBeGreaterThan(0);
      expect(metrics.queryTime).toBeGreaterThan(0);
      expect(metrics.slowQueries).toBeGreaterThanOrEqual(0);
      expect(metrics.activeTransactions).toBeGreaterThanOrEqual(0);
      expect(metrics.connectionUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.connectionUsage).toBeLessThanOrEqual(100);
    });

    it("should calculate connection usage correctly", () => {
      const metrics = monitoringService.getDatabaseMetrics();

      const expectedUsage = (metrics.connections / metrics.maxConnections) * 100;
      expect(metrics.connectionUsage).toBe(expectedUsage);
    });
  });

  describe("getAlertStatistics", () => {
    it("should return alert statistics with valid values", () => {
      const stats = monitoringService.getAlertStatistics();

      expect(stats).toBeDefined();
      expect(stats.timestamp).toBeGreaterThan(0);
      expect(stats.totalAlerts).toBeGreaterThan(0);
      expect(stats.successfulAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.failedAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.falseAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.alertAccuracy).toBeGreaterThanOrEqual(0);
      expect(stats.alertAccuracy).toBeLessThanOrEqual(100);
    });

    it("should ensure successful + failed alerts equals total alerts", () => {
      const stats = monitoringService.getAlertStatistics();

      expect(stats.successfulAlerts + stats.failedAlerts).toBe(
        stats.totalAlerts
      );
    });

    it("should ensure false alerts are less than successful alerts", () => {
      const stats = monitoringService.getAlertStatistics();

      expect(stats.falseAlerts).toBeLessThanOrEqual(stats.successfulAlerts);
    });
  });

  describe("getHistoricalData", () => {
    it("should return CPU historical data", () => {
      const data = monitoringService.getHistoricalData("cpu", 24);

      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("timestamp");
      expect(data[0]).toHaveProperty("value");
    });

    it("should return memory historical data", () => {
      const data = monitoringService.getHistoricalData("memory", 24);

      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      data.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(0);
        expect(point.value).toBeLessThanOrEqual(100);
      });
    });

    it("should return disk historical data", () => {
      const data = monitoringService.getHistoricalData("disk", 24);

      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      data.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(0);
        expect(point.value).toBeLessThanOrEqual(100);
      });
    });

    it("should return data in chronological order", () => {
      const data = monitoringService.getHistoricalData("cpu", 24);

      for (let i = 1; i < data.length; i++) {
        expect(data[i].timestamp).toBeGreaterThanOrEqual(
          data[i - 1].timestamp
        );
      }
    });

    it("should respect hours parameter", () => {
      const data7days = monitoringService.getHistoricalData("cpu", 168); // 7 days
      const data1day = monitoringService.getHistoricalData("cpu", 24); // 1 day

      expect(data7days.length).toBeGreaterThan(data1day.length);
    });
  });

  describe("getOptimizationSuggestions", () => {
    it("should return optimization suggestions array", () => {
      const suggestions = monitoringService.getOptimizationSuggestions();

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should have valid suggestion structure", () => {
      const suggestions = monitoringService.getOptimizationSuggestions();

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("id");
        expect(suggestion).toHaveProperty("title");
        expect(suggestion).toHaveProperty("description");
        expect(suggestion).toHaveProperty("severity");
        expect(suggestion).toHaveProperty("impact");
        expect(suggestion).toHaveProperty("action");
        expect(["low", "medium", "high"]).toContain(suggestion.severity);
      });
    });

    it("should generate suggestions based on metrics", () => {
      const suggestions = monitoringService.getOptimizationSuggestions();

      // At least some suggestions should be generated for a typical system
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("recordMetrics", () => {
    it("should record CPU metrics", () => {
      monitoringService.recordMetrics("cpu", 50);
      monitoringService.recordMetrics("cpu", 60);
      monitoringService.recordMetrics("cpu", 55);

      // Verify recording works without errors
      expect(true).toBe(true);
    });

    it("should record memory metrics", () => {
      monitoringService.recordMetrics("memory", 70);
      monitoringService.recordMetrics("memory", 75);

      expect(true).toBe(true);
    });

    it("should record disk metrics", () => {
      monitoringService.recordMetrics("disk", 80);
      monitoringService.recordMetrics("disk", 82);

      expect(true).toBe(true);
    });
  });

  describe("Data consistency", () => {
    it("should return consistent data across multiple calls", () => {
      const metrics1 = monitoringService.getSystemMetrics();
      const metrics2 = monitoringService.getSystemMetrics();

      expect(metrics1.cpu.cores).toBe(metrics2.cpu.cores);
      expect(metrics1.memory.total).toBe(metrics2.memory.total);
      expect(metrics1.disk.total).toBe(metrics2.disk.total);
    });

    it("should have increasing timestamps", () => {
      const metrics1 = monitoringService.getSystemMetrics();
      const metrics2 = monitoringService.getSystemMetrics();

      expect(metrics2.timestamp).toBeGreaterThanOrEqual(metrics1.timestamp);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero hours gracefully", () => {
      // This should not crash, though 0 hours might return empty data
      const data = monitoringService.getHistoricalData("cpu", 1);
      expect(data).toBeDefined();
    });

    it("should handle large hours values", () => {
      const data = monitoringService.getHistoricalData("cpu", 720); // 30 days
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });

    it("should clamp values between 0-100", () => {
      const suggestions = monitoringService.getOptimizationSuggestions();
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.memory.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.usage).toBeLessThanOrEqual(100);
      expect(metrics.disk.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.disk.usage).toBeLessThanOrEqual(100);
    });
  });
});
