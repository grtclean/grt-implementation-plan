import { describe, it, expect } from "vitest";
import { getCapacityProjectionReport } from "./system-stability.service";
import type { CapacityProjectionReport } from "./system-stability.service";

describe("system-stability: getCapacityProjectionReport", () => {
  // ----------------------------------------------------------------
  // 1. 100 machines — cluster architecture (100/30 = 4 instances)
  // ----------------------------------------------------------------
  describe("100 machines (cluster)", () => {
    let report: CapacityProjectionReport;

    it("returns cluster architecture for 100 machines", () => {
      report = getCapacityProjectionReport(100);
      expect(report.targetMachines).toBe(100);
      expect(report.architecture.type).toBe("cluster");
    });

    it("calculates 4 instances (ceil(100/30))", () => {
      report = getCapacityProjectionReport(100);
      expect(report.architecture.instanceCount).toBe(4); // ceil(100/30) = 4
    });

    it("distributes machines per instance evenly", () => {
      report = getCapacityProjectionReport(100);
      expect(report.architecture.machinesPerInstance).toBe(25); // ceil(100/4) = 25
    });

    it("recommendation mentions cluster deployment", () => {
      report = getCapacityProjectionReport(100);
      expect(report.architecture.recommendation).toContain("Deploy");
      expect(report.architecture.recommendation).toContain("4");
    });
  });

  // ----------------------------------------------------------------
  // 2. 1 machine — single architecture
  // ----------------------------------------------------------------
  describe("1 machine (single)", () => {
    let report: CapacityProjectionReport;

    it("returns single architecture for 1 machine", () => {
      report = getCapacityProjectionReport(1);
      expect(report.architecture.type).toBe("single");
      expect(report.architecture.instanceCount).toBe(1);
    });

    it("single instance handles 1 machine", () => {
      report = getCapacityProjectionReport(1);
      expect(report.architecture.machinesPerInstance).toBe(1);
    });

    it("recommendation mentions single instance", () => {
      report = getCapacityProjectionReport(1);
      expect(report.architecture.recommendation).toContain("Single");
    });
  });

  // ----------------------------------------------------------------
  // 3. 50 machines — disk chunking strategy (<=50)
  // ----------------------------------------------------------------
  describe("50 machines (disk chunking)", () => {
    it("uses disk strategy for exactly 50 machines", () => {
      const report = getCapacityProjectionReport(50);
      expect(report.fileChunking.strategy).toBe("disk");
    });

    it("disk buffer size is 20MB", () => {
      const report = getCapacityProjectionReport(50);
      expect(report.fileChunking.bufferSizeMb).toBe(20);
    });

    it("recommendation mentions disk-based chunk storage", () => {
      const report = getCapacityProjectionReport(50);
      expect(report.fileChunking.recommendation).toContain("Disk");
    });
  });

  // ----------------------------------------------------------------
  // 4. 51 machines — redis chunking strategy (>50)
  // ----------------------------------------------------------------
  describe("51 machines (redis chunking)", () => {
    it("uses redis strategy for 51 machines", () => {
      const report = getCapacityProjectionReport(51);
      expect(report.fileChunking.strategy).toBe("redis");
    });

    it("redis buffer size is 50MB", () => {
      const report = getCapacityProjectionReport(51);
      expect(report.fileChunking.bufferSizeMb).toBe(50);
    });

    it("recommendation mentions Redis for chunk buffer", () => {
      const report = getCapacityProjectionReport(51);
      expect(report.fileChunking.recommendation).toContain("Redis");
    });
  });

  // ----------------------------------------------------------------
  // 5. SSE connections: 100*2=200, perInstanceCap=500
  // ----------------------------------------------------------------
  describe("SSE connections", () => {
    it("100 machines produce 200 total SSE connections (2 per machine)", () => {
      const report = getCapacityProjectionReport(100);
      expect(report.sseConnections.totalConnections).toBe(200);
    });

    it("perInstanceCap is 500", () => {
      const report = getCapacityProjectionReport(100);
      expect(report.sseConnections.perInstanceCap).toBe(500);
    });

    it("100 machines: 200 connections < 500 cap, uses in-memory pubsub", () => {
      const report = getCapacityProjectionReport(100);
      expect(report.sseConnections.pubsubStrategy).toBe("in-memory");
    });

    it("300 machines: 600 connections > 500 cap, uses redis pubsub", () => {
      const report = getCapacityProjectionReport(300);
      expect(report.sseConnections.totalConnections).toBe(600);
      expect(report.sseConnections.pubsubStrategy).toBe("redis");
    });

    it("250 machines: 500 connections = cap, stays in-memory", () => {
      const report = getCapacityProjectionReport(250);
      expect(report.sseConnections.totalConnections).toBe(500);
      expect(report.sseConnections.pubsubStrategy).toBe("in-memory");
    });

    it("251 machines: 502 connections > cap, switches to redis", () => {
      const report = getCapacityProjectionReport(251);
      expect(report.sseConnections.totalConnections).toBe(502);
      expect(report.sseConnections.pubsubStrategy).toBe("redis");
    });
  });

  // ----------------------------------------------------------------
  // 6. Database pool size calculation
  // ----------------------------------------------------------------
  describe("database pool size", () => {
    it("100 machines: pool = min(20, 5 + ceil(100/10)) = min(20, 15) = 15", () => {
      const report = getCapacityProjectionReport(100);
      expect(report.database.poolSize).toBe(15);
    });

    it("1 machine: pool = min(20, 5 + ceil(1/10)) = min(20, 6) = 6", () => {
      const report = getCapacityProjectionReport(1);
      expect(report.database.poolSize).toBe(6);
    });

    it("200 machines: pool capped at 20 = min(20, 5 + ceil(200/10)) = min(20, 25) = 20", () => {
      const report = getCapacityProjectionReport(200);
      expect(report.database.poolSize).toBe(20);
    });

    it("50 machines: pool = min(20, 5 + ceil(50/10)) = min(20, 10) = 10", () => {
      const report = getCapacityProjectionReport(50);
      expect(report.database.poolSize).toBe(10);
    });

    it("no read replicas when <= 200 machines", () => {
      const report = getCapacityProjectionReport(200);
      expect(report.database.readReplicas).toBe(0);
    });

    it("1 read replica when > 200 machines", () => {
      const report = getCapacityProjectionReport(201);
      expect(report.database.readReplicas).toBe(1);
    });
  });

  // ----------------------------------------------------------------
  // 7. pgbouncer recommended when > 50 machines
  // ----------------------------------------------------------------
  describe("pgbouncer recommendation", () => {
    it("not recommended for 50 machines", () => {
      const report = getCapacityProjectionReport(50);
      expect(report.database.pgbouncer).toBe(false);
    });

    it("recommended for 51 machines", () => {
      const report = getCapacityProjectionReport(51);
      expect(report.database.pgbouncer).toBe(true);
    });

    it("recommended for 100 machines", () => {
      const report = getCapacityProjectionReport(100);
      expect(report.database.pgbouncer).toBe(true);
    });

    it("recommendation text mentions pgbouncer for > 50", () => {
      const report = getCapacityProjectionReport(100);
      expect(report.database.recommendation).toContain("pgbouncer");
    });

    it("recommendation text does not mention pgbouncer for <= 50", () => {
      const report = getCapacityProjectionReport(50);
      expect(report.database.recommendation).toContain("direct connections");
    });
  });

  // ----------------------------------------------------------------
  // Default parameter (no argument)
  // ----------------------------------------------------------------
  describe("default parameter", () => {
    it("defaults to 100 machines when no argument provided", () => {
      const report = getCapacityProjectionReport();
      expect(report.targetMachines).toBe(100);
      expect(report.architecture.type).toBe("cluster");
    });
  });

  // ----------------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------------
  describe("edge cases", () => {
    it("30 machines: exactly 1 instance (single architecture)", () => {
      const report = getCapacityProjectionReport(30);
      expect(report.architecture.type).toBe("single");
      expect(report.architecture.instanceCount).toBe(1);
    });

    it("31 machines: 2 instances (cluster architecture)", () => {
      const report = getCapacityProjectionReport(31);
      expect(report.architecture.type).toBe("cluster");
      expect(report.architecture.instanceCount).toBe(2);
    });

    it("concurrent uploads capped at 10", () => {
      const report = getCapacityProjectionReport(500);
      expect(report.fileChunking.concurrentUploads).toBe(10);
    });

    it("concurrent uploads equals targetMachines when < 10", () => {
      const report = getCapacityProjectionReport(5);
      expect(report.fileChunking.concurrentUploads).toBe(5);
    });
  });
});
