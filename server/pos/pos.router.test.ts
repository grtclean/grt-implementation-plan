import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";

describe("POS Router", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, name: "Test User", role: "admin" },
  } as any);

  describe("Dashboard", () => {
    it("should return overview data", async () => {
      const result = await caller.pos.dashboard.getOverview();
      expect(result).toHaveProperty("projectStats");
      expect(result).toHaveProperty("otd");
      expect(result).toHaveProperty("csat");
      expect(result).toHaveProperty("gmPercent");
      expect(result.projectStats).toHaveProperty("total");
      expect(result.projectStats).toHaveProperty("active");
      expect(result.projectStats).toHaveProperty("completed");
      expect(result.projectStats).toHaveProperty("atRisk");
    });

    it("should return recent activities", async () => {
      const result = await caller.pos.dashboard.getRecentActivities({ limit: 5 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return KPIs", async () => {
      const result = await caller.pos.dashboard.getKPIs();
      expect(result).toHaveProperty("monthly");
      expect(result).toHaveProperty("quarterly");
      expect(result.monthly).toHaveProperty("newProjects");
      expect(result.monthly).toHaveProperty("revenue");
    });
  });

  describe("Customer", () => {
    it("should list customers with pagination", async () => {
      const result = await caller.pos.customer.list({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("pageSize");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should create a customer with new enum values", async () => {
      const result = await caller.pos.customer.create({
        customerCode: "CUST-001",
        customerName: "Test Customer",
        customerType: "OEM",
        scenes: "Automotive",
        decisionWeights: { tech: 30, price: 25, value: 20, relation: 15, boss: 10 },
        deliveryRisk: "MEDIUM",
      });
      expect(result).toHaveProperty("id");
      expect(result.customerCode).toBe("CUST-001");
      expect(result.customerName).toBe("Test Customer");
    });

    it("should update a customer", async () => {
      const result = await caller.pos.customer.update({
        id: 1,
        customerName: "Updated Customer",
        customerType: "Tier1",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });
  });

  describe("Project", () => {
    it("should list projects with pagination", async () => {
      const result = await caller.pos.project.list({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should create a project with full details", async () => {
      const result = await caller.pos.project.create({
        projectCode: "GRT-001",
        projectName: "Test Project",
        customerId: 1,
        pm: 1,
        techLeader: 2,
        priority: "P1",
        plannedStartDate: "2024-01-01",
        plannedEndDate: "2024-06-30",
      });
      expect(result).toHaveProperty("id");
      expect(result.projectCode).toBe("GRT-001");
    });

    it("should get project stages with M0-M12", async () => {
      const result = await caller.pos.project.getStages({ projectId: 1 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(13); // M0-M12
      expect(result[0].stageCode).toBe("M0");
      expect(result[12].stageCode).toBe("M12");
    });

    it("should update stage owner", async () => {
      const result = await caller.pos.project.updateStageOwner({
        projectId: 1,
        stageCode: "M2",
        owner: 1,
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should update stage dates", async () => {
      const result = await caller.pos.project.updateStageDates({
        projectId: 1,
        stageCode: "M3",
        plannedStartDate: "2024-02-01",
        plannedEndDate: "2024-02-15",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });
  });

  describe("Stage", () => {
    it("should update stage status with new enum values", async () => {
      const result = await caller.pos.stage.updateStatus({
        id: 1,
        status: "InProgress",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should update stage input/output", async () => {
      const result = await caller.pos.stage.updateInputOutput({
        id: 1,
        inputJson: JSON.stringify({ requirements: ["req1", "req2"] }),
        outputJson: JSON.stringify({ deliverables: ["doc1"] }),
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should add task to stage with full details", async () => {
      const result = await caller.pos.stage.addTask({
        stageId: 1,
        taskName: "Test Task",
        assignee: 1,
        dueDate: "2024-02-01",
        priority: "HIGH",
      });
      expect(result).toHaveProperty("id");
      expect(result.taskName).toBe("Test Task");
    });

    it("should update task", async () => {
      const result = await caller.pos.stage.updateTask({
        stageId: 1,
        taskId: 1,
        status: "IN_PROGRESS",
        assignee: 2,
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should add audit log", async () => {
      const result = await caller.pos.stage.addAuditLog({
        stageId: 1,
        action: "status_changed",
        details: "Status changed from NotStarted to InProgress",
      });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("timestamp");
    });

    it("should upload attachment", async () => {
      const result = await caller.pos.stage.uploadAttachment({
        stageId: 1,
        fileName: "design_doc.pdf",
        fileUrl: "https://storage.example.com/files/design_doc.pdf",
        fileType: "application/pdf",
        version: "1.0",
      });
      expect(result).toHaveProperty("id");
      expect(result.fileName).toBe("design_doc.pdf");
    });
  });

  describe("Version", () => {
    it("should list versions for a project", async () => {
      const result = await caller.pos.version.list({ projectId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should generate AIV0 version", async () => {
      const result = await caller.pos.version.generateAIV0({
        projectId: 1,
        baseProjectCode: "GRT-347",
      });
      expect(result).toHaveProperty("id");
      expect(result.versionCode).toBe("AIV0");
      expect(result.status).toBe("Active");
      expect(result.baseProjectCode).toBe("GRT-347");
      expect(result).toHaveProperty("versionJson");
      expect(result).toHaveProperty("changesSummary");
    });

    it("should generate V1 version with differential inputs", { timeout: 30000 }, async () => {
      const result = await caller.pos.version.generateV1({
        projectId: 1,
        baseVersionId: 1,
        deltaInput: {
          specialTech: "UWB定位",
          packagingPerformance: "高洁净度包装",
          automation: "全自动上下料",
          environmental: "环保清洗剂",
          acceptance: "FAT+SAT双验收",
        },
      });
      expect(result).toHaveProperty("id");
      expect(result.versionCode).toBe("V1");
      expect(result.status).toBe("Draft");
      expect(result).toHaveProperty("changesSummary");
    });

    it("should confirm a version", async () => {
      const result = await caller.pos.version.confirm({
        id: 1,
        notes: "工程师确认通过",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("confirmedAt");
    });

    it("should activate a version", async () => {
      const result = await caller.pos.version.activate({ id: 1 });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result.status).toBe("Active");
    });

    it("should reject a version", async () => {
      const result = await caller.pos.version.reject({
        id: 2,
        reason: "需要修改M4阶段配置",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result.status).toBe("Rejected");
    });

    it("should compare two versions", async () => {
      const result = await caller.pos.version.compare({
        versionId1: 1,
        versionId2: 2,
      });
      expect(result).toHaveProperty("added");
      expect(result).toHaveProperty("modified");
      expect(result).toHaveProperty("removed");
      expect(Array.isArray(result.added)).toBe(true);
    });

    it("should rollback to a version", async () => {
      const result = await caller.pos.version.rollback({
        projectId: 1,
        targetVersionId: 1,
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("rolledBackAt");
    });
  });

  describe("AI", () => {
    it("should generate M2 summary", { timeout: 30000 }, async () => {
      const result = await caller.pos.ai.generateM2Summary({
        projectId: 1,
        stageId: 2,
        projectInfo: "GRT-456 汽车零部件清洗项目",
        customerInfo: "某知名汽车零部件供应商",
        requirementsInfo: "需要超声波清洗+真空干燥",
      });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("generatedAt");
    });

    it("should find similar projects", { timeout: 30000 }, async () => {
      const result = await caller.pos.ai.findSimilarProjects({
        projectId: 1,
        m2Json: JSON.stringify({ requirements: "汽车零部件清洗" }),
      });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("projects");
    });
  });

  describe("Procurement", () => {
    it("should list procurement suggestions", async () => {
      const result = await caller.pos.procurement.list({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("should generate PO suggestion", async () => {
      const result = await caller.pos.procurement.generate({
        projectId: 1,
        versionId: 1,
      });
      expect(result).toHaveProperty("success");
    }, 30000); // AI调用需要更长超时时间

    it("should confirm by engineer", async () => {
      const result = await caller.pos.procurement.engineerConfirm({
        id: 1,
        approved: true,
        notes: "物料清单确认无误",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result.engineerConfirm).toBe("Approved");
    });

    it("should confirm by procurement", async () => {
      const result = await caller.pos.procurement.procurementConfirm({
        id: 1,
        approved: true,
        notes: "采购确认",
        finalPoRef: "PO-2024-001",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result.procurementConfirm).toBe("Approved");
      expect(result.finalPoRef).toBe("PO-2024-001");
    });
  });

  describe("MES", () => {
    it("should list MES sync records", async () => {
      const result = await caller.pos.mes.list({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("should create work order with full details", async () => {
      const result = await caller.pos.mes.createWorkOrder({
        projectId: 1,
        stageId: 7,
        workOrderType: "Production",
        plannedStartDate: "2024-01-01",
        plannedEndDate: "2024-03-01",
      });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("mesWorkOrderId");
      expect(result.syncStatus).toBe("Pending");
    });

    it("should sync with MES", async () => {
      const result = await caller.pos.mes.sync({ 
        id: 1,
        direction: "Bidirectional",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result.syncStatus).toBe("Synced");
    });

    it("should get connection status", async () => {
      const result = await caller.pos.mes.getConnectionStatus();
      expect(result).toHaveProperty("mes");
      expect(result).toHaveProperty("erp");
      expect(result).toHaveProperty("im");
      expect(result.mes).toHaveProperty("connected");
      expect(result.mes).toHaveProperty("version");
    });

    it("should test connection", async () => {
      const result = await caller.pos.mes.testConnection({
        connectorType: "MES",
      });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("testedAt");
    });
  });

  describe("Connector", () => {
    it("should list connectors", async () => {
      const result = await caller.pos.connector.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create connector", async () => {
      const result = await caller.pos.connector.create({
        connectorCode: "ERP_TIANSI",
        connectorName: "天思ERP",
        connectorType: "ERP",
        config: JSON.stringify({ baseUrl: "https://erp.example.com" }),
      });
      expect(result).toHaveProperty("id");
      expect(result.connectorCode).toBe("ERP_TIANSI");
      expect(result.isEnabled).toBe(true);
    });

    it("should update connector", async () => {
      const result = await caller.pos.connector.update({
        id: 1,
        connectorName: "天思ERP v2",
        isEnabled: false,
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should test connector", async () => {
      const result = await caller.pos.connector.test({ id: 1 });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("lastTestedAt");
      expect(result.lastTestResult).toBe("Success");
    });

    it("should delete connector", async () => {
      const result = await caller.pos.connector.delete({ id: 1 });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });
  });

  describe("Review", () => {
    it("should list reviews for a project", async () => {
      const result = await caller.pos.review.list({ projectId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create M3 review", async () => {
      const result = await caller.pos.review.create({
        projectId: 1,
        stageId: 3,
        reviewType: "M3_ProjectApproval",
        reviewCarriage: "General",
      });
      expect(result).toHaveProperty("id");
      expect(result.conclusion).toBe("Pending");
    });

    it("should create M4 review with carriage", async () => {
      const result = await caller.pos.review.create({
        projectId: 1,
        stageId: 4,
        reviewType: "M4_DesignFreeze",
        reviewCarriage: "Mechanical",
      });
      expect(result).toHaveProperty("id");
      expect(result.reviewCarriage).toBe("Mechanical");
    });

    it("should update review", async () => {
      const result = await caller.pos.review.update({
        id: 1,
        conclusion: "Pass",
        responsible: 1,
        completionDate: "2024-02-15",
        comments: "评审通过，无重大风险",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result.conclusion).toBe("Pass");
    });

    it("should add attachment to review", async () => {
      const result = await caller.pos.review.addAttachment({
        reviewId: 1,
        fileName: "review_minutes.pdf",
        fileUrl: "https://storage.example.com/files/review_minutes.pdf",
      });
      expect(result).toHaveProperty("id");
      expect(result.fileName).toBe("review_minutes.pdf");
    });
  });

  describe("History", () => {
    it("should get historical projects index", async () => {
      const result = await caller.pos.history.getIndex();
      expect(result).toHaveProperty("projects");
      expect(result).toHaveProperty("stages");
      expect(result).toHaveProperty("totalProjects");
      expect(result).toHaveProperty("lastUpdated");
      expect(Array.isArray(result.projects)).toBe(true);
      expect(result.totalProjects).toBeGreaterThan(0);
    });

    it("should search similar projects locally", async () => {
      const result = await caller.pos.history.searchLocal({
        scene: "automotive_powertrain",
        customerType: "tier1_strategic",
      });
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("projects");
      expect(result).toHaveProperty("searchCriteria");
      expect(Array.isArray(result.projects)).toBe(true);
    });

    it("should get historical projects index string for AI", async () => {
      const result = await caller.pos.history.getIndexString();
      expect(result).toHaveProperty("indexString");
      expect(typeof result.indexString).toBe("string");
      expect(result.indexString.length).toBeGreaterThan(0);
    });

    it("should get project stages definition", async () => {
      const result = await caller.pos.history.getStages();
      expect(result).toHaveProperty("stages");
      expect(Array.isArray(result.stages)).toBe(true);
      expect(result.stages.length).toBe(13); // M0-M12
      expect(result.stages[0].code).toBe("M0");
      expect(result.stages[12].code).toBe("M12");
    });
  });

  describe("System", () => {
    it("should get system status", async () => {
      const result = await caller.pos.system.getStatus();
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("modules");
      expect(result).toHaveProperty("lastUpdated");
      expect(Array.isArray(result.modules)).toBe(true);
      expect(result.modules.length).toBeGreaterThan(0);
      expect(result.modules[0]).toHaveProperty("name");
      expect(result.modules[0]).toHaveProperty("status");
    });
  });

  describe("Review - M3/M4 Train Review", () => {
    it("should submit M3 project approval review", async () => {
      const result = await caller.pos.review.submitM3Review({
        projectId: 1,
        reviews: [
          { dimensionId: "business_value", conclusion: "PASS", owner: "PM", risks: "", notes: "" },
          { dimensionId: "scope", conclusion: "PASS", owner: "Tech Lead", risks: "", notes: "" },
          { dimensionId: "resources", conclusion: "CONDITIONAL", owner: "PM", risks: "人员紧张", notes: "" },
          { dimensionId: "raci", conclusion: "PASS", owner: "PM", risks: "", notes: "" },
          { dimensionId: "risks", conclusion: "PASS", owner: "PM", risks: "", notes: "" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.projectId).toBe(1);
      expect(result.reviewCount).toBe(5);
      expect(result.allPassed).toBe(true);
      expect(result.nextStage).toBe("M4");
    });

    it("should submit M4 design freeze review with train carriages", { timeout: 30000 }, async () => {
      const result = await caller.pos.review.submitM4Review({
        projectId: 1,
        carriages: [
          { carriageId: "mechanical", conclusion: "PASS", owner: "机械工程师", checkResults: { "结构设计": true, "材料选型": true } },
          { carriageId: "electrical", conclusion: "PASS", owner: "电气工程师", checkResults: { "电气设计": true, "控制系统": true } },
          { carriageId: "quality", conclusion: "CONDITIONAL", owner: "质量经理", risks: "需要增加检测点" },
          { carriageId: "service", conclusion: "PASS", owner: "服务经理" },
          { carriageId: "procurement", conclusion: "PASS", owner: "采购经理" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.projectId).toBe(1);
      expect(result.carriageCount).toBe(5);
      expect(result.allPassed).toBe(true);
      expect(result.nextStage).toBe("M5");
      expect(result.poSuggestion).not.toBeNull();
      expect(result.poSuggestion?.status).toBe("EngineerReview");
    });

    it("should get review status for a project", async () => {
      const result = await caller.pos.review.getReviewStatus({
        projectId: 1,
        stage: "M3",
      });
      expect(result.projectId).toBe(1);
      expect(result.stage).toBe("M3");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("completedCount");
      expect(result).toHaveProperty("totalCount");
    });

    it("should handle M3 review with failed items", async () => {
      const result = await caller.pos.review.submitM3Review({
        projectId: 2,
        reviews: [
          { dimensionId: "business_value", conclusion: "PASS", owner: "PM" },
          { dimensionId: "scope", conclusion: "FAIL", owner: "Tech Lead", risks: "范围不明确" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.allPassed).toBe(false);
      expect(result.nextStage).toBeNull();
    });
  });

  describe("MES Sync - Bidirectional", () => {
    it("should create work order from project", async () => {
      const result = await caller.pos.mes.createWorkOrderFromProject({
        projectId: 1,
        workOrderType: "Production",
        items: [
          { itemCode: "ITEM-001", itemName: "清洗槽", quantity: 2, unit: "套", plannedStartDate: "2024-01-15", plannedEndDate: "2024-02-15" },
          { itemCode: "ITEM-002", itemName: "传送系统", quantity: 1, unit: "套", plannedStartDate: "2024-01-20", plannedEndDate: "2024-02-20" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.workOrderCode).toMatch(/^WO-1-\d+$/);
      expect(result.projectId).toBe(1);
      expect(result.itemCount).toBe(2);
      expect(result.status).toBe("Created");
      expect(result.syncStatus).toBe("Pending");
    });

    it("should pull progress from MES", async () => {
      const result = await caller.pos.mes.pullProgressFromMES({
        workOrderCode: "WO-1-123456",
      });
      expect(result.workOrderCode).toBe("WO-1-123456");
      expect(result.mesStatus).toBe("InProgress");
      expect(result.completionRate).toBe(0.8);
      expect(Array.isArray(result.operations)).toBe(true);
      expect(result.operations.length).toBe(3);
    });

    it("should write back progress to project stage", async () => {
      const result = await caller.pos.mes.writeBackProgress({
        workOrderCode: "WO-1-123456",
        projectId: 1,
        stageId: "M7",
        progress: 80,
        status: "InProgress",
      });
      expect(result.success).toBe(true);
      expect(result.workOrderCode).toBe("WO-1-123456");
      expect(result.projectId).toBe(1);
      expect(result.stageId).toBe("M7");
      expect(result.progress).toBe(80);
      expect(result.status).toBe("InProgress");
    });
  });
});
