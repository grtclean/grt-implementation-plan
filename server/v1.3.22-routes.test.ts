/**
 * v1.3.22 新路由单元测试
 * 测试T工序管理、客户问卷、项目阶段门禁路由
 */

import { describe, it, expect } from "vitest";

// 测试processManagement路由
describe("processManagement Router", () => {
  it("should export processManagementRouter", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter).toBeDefined();
  });

  it("should have getProcessDefinitions procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.getProcessDefinitions).toBeDefined();
  });

  it("should have getProjectProcessInstances procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.getProjectProcessInstances).toBeDefined();
  });

  it("should have updateProcessStatus procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.updateProcessStatus).toBeDefined();
  });

  it("should have getAiSopRecommendations procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.getAiSopRecommendations).toBeDefined();
  });

  it("should have getProcessDashboardStats procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.getProcessDashboardStats).toBeDefined();
  });

  it("should have getRiskAlerts procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.getRiskAlerts).toBeDefined();
  });

  it("should have getM2Tags procedure", async () => {
    const { processManagementRouter } = await import("./routers/processManagement.router");
    expect(processManagementRouter._def.procedures.getM2Tags).toBeDefined();
  });
});

// 测试questionnaire路由
describe("questionnaire Router", () => {
  it("should export questionnaireRouter", async () => {
    const { questionnaireRouter } = await import("./routers/questionnaire.router");
    expect(questionnaireRouter).toBeDefined();
  });

  it("should have list procedure", async () => {
    const { questionnaireRouter } = await import("./routers/questionnaire.router");
    expect(questionnaireRouter._def.procedures.list).toBeDefined();
  });

  it("should have getById procedure", async () => {
    const { questionnaireRouter } = await import("./routers/questionnaire.router");
    expect(questionnaireRouter._def.procedures.getById).toBeDefined();
  });

  it("should have create procedure", async () => {
    const { questionnaireRouter } = await import("./routers/questionnaire.router");
    expect(questionnaireRouter._def.procedures.create).toBeDefined();
  });
});

// 测试projectGate路由
describe("projectGate Router", () => {
  it("should export projectGateRouter", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter).toBeDefined();
  });

  it("should have getStageDefinitions procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getStageDefinitions).toBeDefined();
  });

  it("should have getProjectStages procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getProjectStages).toBeDefined();
  });

  it("should have getProjectStageDetail procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getProjectStageDetail).toBeDefined();
  });

  it("should have getGateChecklist procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getGateChecklist).toBeDefined();
  });

  it("should have updateChecklistItem procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.updateChecklistItem).toBeDefined();
  });

  it("should have requestGatePass procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.requestGatePass).toBeDefined();
  });

  it("should have approveGatePass procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.approveGatePass).toBeDefined();
  });

  it("should have getRedBlueRecords procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getRedBlueRecords).toBeDefined();
  });

  it("should have createRedBlueSession procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.createRedBlueSession).toBeDefined();
  });

  it("should have recordRedBlueResult procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.recordRedBlueResult).toBeDefined();
  });

  it("should have getStageStats procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getStageStats).toBeDefined();
  });

  it("should have getUpcomingGates procedure", async () => {
    const { projectGateRouter } = await import("./routers/projectGate.router");
    expect(projectGateRouter._def.procedures.getUpcomingGates).toBeDefined();
  });
});

// 测试production路由
describe("production Router", () => {
  it("should export productionRouter", async () => {
    const { productionRouter } = await import("./routers/production.router");
    expect(productionRouter).toBeDefined();
  });

  it("should have list procedure for work orders", async () => {
    const { productionRouter } = await import("./routers/production.router");
    expect(productionRouter._def.procedures.list).toBeDefined();
  });

  it("should have getById procedure", async () => {
    const { productionRouter } = await import("./routers/production.router");
    expect(productionRouter._def.procedures.getById).toBeDefined();
  });

  it("should have create procedure", async () => {
    const { productionRouter } = await import("./routers/production.router");
    expect(productionRouter._def.procedures.create).toBeDefined();
  });

  it("should have updateStatus procedure", async () => {
    const { productionRouter } = await import("./routers/production.router");
    expect(productionRouter._def.procedures.updateStatus).toBeDefined();
  });
});

// 测试appRouter中的路由集成
describe("appRouter Integration", () => {
  it("should have router definition", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def).toBeDefined();
  }, 10000);

  it("should have procedures object", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toBeDefined();
  });

  it("should have multiple procedures registered", async () => {
    const { appRouter } = await import("./routers");
    const procedureCount = Object.keys(appRouter._def.procedures).length;
    expect(procedureCount).toBeGreaterThan(10);
  });
});
