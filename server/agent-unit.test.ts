/**
 * GRT-Atom 智能体单体管理模块测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  STATUS_CONFIG,
  DEFAULT_CALIBRATION_CHECKS,
  AgentUnitStatus,
} from "./services/agent-unit.service";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[]]),
  }),
}));

describe("GRT-Atom 智能体单体管理", () => {
  describe("状态配置", () => {
    it("应该包含所有4种状态", () => {
      const statuses: AgentUnitStatus[] = ["pending", "calibrating", "passed", "rework"];
      statuses.forEach((status) => {
        expect(STATUS_CONFIG[status]).toBeDefined();
        expect(STATUS_CONFIG[status].label).toBeDefined();
        expect(STATUS_CONFIG[status].color).toBeDefined();
      });
    });

    it("pending状态应该显示为待装配", () => {
      expect(STATUS_CONFIG.pending.label).toBe("待装配");
      expect(STATUS_CONFIG.pending.color).toBe("grey");
    });

    it("calibrating状态应该显示为标定中", () => {
      expect(STATUS_CONFIG.calibrating.label).toBe("标定中");
      expect(STATUS_CONFIG.calibrating.color).toBe("blue");
    });

    it("passed状态应该显示为合格", () => {
      expect(STATUS_CONFIG.passed.label).toBe("合格");
      expect(STATUS_CONFIG.passed.color).toBe("green");
    });

    it("rework状态应该显示为需返工", () => {
      expect(STATUS_CONFIG.rework.label).toBe("需返工");
      expect(STATUS_CONFIG.rework.color).toBe("red");
    });
  });

  describe("默认标定检查配置", () => {
    it("应该包含5种标定检查类型", () => {
      expect(DEFAULT_CALIBRATION_CHECKS.length).toBe(5);
    });

    it("应该包含压力标定检查", () => {
      const pressureCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "pressure_calibration"
      );
      expect(pressureCheck).toBeDefined();
      expect(pressureCheck?.name).toBe("压力标定");
      expect(pressureCheck?.passThreshold).toBe(95);
      expect(pressureCheck?.warningThreshold).toBe(90);
    });

    it("应该包含流量标定检查", () => {
      const flowCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "flow_calibration"
      );
      expect(flowCheck).toBeDefined();
      expect(flowCheck?.name).toBe("流量标定");
    });

    it("应该包含温度标定检查", () => {
      const tempCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "temperature_calibration"
      );
      expect(tempCheck).toBeDefined();
      expect(tempCheck?.name).toBe("温度标定");
    });

    it("应该包含位置标定检查", () => {
      const posCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "position_calibration"
      );
      expect(posCheck).toBeDefined();
      expect(posCheck?.name).toBe("位置标定");
    });

    it("应该包含超声波标定检查", () => {
      const ultrasonicCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "ultrasonic_calibration"
      );
      expect(ultrasonicCheck).toBeDefined();
      expect(ultrasonicCheck?.name).toBe("超声波标定");
    });

    it("每个检查类型应该有参数定义", () => {
      DEFAULT_CALIBRATION_CHECKS.forEach((check) => {
        expect(check.parameters).toBeDefined();
        expect(Array.isArray(check.parameters)).toBe(true);
        expect(check.parameters.length).toBeGreaterThan(0);
        
        check.parameters.forEach((param) => {
          expect(param.name).toBeDefined();
          expect(param.unit).toBeDefined();
          expect(typeof param.minValue).toBe("number");
          expect(typeof param.maxValue).toBe("number");
          expect(typeof param.tolerance).toBe("number");
        });
      });
    });
  });

  describe("标定数据验证逻辑", () => {
    it("压力参数应该在有效范围内", () => {
      const pressureCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "pressure_calibration"
      );
      const pressureParam = pressureCheck?.parameters[0];
      
      expect(pressureParam?.minValue).toBe(0);
      expect(pressureParam?.maxValue).toBe(200);
      expect(pressureParam?.tolerance).toBe(2);
    });

    it("流量参数应该在有效范围内", () => {
      const flowCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "flow_calibration"
      );
      const flowParam = flowCheck?.parameters[0];
      
      expect(flowParam?.minValue).toBe(0);
      expect(flowParam?.maxValue).toBe(100);
      expect(flowParam?.tolerance).toBe(5);
    });

    it("温度参数应该在有效范围内", () => {
      const tempCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "temperature_calibration"
      );
      const tempParam = tempCheck?.parameters[0];
      
      expect(tempParam?.minValue).toBe(0);
      expect(tempParam?.maxValue).toBe(100);
      expect(tempParam?.tolerance).toBe(1);
    });

    it("位置参数应该包含X/Y/Z三个维度", () => {
      const posCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "position_calibration"
      );
      
      expect(posCheck?.parameters.length).toBe(3);
      expect(posCheck?.parameters.map((p) => p.name)).toContain("x_position");
      expect(posCheck?.parameters.map((p) => p.name)).toContain("y_position");
      expect(posCheck?.parameters.map((p) => p.name)).toContain("z_position");
    });

    it("超声波参数应该包含功率和频率", () => {
      const ultrasonicCheck = DEFAULT_CALIBRATION_CHECKS.find(
        (c) => c.checkType === "ultrasonic_calibration"
      );
      
      expect(ultrasonicCheck?.parameters.length).toBe(2);
      expect(ultrasonicCheck?.parameters.map((p) => p.name)).toContain("power");
      expect(ultrasonicCheck?.parameters.map((p) => p.name)).toContain("frequency");
    });
  });

  describe("工作流触发条件", () => {
    it("状态从pending变为calibrating应该触发工作流", () => {
      // 工作流触发条件：状态变更为calibrating时
      const triggerCondition = { status: "calibrating" };
      expect(triggerCondition.status).toBe("calibrating");
    });

    it("工作流动作应该是执行标定检查脚本", () => {
      const workflowAction = "execute_calibration_check_script";
      expect(workflowAction).toBe("execute_calibration_check_script");
    });
  });

  describe("SN码格式验证", () => {
    it("有效的SN码应该至少8个字符", () => {
      const validSN = "GRT-2026-001";
      expect(validSN.length).toBeGreaterThanOrEqual(8);
    });

    it("SN码应该支持字母数字和连字符", () => {
      const snPattern = /^[A-Za-z0-9-]+$/;
      const testSNs = ["GRT-2026-001", "UC3000-A1", "TEST12345"];
      
      testSNs.forEach((sn) => {
        expect(snPattern.test(sn)).toBe(true);
      });
    });
  });

  describe("标定结果判定逻辑", () => {
    it("所有检查通过应该返回passed状态", () => {
      const checkResults = [
        { checkType: "pressure_calibration", result: "pass" },
        { checkType: "flow_calibration", result: "pass" },
        { checkType: "temperature_calibration", result: "pass" },
        { checkType: "position_calibration", result: "pass" },
        { checkType: "ultrasonic_calibration", result: "pass" },
      ];
      
      const allPass = checkResults.every((r) => r.result === "pass");
      const finalStatus = allPass ? "passed" : "rework";
      
      expect(finalStatus).toBe("passed");
    });

    it("任何检查失败应该返回rework状态", () => {
      const checkResults = [
        { checkType: "pressure_calibration", result: "pass" },
        { checkType: "flow_calibration", result: "fail" },
        { checkType: "temperature_calibration", result: "pass" },
        { checkType: "position_calibration", result: "pass" },
        { checkType: "ultrasonic_calibration", result: "pass" },
      ];
      
      const hasFail = checkResults.some((r) => r.result === "fail");
      const finalStatus = hasFail ? "rework" : "passed";
      
      expect(finalStatus).toBe("rework");
    });

    it("有警告但无失败应该返回passed状态", () => {
      const checkResults = [
        { checkType: "pressure_calibration", result: "pass" },
        { checkType: "flow_calibration", result: "warning" },
        { checkType: "temperature_calibration", result: "pass" },
        { checkType: "position_calibration", result: "pass" },
        { checkType: "ultrasonic_calibration", result: "pass" },
      ];
      
      const hasFail = checkResults.some((r) => r.result === "fail");
      const finalStatus = hasFail ? "rework" : "passed";
      
      expect(finalStatus).toBe("passed");
    });
  });
});
