/**
 * v2.4.2 GRT-Atom智能体单体功能增强测试
 * 测试地理围栏告警、AI标定预测、批量导入模板下载功能
 */

import { describe, it, expect } from "vitest";
import {
  isPointInCircle,
  isPointInRectangle,
  isPointInGeofence,
  checkGeofenceTransition,
  PREDEFINED_GEOFENCES,
  type GeofenceConfig,
} from "./services/geofence-alert.service";
import {
  predictNextCalibration,
  detectTrend,
  predictAnomalyRisk,
  type CalibrationDataPoint,
} from "./services/calibration-ai-prediction.service";
import {
  getTemplateDefinition,
  getAllTemplates,
  generateCSVTemplate,
  generateExcelTemplateData,
  validateImportData,
  type TemplateType,
} from "./services/import-template.service";

describe("v2.4.2 GRT-Atom智能体单体功能增强", () => {
  // ==================== 地理围栏告警测试 ====================
  describe("地理围栏告警功能", () => {
    it("应该正确检测位置是否在矩形围栏内", () => {
      // 在围栏内
      expect(isPointInRectangle({ x: 10, y: 7.5 }, 0, 0, 20, 15)).toBe(true);
      expect(isPointInRectangle({ x: 0, y: 0 }, 0, 0, 20, 15)).toBe(true);
      expect(isPointInRectangle({ x: 20, y: 15 }, 0, 0, 20, 15)).toBe(true);

      // 在围栏外
      expect(isPointInRectangle({ x: -1, y: 7.5 }, 0, 0, 20, 15)).toBe(false);
      expect(isPointInRectangle({ x: 21, y: 7.5 }, 0, 0, 20, 15)).toBe(false);
      expect(isPointInRectangle({ x: 10, y: 16 }, 0, 0, 20, 15)).toBe(false);
    });

    it("应该正确检测位置是否在圆形围栏内", () => {
      // 在围栏内
      expect(isPointInCircle({ x: 10, y: 10 }, { x: 10, y: 10 }, 5)).toBe(true);
      expect(isPointInCircle({ x: 12, y: 10 }, { x: 10, y: 10 }, 5)).toBe(true);
      expect(isPointInCircle({ x: 10, y: 14 }, { x: 10, y: 10 }, 5)).toBe(true);

      // 在围栏外
      expect(isPointInCircle({ x: 16, y: 10 }, { x: 10, y: 10 }, 5)).toBe(false);
      expect(isPointInCircle({ x: 10, y: 16 }, { x: 10, y: 10 }, 5)).toBe(false);
      expect(isPointInCircle({ x: 0, y: 0 }, { x: 10, y: 10 }, 5)).toBe(false);
    });

    it("应该正确检测位置是否在围栏配置内", () => {
      const rectangleConfig: GeofenceConfig = {
        id: 1,
        name: "测试矩形区域",
        type: "rectangle",
        minX: 0,
        minY: 0,
        maxX: 20,
        maxY: 15,
        triggerType: "both",
        alertLevel: "info",
        notifyWebhook: false,
        notifyEmail: false,
        notifySystem: true,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(isPointInGeofence({ x: 10, y: 7.5 }, rectangleConfig)).toBe(true);
      expect(isPointInGeofence({ x: 25, y: 7.5 }, rectangleConfig)).toBe(false);
    });

    it("应该包含预定义的地理围栏区域", () => {
      expect(PREDEFINED_GEOFENCES).toBeDefined();
      expect(PREDEFINED_GEOFENCES.length).toBeGreaterThan(0);

      const calibrationZone = PREDEFINED_GEOFENCES.find((z) => z.name === "标定区");
      expect(calibrationZone).toBeDefined();
      expect(calibrationZone?.type).toBe("rectangle");
    });
  });

  // ==================== AI标定预测测试 ====================
  describe("AI标定预测功能", () => {
    const sampleCalibrationDataPoints: CalibrationDataPoint[] = [
      {
        timestamp: new Date("2024-01-01").getTime(),
        value: 2.48,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
      },
      {
        timestamp: new Date("2024-02-01").getTime(),
        value: 2.52,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
      },
      {
        timestamp: new Date("2024-03-01").getTime(),
        value: 2.55,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
      },
      {
        timestamp: new Date("2024-04-01").getTime(),
        value: 2.58,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
      },
      {
        timestamp: new Date("2024-05-01").getTime(),
        value: 2.60,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: false,
      },
    ];

    const sampleCalibrationRecords: CalibrationRecord[] = [
      {
        id: "1",
        serialNumber: "GRT-2024-001",
        parameter: "pressure",
        value: 2.48,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
        calibrationDate: new Date("2024-01-01").getTime(),
      },
      {
        id: "2",
        serialNumber: "GRT-2024-001",
        parameter: "pressure",
        value: 2.52,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
        calibrationDate: new Date("2024-02-01").getTime(),
      },
      {
        id: "3",
        serialNumber: "GRT-2024-001",
        parameter: "pressure",
        value: 2.55,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
        calibrationDate: new Date("2024-03-01").getTime(),
      },
      {
        id: "4",
        serialNumber: "GRT-2024-001",
        parameter: "pressure",
        value: 2.58,
        targetValue: 2.5,
        tolerance: 0.1,
        passed: true,
        calibrationDate: new Date("2024-04-01").getTime(),
      },
    ];

    it("应该能够预测下次标定时间", () => {
      const prediction = predictNextCalibration(sampleCalibrationDataPoints, "pressure");

      expect(prediction).toBeDefined();
      expect(prediction.date).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      // daysUntil可能为负数（如果已过期），所以只检查存在性
      expect(typeof prediction.daysUntil).toBe("number");
    });

    it("应该能够检测趋势", () => {
      const trend = detectTrend(sampleCalibrationDataPoints.map(d => d.value));

      expect(trend).toBeDefined();
      expect(["stable", "increasing", "decreasing", "volatile"]).toContain(trend);
    });

    it("应该能够预测异常风险", () => {
      const result = predictAnomalyRisk(sampleCalibrationDataPoints, "pressure");

      expect(result).toBeDefined();
      expect(result.risk).toBeDefined();
      expect(["low", "medium", "high"]).toContain(result.risk);
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });

    it("应该处理空数据集", () => {
      const prediction = predictNextCalibration([], "pressure");

      expect(prediction).toBeDefined();
      expect(prediction.confidence).toBeLessThanOrEqual(0.5);
    });

    it("应该处理单条记录", () => {
      const singleRecord = [sampleCalibrationDataPoints[0]];
      const prediction = predictNextCalibration(singleRecord, "pressure");

      expect(prediction).toBeDefined();
      expect(prediction.date).toBeGreaterThan(0);
    });
  });

  // ==================== 批量导入模板下载测试 ====================
  describe("批量导入模板下载功能", () => {
    it("应该能够获取所有模板列表", () => {
      const templates = getAllTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      // 检查模板结构
      const template = templates[0];
      expect(template.type).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.version).toBeDefined();
    });

    it("应该能够获取智能体单体模板定义", () => {
      const template = getTemplateDefinition("agent_unit");

      expect(template).toBeDefined();
      expect(template?.name).toBe("智能体单体批量导入模板");
      expect(template?.columns).toBeDefined();
      expect(template?.columns.length).toBeGreaterThan(0);
      expect(template?.sampleData).toBeDefined();
      expect(template?.instructions).toBeDefined();
    });

    it("应该能够获取标定数据模板定义", () => {
      const template = getTemplateDefinition("calibration_data");

      expect(template).toBeDefined();
      expect(template?.name).toBe("标定数据批量导入模板");

      // 检查必要列
      const parameterCol = template?.columns.find(
        (c) => c.name === "parameter"
      );
      expect(parameterCol).toBeDefined();
      expect(parameterCol?.type).toBe("enum");
      expect(parameterCol?.enumValues).toContain("pressure");
    });

    it("应该能够生成CSV格式模板", () => {
      const csv = generateCSVTemplate("agent_unit");

      expect(csv).toBeDefined();
      expect(typeof csv).toBe("string");
      expect(csv.length).toBeGreaterThan(0);

      // 检查CSV包含表头
      expect(csv).toContain("SN码");
      expect(csv).toContain("型号");
      expect(csv).toContain("状态");

      // 检查CSV包含示例数据
      expect(csv).toContain("GRT-2024-001");
    });

    it("应该能够生成Excel格式模板数据", () => {
      const excelData = generateExcelTemplateData("agent_unit");

      expect(excelData).toBeDefined();
      expect(excelData.sheetName).toBe("智能体单体批量导入模板");
      expect(excelData.headers).toBeDefined();
      expect(excelData.headers.length).toBeGreaterThan(0);
      expect(excelData.data).toBeDefined();
      expect(excelData.data.length).toBeGreaterThan(0);
      expect(excelData.instructions).toBeDefined();
      expect(excelData.columnInfo).toBeDefined();
    });

    it("应该能够验证有效的导入数据", () => {
      const validData = [
        {
          serial_number: "GRT-2024-001",
          model: "GRT-A100",
          status: "pending",
          production_date: "2024-01-15",
        },
        {
          serial_number: "GRT-2024-002",
          model: "GRT-A100",
          status: "calibrating",
          production_date: "2024-01-16",
        },
      ];

      const result = validateImportData("agent_unit", validData);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);
    });

    it("应该能够检测无效的导入数据", () => {
      const invalidData = [
        {
          serial_number: "", // 必填字段为空
          model: "GRT-A100",
          status: "pending",
        },
        {
          serial_number: "GRT-2024-002",
          model: "GRT-A100",
          status: "invalid_status", // 无效的枚举值
        },
        {
          serial_number: "GRT-2024-003",
          model: "GRT-A100",
          status: "passed",
          production_date: "2024/01/15", // 错误的日期格式
        },
      ];

      const result = validateImportData("agent_unit", invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.invalidRows).toBeGreaterThan(0);
    });

    it("应该支持所有预定义的模板类型", () => {
      const templateTypes: TemplateType[] = [
        "agent_unit",
        "calibration_data",
        "toothpaste_test",
        "geofence_config",
        "uwb_anchor",
        "uwb_tag",
      ];

      for (const type of templateTypes) {
        const template = getTemplateDefinition(type);
        expect(template).toBeDefined();
        expect(template?.type).toBe(type);

        // 确保可以生成CSV
        const csv = generateCSVTemplate(type);
        expect(csv.length).toBeGreaterThan(0);

        // 确保可以生成Excel数据
        const excelData = generateExcelTemplateData(type);
        expect(excelData.headers.length).toBeGreaterThan(0);
      }
    });

    it("应该处理未知的模板类型", () => {
      const template = getTemplateDefinition("unknown_type" as TemplateType);
      expect(template).toBeNull();

      expect(() => generateCSVTemplate("unknown_type" as TemplateType)).toThrow();
    });
  });

  // ==================== 集成测试 ====================
  describe("功能集成测试", () => {
    it("地理围栏和AI预测应该能够协同工作", () => {
      // 模拟场景：智能体单体进入标定区后，系统应该能够预测下次标定时间
      // 检查位置是否在标定区
      const isInZone = isPointInRectangle({ x: 30, y: 7.5 }, 20, 0, 40, 15);
      expect(isInZone).toBe(true);

      // 如果在标定区，可以触发标定预测
      const mockDataPoints: CalibrationDataPoint[] = [
        {
          timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
          value: 2.5,
          targetValue: 2.5,
          tolerance: 0.1,
          passed: true,
        },
      ];

      const prediction = predictNextCalibration(mockDataPoints, "pressure");
      expect(prediction.date).toBeGreaterThan(Date.now());
    });

    it("模板验证应该与实际业务数据兼容", () => {
      // 使用模板中的示例数据进行验证
      const template = getTemplateDefinition("agent_unit");
      expect(template).toBeDefined();

      const result = validateImportData("agent_unit", template!.sampleData);
      expect(result.valid).toBe(true);
      expect(result.validRows).toBe(template!.sampleData.length);
    });
  });
});
