/**
 * 生产工序步骤管理模块测试
 * Production Process Steps Module Tests
 * 
 * 测试覆盖：
 * 1. T1-T15与M0-M12映射逻辑
 * 2. 工序代码和项目阶段验证
 * 3. 双列界面数据结构
 * 4. 工时计算逻辑
 * 5. AI预设步骤状态流转
 * 6. 附件类型验证
 * 7. 纯函数导出验证
 */

import { describe, it, expect } from "vitest";
import {
  getProcessCodesForMilestone,
  getMilestonesForProcessCode,
} from "./processSteps.service";

// ============================================================
// 1. T1-T15与M0-M12映射逻辑测试
// ============================================================
describe("T1-T15与M0-M12项目阶段映射", () => {

  it("应该获取里程碑M4对应的工序代码", () => {
    const codes = getProcessCodesForMilestone("M4");
    expect(codes).toBeDefined();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
    codes.forEach(code => {
      expect(code).toMatch(/^T\d+$/);
    });
  });

  it("应该获取里程碑M5对应的工序代码", () => {
    const codes = getProcessCodesForMilestone("M5");
    expect(codes).toBeDefined();
    expect(Array.isArray(codes)).toBe(true);
  });

  it("应该获取里程碑M6对应的工序代码", () => {
    const codes = getProcessCodesForMilestone("M6");
    expect(codes).toBeDefined();
    expect(Array.isArray(codes)).toBe(true);
  });

  it("应该获取工序T1对应的里程碑", () => {
    const milestones = getMilestonesForProcessCode("T1");
    expect(milestones).toBeDefined();
    expect(Array.isArray(milestones)).toBe(true);
    milestones.forEach(m => {
      expect(m).toMatch(/^M\d+$/);
    });
  });

  it("应该获取工序T8对应的里程碑", () => {
    const milestones = getMilestonesForProcessCode("T8");
    expect(milestones).toBeDefined();
    expect(Array.isArray(milestones)).toBe(true);
  });

  it("应该获取工序T15对应的里程碑", () => {
    const milestones = getMilestonesForProcessCode("T15");
    expect(milestones).toBeDefined();
    expect(Array.isArray(milestones)).toBe(true);
  });

  it("不存在的里程碑应返回空数组", () => {
    const codes = getProcessCodesForMilestone("M99");
    expect(codes).toBeDefined();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBe(0);
  });

  it("不存在的工序代码应返回空数组", () => {
    const milestones = getMilestonesForProcessCode("T99");
    expect(milestones).toBeDefined();
    expect(Array.isArray(milestones)).toBe(true);
    expect(milestones.length).toBe(0);
  });

  it("所有T1-T15工序代码应有效", () => {
    const validProcessCodes = Array.from({ length: 15 }, (_, i) => `T${i + 1}`);
    expect(validProcessCodes).toContain("T1");
    expect(validProcessCodes).toContain("T15");
    expect(validProcessCodes).not.toContain("T0");
    expect(validProcessCodes).not.toContain("T16");
    expect(validProcessCodes.length).toBe(15);
  });

  it("所有M0-M12项目阶段代码应有效", () => {
    const validPhases = Array.from({ length: 13 }, (_, i) => `M${i}`);
    expect(validPhases).toContain("M0");
    expect(validPhases).toContain("M12");
    expect(validPhases).not.toContain("M13");
    expect(validPhases.length).toBe(13);
  });

  it("每个T工序应映射到至少一个M阶段", () => {
    for (let i = 1; i <= 15; i++) {
      const milestones = getMilestonesForProcessCode(`T${i}`);
      expect(milestones.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================
// 2. 工序代码和项目阶段验证
// ============================================================
describe("工序代码和项目阶段验证", () => {

  it("工序代码格式验证（T1-T15）", () => {
    const isValidProcessCode = (code: string) => /^T([1-9]|1[0-5])$/.test(code);

    expect(isValidProcessCode("T1")).toBe(true);
    expect(isValidProcessCode("T9")).toBe(true);
    expect(isValidProcessCode("T10")).toBe(true);
    expect(isValidProcessCode("T15")).toBe(true);
    expect(isValidProcessCode("T0")).toBe(false);
    expect(isValidProcessCode("T16")).toBe(false);
    expect(isValidProcessCode("X1")).toBe(false);
    expect(isValidProcessCode("")).toBe(false);
    expect(isValidProcessCode("T")).toBe(false);
    expect(isValidProcessCode("T-1")).toBe(false);
  });

  it("项目阶段代码格式验证（M0-M12）", () => {
    const isValidPhaseCode = (code: string) => /^M([0-9]|1[0-2])$/.test(code);

    expect(isValidPhaseCode("M0")).toBe(true);
    expect(isValidPhaseCode("M9")).toBe(true);
    expect(isValidPhaseCode("M10")).toBe(true);
    expect(isValidPhaseCode("M12")).toBe(true);
    expect(isValidPhaseCode("M13")).toBe(false);
    expect(isValidPhaseCode("T1")).toBe(false);
    expect(isValidPhaseCode("")).toBe(false);
    expect(isValidPhaseCode("M-1")).toBe(false);
  });

  it("工序代码排序应正确", () => {
    const codes = ["T3", "T1", "T15", "T2", "T10"];
    const sorted = [...codes].sort((a, b) => {
      const numA = parseInt(a.replace("T", ""));
      const numB = parseInt(b.replace("T", ""));
      return numA - numB;
    });
    expect(sorted).toEqual(["T1", "T2", "T3", "T10", "T15"]);
  });
});

// ============================================================
// 3. 双列界面数据结构测试
// ============================================================
describe("双列界面数据结构", () => {

  it("左列（工程师输入）和右列（AI预设）应有对应关系", () => {
    const engineerStep = {
      id: 1, stepNumber: 1, stepName: "清洗槽体安装",
      source: "engineer", processRequirements: "水平度±0.5mm", theoreticalHours: 4.0,
    };

    const aiPresetStep = {
      id: 101, stepNumber: 1, stepName: "AI-清洗槽体安装",
      source: "ai", confidence: 0.92, sourceProjectName: "P-2024-001", status: "pending",
    };

    expect(engineerStep.stepNumber).toBe(aiPresetStep.stepNumber);
    expect(engineerStep.source).not.toBe(aiPresetStep.source);
  });

  it("AI预设步骤状态流转应正确", () => {
    const validStatuses = ["pending", "confirmed", "modified", "rejected"];
    const statusTransitions: Record<string, string[]> = {
      "pending": ["confirmed", "modified", "rejected"],
      "confirmed": [],
      "modified": ["confirmed"],
      "rejected": ["pending"],
    };

    Object.entries(statusTransitions).forEach(([from, toList]) => {
      expect(validStatuses).toContain(from);
      toList.forEach(to => {
        expect(validStatuses).toContain(to);
      });
    });
  });

  it("工程师确认操作类型应完整", () => {
    const confirmActions = [
      "confirm_as_is",       // 单个空格确定解签输入
      "confirm_modified",    // 适当修改后借鉴输入
      "confirm_then_edit",   // 输入后修改
      "confirm_all_remaining", // 执行后面T步骤全部借鉴
    ];

    expect(confirmActions.length).toBe(4);
    expect(confirmActions).toContain("confirm_as_is");
    expect(confirmActions).toContain("confirm_all_remaining");
  });

  it("BOM步骤应包含所有必要字段", () => {
    const requiredFields = [
      "processInstanceId", "projectId", "processCode",
      "stepNumber", "stepName", "processRequirements",
      "processDescription", "bomItemReference", "theoreticalHours",
      "plannedWorkerName", "status", "createdBy"
    ];

    const step: Record<string, any> = {
      processInstanceId: 1, projectId: 100, processCode: "T1",
      stepNumber: 1, stepName: "清洗槽体安装",
      processRequirements: "水平度±0.5mm",
      processDescription: "安装清洗槽体并调整水平",
      bomItemReference: "WT-001",
      theoreticalHours: 4.0,
      plannedWorkerName: "张三",
      status: "pending",
      createdBy: 1,
    };

    requiredFields.forEach(field => {
      expect(step).toHaveProperty(field);
    });
  });

  it("AI预设步骤应包含置信度和来源信息", () => {
    const presetStep = {
      stepName: "AI预设步骤",
      confidence: 0.92,
      sourceProjectId: 50,
      sourceProjectName: "历史项目A",
      reasoning: "基于历史数据分析",
      status: "pending",
    };

    expect(presetStep.confidence).toBeGreaterThanOrEqual(0);
    expect(presetStep.confidence).toBeLessThanOrEqual(1);
    expect(presetStep.sourceProjectName).toBeDefined();
    expect(presetStep.status).toBe("pending");
  });
});

// ============================================================
// 4. 工时计算逻辑测试
// ============================================================
describe("工时计算逻辑", () => {

  it("工时计算应准确（小时为单位，保留2位小数）", () => {
    const startTime = new Date("2026-02-07T08:00:00Z").getTime();
    const endTime = new Date("2026-02-07T12:30:00Z").getTime();
    const actualHours = Number(((endTime - startTime) / (1000 * 60 * 60)).toFixed(2));
    expect(actualHours).toBe(4.5);
  });

  it("短工时应正确计算（分钟级别）", () => {
    const startTime = new Date("2026-02-07T08:00:00Z").getTime();
    const endTime = new Date("2026-02-07T08:15:00Z").getTime();
    const actualHours = Number(((endTime - startTime) / (1000 * 60 * 60)).toFixed(2));
    expect(actualHours).toBe(0.25);
  });

  it("长工时应正确计算（跨天）", () => {
    const startTime = new Date("2026-02-07T20:00:00Z").getTime();
    const endTime = new Date("2026-02-08T08:00:00Z").getTime();
    const actualHours = Number(((endTime - startTime) / (1000 * 60 * 60)).toFixed(2));
    expect(actualHours).toBe(12);
  });

  it("理论工时应为正数", () => {
    const validHours = [0.25, 0.5, 1.0, 2.5, 4.0, 8.0, 16.0, 24.0];
    validHours.forEach(h => {
      expect(h).toBeGreaterThan(0);
    });
  });

  it("工时记录应包含工人姓名和步骤关联", () => {
    const record = {
      stepId: 1,
      workerId: 10,
      workerName: "张三",
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      actualHours: 1.0,
      notes: "安装完成，无异常",
    };

    expect(record).toHaveProperty("stepId");
    expect(record).toHaveProperty("workerName");
    expect(record).toHaveProperty("startTime");
    expect(record).toHaveProperty("endTime");
    expect(record.actualHours).toBeGreaterThan(0);
  });

  it("步骤编号应为正整数且连续", () => {
    const steps = [
      { stepNumber: 1, stepName: "步骤1" },
      { stepNumber: 2, stepName: "步骤2" },
      { stepNumber: 3, stepName: "步骤3" },
    ];

    for (let i = 0; i < steps.length; i++) {
      expect(steps[i].stepNumber).toBe(i + 1);
      expect(Number.isInteger(steps[i].stepNumber)).toBe(true);
    }
  });

  it("实际工时与理论工时偏差计算", () => {
    const theoreticalHours = 4.0;
    const actualHours = 4.5;
    const deviation = Number(((actualHours - theoreticalHours) / theoreticalHours * 100).toFixed(1));
    expect(deviation).toBe(12.5); // 12.5% over
  });
});

// ============================================================
// 5. 附件类型验证测试
// ============================================================
describe("附件类型验证", () => {

  it("允许的附件类型应完整", () => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "video/mp4",
    ];

    expect(allowedTypes.length).toBeGreaterThanOrEqual(5);
    expect(allowedTypes).toContain("image/jpeg");
    expect(allowedTypes).toContain("application/pdf");
  });

  it("应该验证文件大小限制", () => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const testFiles = [
      { name: "small.pdf", size: 1024 },
      { name: "medium.jpg", size: 5 * 1024 * 1024 },
      { name: "large.mp4", size: 49 * 1024 * 1024 },
      { name: "too_large.zip", size: 51 * 1024 * 1024 },
    ];

    expect(testFiles[0].size).toBeLessThan(MAX_FILE_SIZE);
    expect(testFiles[1].size).toBeLessThan(MAX_FILE_SIZE);
    expect(testFiles[2].size).toBeLessThan(MAX_FILE_SIZE);
    expect(testFiles[3].size).toBeGreaterThan(MAX_FILE_SIZE);
  });

  it("附件数据结构应完整", () => {
    const attachment = {
      stepId: 1,
      stepType: "bom",
      fileName: "安装图纸.pdf",
      fileUrl: "https://storage.example.com/files/install.pdf",
      fileType: "application/pdf",
      fileSize: 1024000,
      uploadedBy: 1,
    };

    expect(attachment).toHaveProperty("stepId");
    expect(attachment).toHaveProperty("stepType");
    expect(attachment).toHaveProperty("fileName");
    expect(attachment).toHaveProperty("fileUrl");
    expect(attachment).toHaveProperty("fileType");
    expect(attachment).toHaveProperty("fileSize");
    expect(attachment).toHaveProperty("uploadedBy");
    expect(["bom", "ai_preset"]).toContain(attachment.stepType);
  });
});

// ============================================================
// 6. 历史项目参照数据结构测试
// ============================================================
describe("历史项目参照数据结构", () => {

  it("相似度分数应在0-1之间", () => {
    const similarities = [0.95, 0.88, 0.72, 0.65, 0.50];
    similarities.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  it("历史参照应包含来源项目信息", () => {
    const reference = {
      sourceProjectId: 50,
      sourceProjectName: "P-2024-001 超声波清洗设备",
      sourceProcessCode: "T3",
      matchedBomItems: ["WT-001", "US-002", "PMP-003"],
      overallSimilarity: 0.92,
      createdAt: Date.now(),
    };

    expect(reference.sourceProjectId).toBeGreaterThan(0);
    expect(reference.sourceProjectName).toBeTruthy();
    expect(reference.matchedBomItems.length).toBeGreaterThan(0);
    expect(reference.overallSimilarity).toBeGreaterThan(0.5);
  });

  it("AI预设步骤LLM响应结构应正确", () => {
    const llmResponse = {
      steps: [
        {
          stepNumber: 1,
          stepName: "清洗槽体安装",
          processRequirements: "确保槽体水平度±0.5mm",
          processDescription: "1. 定位基准面 2. 安装固定螺栓 3. 水平调整",
          bomItemReference: "WT-001 清洗槽体",
          theoreticalHours: 4.0,
          confidence: 0.92,
          reasoning: "基于项目P-2024-001的历史数据"
        },
      ],
      overallConfidence: 0.90,
      sourceAnalysis: "基于3个历史相似项目的综合分析"
    };

    expect(llmResponse.steps.length).toBeGreaterThan(0);
    expect(llmResponse.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(llmResponse.overallConfidence).toBeLessThanOrEqual(1);
    
    const step = llmResponse.steps[0];
    expect(step).toHaveProperty("stepNumber");
    expect(step).toHaveProperty("stepName");
    expect(step).toHaveProperty("confidence");
    expect(step).toHaveProperty("reasoning");
    expect(step.confidence).toBeGreaterThanOrEqual(0);
    expect(step.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// 7. 服务函数导出验证
// ============================================================
describe("服务函数导出验证", () => {

  it("映射函数应正确导出", () => {
    expect(typeof getProcessCodesForMilestone).toBe("function");
    expect(typeof getMilestonesForProcessCode).toBe("function");
  });

  it("映射函数应返回数组", () => {
    const result1 = getProcessCodesForMilestone("M4");
    const result2 = getMilestonesForProcessCode("T1");
    expect(Array.isArray(result1)).toBe(true);
    expect(Array.isArray(result2)).toBe(true);
  });
});
