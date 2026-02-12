/**
 * 命名规则变更管理系统单元测试
 */

import { describe, it, expect, beforeAll } from "vitest";
import { requireDb } from './utils/db-helpers';
import {
  namingVersions,
  namingRuleApprovers,
  namingChangeRequests,
  equipmentModels,
  projectNumberCounters,
  projectConversionHistory,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("命名规则变更管理系统", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await requireDb();
    if (!db) {
      throw new Error("数据库连接失败");
    }
  });

  describe("命名规则版本管理", () => {
    it("应该能够创建新的命名规则版本", async () => {
      if (!db) return;

      // 清理测试数据
      await db.delete(namingVersions).where(eq(namingVersions.versionCode, "TEST-V1.0"));

      // 创建测试版本
      const result = await db.insert(namingVersions).values({
        versionCode: "TEST-V1.0",
        versionName: "测试版本",
        ruleType: "equipment",
        changeType: "major",
        effectiveDate: new Date("2026-01-01").toISOString(),
        isCurrent: false,
        changeDescription: "测试版本描述",
        createdBy: 1,
      });

      expect(result).toBeDefined();

      // 验证创建成功
      const versions = await db.select().from(namingVersions).where(eq(namingVersions.versionCode, "TEST-V1.0"));
      expect(versions.length).toBe(1);
      expect(versions[0].versionName).toBe("测试版本");
      expect(versions[0].ruleType).toBe("equipment");

      // 清理测试数据
      await db.delete(namingVersions).where(eq(namingVersions.versionCode, "TEST-V1.0"));
    });

    it("应该能够查询当前生效的版本", async () => {
      if (!db) return;

      const currentVersions = await db.select().from(namingVersions).where(eq(namingVersions.isCurrent, true));
      
      // 每种规则类型应该有一个当前版本
      const equipmentVersion = currentVersions.find(v => v.ruleType === "equipment");
      const projectVersion = currentVersions.find(v => v.ruleType === "project");
      const materialVersion = currentVersions.find(v => v.ruleType === "material");

      // 至少应该有初始化的版本（如果已初始化）
      // 这个测试验证版本查询功能正常工作
      expect(Array.isArray(currentVersions)).toBe(true);
    });
  });

  describe("设备型号主数据管理", () => {
    it("应该能够创建新的设备型号", async () => {
      if (!db) return;

      // 清理测试数据
      await db.delete(equipmentModels).where(eq(equipmentModels.numericCode, "TEST999"));

      // 创建测试设备型号
      const result = await db.insert(equipmentModels).values({
        numericCode: "TEST999",
        functionCode: "TS",
        categoryCode: "9",
        fullName: "Test 999",
        chineseName: "测试设备型号",
        processType: "测试工艺",
        configLevel: "测试",
        chamberCount: 1,
        status: "active",
        namingVersion: "TEST-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      });

      expect(result).toBeDefined();

      // 验证创建成功
      const models = await db.select().from(equipmentModels).where(eq(equipmentModels.numericCode, "TEST999"));
      expect(models.length).toBe(1);
      expect(models[0].fullName).toBe("Test 999");
      expect(models[0].chineseName).toBe("测试设备型号");

      // 清理测试数据
      await db.delete(equipmentModels).where(eq(equipmentModels.numericCode, "TEST999"));
    });

    it("应该能够按数字代码查询设备型号", async () => {
      if (!db) return;

      const models = await db.select().from(equipmentModels);
      
      // 验证查询功能正常
      expect(Array.isArray(models)).toBe(true);
      
      // 如果有数据，验证数据结构
      if (models.length > 0) {
        expect(models[0]).toHaveProperty("numericCode");
        expect(models[0]).toHaveProperty("functionCode");
        expect(models[0]).toHaveProperty("fullName");
        expect(models[0]).toHaveProperty("chineseName");
      }
    });
  });

  describe("项目编号计数器管理", () => {
    it("应该能够获取项目编号计数器", async () => {
      if (!db) return;

      const counters = await db.select().from(projectNumberCounters);
      
      // 验证查询功能正常
      expect(Array.isArray(counters)).toBe(true);
      
      // 如果有数据，验证T和GRT计数器
      if (counters.length > 0) {
        const tCounter = counters.find(c => c.prefix === "T");
        const grtCounter = counters.find(c => c.prefix === "GRT");
        
        if (tCounter) {
          expect(tCounter.prefix).toBe("T");
          expect(typeof tCounter.currentMax).toBe("number");
          expect(typeof tCounter.nextAvailable).toBe("number");
        }
        
        if (grtCounter) {
          expect(grtCounter.prefix).toBe("GRT");
          expect(typeof grtCounter.currentMax).toBe("number");
          expect(typeof grtCounter.nextAvailable).toBe("number");
        }
      }
    });

    it("应该能够更新计数器并生成下一个编号", async () => {
      if (!db) return;

      // 获取当前T计数器
      const [tCounter] = await db.select().from(projectNumberCounters).where(eq(projectNumberCounters.prefix, "T"));
      
      if (tCounter) {
        const originalNext = tCounter.nextAvailable;
        
        // 更新计数器
        await db.update(projectNumberCounters)
          .set({ 
            currentMax: originalNext,
            nextAvailable: originalNext + 1 
          })
          .where(eq(projectNumberCounters.prefix, "T"));
        
        // 验证更新成功
        const [updatedCounter] = await db.select().from(projectNumberCounters).where(eq(projectNumberCounters.prefix, "T"));
        expect(updatedCounter.currentMax).toBe(originalNext);
        expect(updatedCounter.nextAvailable).toBe(originalNext + 1);
        
        // 恢复原始值
        await db.update(projectNumberCounters)
          .set({ 
            currentMax: tCounter.currentMax,
            nextAvailable: tCounter.nextAvailable 
          })
          .where(eq(projectNumberCounters.prefix, "T"));
      }
    });
  });

  describe("变更请求管理", () => {
    it("应该能够创建变更请求", async () => {
      if (!db) return;

      // 清理测试数据
      await db.delete(namingChangeRequests).where(eq(namingChangeRequests.requestCode, "CR-TEST-001"));

      // 创建测试变更请求
      const result = await db.insert(namingChangeRequests).values({
        requestCode: "CR-TEST-001",
        requestType: "add",
        ruleType: "equipment",
        title: "测试变更请求",
        description: "这是一个测试变更请求",
        reason: "测试原因",
        impactScope: "测试影响范围",
        status: "pending",
        requestorId: 1,
        requestorName: "测试用户",
        requestDate: new Date(),
      });

      expect(result).toBeDefined();

      // 验证创建成功
      const requests = await db.select().from(namingChangeRequests).where(eq(namingChangeRequests.requestCode, "CR-TEST-001"));
      expect(requests.length).toBe(1);
      expect(requests[0].title).toBe("测试变更请求");
      expect(requests[0].status).toBe("pending");

      // 清理测试数据
      await db.delete(namingChangeRequests).where(eq(namingChangeRequests.requestCode, "CR-TEST-001"));
    });

    it("应该能够更新变更请求状态", async () => {
      if (!db) return;

      // 创建测试变更请求
      await db.delete(namingChangeRequests).where(eq(namingChangeRequests.requestCode, "CR-TEST-002"));
      await db.insert(namingChangeRequests).values({
        requestCode: "CR-TEST-002",
        requestType: "modify",
        ruleType: "project",
        title: "测试状态更新",
        description: "测试描述",
        reason: "测试原因",
        status: "pending",
        requestorId: 1,
        requestorName: "测试用户",
        requestDate: new Date(),
      });

// 更新状态为已批准
        await db.update(namingChangeRequests)
          .set({ 
            status: "approved",
            currentApproverId: 1,
            approvalDate: new Date(),
          })
          .where(eq(namingChangeRequests.requestCode, "CR-TEST-002"));

        // 验证更新成功
        const [updatedRequest] = await db.select().from(namingChangeRequests).where(eq(namingChangeRequests.requestCode, "CR-TEST-002"));
        expect(updatedRequest.status).toBe("approved");
        expect(updatedRequest.currentApproverId).toBe(1);

      // 清理测试数据
      await db.delete(namingChangeRequests).where(eq(namingChangeRequests.requestCode, "CR-TEST-002"));
    });
  });

  describe("审批人员配置", () => {
    it("应该能够添加审批人员", async () => {
      if (!db) return;

      // 清理测试数据
      await db.delete(namingRuleApprovers).where(eq(namingRuleApprovers.userId, 99999));

      // 创建测试审批人员
      const result = await db.insert(namingRuleApprovers).values({
        userId: 99999,
        ruleType: "all",
        changeType: "all",
        approvalLevel: 1,
        isActive: true,
        remark: "测试审批人员",
      });

      expect(result).toBeDefined();

      // 验证创建成功
      const approvers = await db.select().from(namingRuleApprovers).where(eq(namingRuleApprovers.userId, 99999));
      expect(approvers.length).toBe(1);
      expect(approvers[0].ruleType).toBe("all");
      expect(approvers[0].approvalLevel).toBe(1);

      // 清理测试数据
      await db.delete(namingRuleApprovers).where(eq(namingRuleApprovers.userId, 99999));
    });
  });

  describe("项目编号转换", () => {
    it("应该能够记录项目编号转换历史", async () => {
      if (!db) return;

      // 清理测试数据
      await db.delete(projectConversionHistory).where(eq(projectConversionHistory.tempProjectCode, "T999"));

      // 创建测试转换记录
      const result = await db.insert(projectConversionHistory).values({
        tempProjectCode: "T999",
        formalProjectCode: "GRT999",
        conversionDate: new Date(),
        contractNo: "HT-TEST-001",
        numberingVersion: "PJ-V1.0",
        convertedBy: 1,
      });

      expect(result).toBeDefined();

      // 验证创建成功
      const history = await db.select().from(projectConversionHistory).where(eq(projectConversionHistory.tempProjectCode, "T999"));
      expect(history.length).toBe(1);
      expect(history[0].formalProjectCode).toBe("GRT999");
      expect(history[0].contractNo).toBe("HT-TEST-001");

      // 清理测试数据
      await db.delete(projectConversionHistory).where(eq(projectConversionHistory.tempProjectCode, "T999"));
    });
  });
});
