import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  namingChangeRequests,
  namingChangeImplementations,
  namingChangeTests,
  namingRuleApprovers,
  namingVersions,
  equipmentModels,
  projectNumberCounters,
  projectConversionHistory,
} from "../../drizzle/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

export const namingRouter = router({
  // 命名规则列表 (returns naming versions as "rules")
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(namingVersions).orderBy(desc(namingVersions.createdAt));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取命名版本详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(namingVersions).where(eq(namingVersions.id, parseInt(input.id)));
    return item || null;
  }),

  // 创建命名版本
  create: protectedProcedure.input(z.object({
    versionCode: z.string(),
    versionName: z.string().optional(),
    ruleType: z.enum(["equipment", "project", "material"]),
    effectiveDate: z.string(),
    changeType: z.enum(["major", "minor", "patch"]),
    changeDescription: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [version] = await db.insert(namingVersions).values({
      versionCode: input.versionCode,
      versionName: input.versionName,
      ruleType: input.ruleType,
      effectiveDate: input.effectiveDate,
      changeType: input.changeType,
      changeDescription: input.changeDescription,
    }).returning();
    return { success: true, message: "创建成功", data: version };
  }),

  // 更新命名版本
  update: protectedProcedure.input(z.object({
    id: z.string(),
    versionName: z.string().optional(),
    changeDescription: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...updates } = input;
    const [version] = await db.update(namingVersions)
      .set(updates)
      .where(eq(namingVersions.id, parseInt(id)))
      .returning();
    return { success: true, message: "更新成功", data: version };
  }),

  // 删除命名版本
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(namingVersions).where(eq(namingVersions.id, parseInt(input.id)));
    return { success: true, message: "删除成功" };
  }),

  // 验证命名规则
  validate: protectedProcedure.input(z.object({
    name: z.string(),
    ruleType: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    // Check if name matches existing equipment models
    const models = await db.select().from(equipmentModels).limit(10);
    const suggestions = models
      .filter(m => m.fullName.includes(input.name) || m.chineseName.includes(input.name))
      .map(m => m.fullName);
    return { valid: suggestions.length === 0, suggestions };
  }),

  // 生成命名
  generate: protectedProcedure.input(z.object({
    ruleType: z.string().optional(),
    prefix: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    if (input.prefix) {
      const [counter] = await db.select().from(projectNumberCounters)
        .where(eq(projectNumberCounters.prefix, input.prefix));
      if (counter) {
        return { name: `${input.prefix}${counter.nextAvailable.toString().padStart(counter.formatDigits, "0")}` };
      }
    }
    return { name: "" };
  }),

  // ===== 项目编号子路由 =====
  projectNumbers: router({
    getCounter: protectedProcedure.input(z.object({ prefix: z.string() })).query(async ({ input }) => {
      const db = await requireDb();
      const [counter] = await db.select().from(projectNumberCounters)
        .where(eq(projectNumberCounters.prefix, input.prefix));
      if (counter) {
        return {
          prefix: counter.prefix,
          currentMax: counter.currentMax,
          nextAvailable: counter.nextAvailable,
          formatDigits: counter.formatDigits,
        };
      }
      // Default fallback
      return {
        prefix: input.prefix,
        currentMax: input.prefix === "T" ? 500 : 100,
        nextAvailable: input.prefix === "T" ? 501 : 101,
        formatDigits: 3,
      };
    }),

    getConversionHistory: protectedProcedure.query(async () => {
      const db = await requireDb();
      const history = await db.select().from(projectConversionHistory).orderBy(desc(projectConversionHistory.createdAt));
      return history.map(h => ({
        id: h.id.toString(),
        tempProjectCode: h.tempProjectCode,
        formalProjectCode: h.formalProjectCode,
        contractNo: h.contractNo,
        conversionDate: h.conversionDate,
        numberingVersion: h.numberingVersion,
      }));
    }),

    initCounters: protectedProcedure.mutation(async () => {
      const db = await requireDb();
      const existing = await db.select({ count: count() }).from(projectNumberCounters);
      if (existing[0].count > 0) return { success: true, message: "计数器已存在" };

      for (const prefix of ["T", "GRT", "P"]) {
        await db.insert(projectNumberCounters).values({
          prefix,
          currentMax: prefix === "T" ? 500 : 100,
          nextAvailable: prefix === "T" ? 501 : 101,
          formatDigits: 3,
        });
      }
      return { success: true, message: "计数器已初始化" };
    }),

    generateNext: protectedProcedure.input(z.object({ prefix: z.string() })).mutation(async ({ input }) => {
      const db = await requireDb();
      const [counter] = await db.select().from(projectNumberCounters)
        .where(eq(projectNumberCounters.prefix, input.prefix));

      if (counter) {
        const nextNum = counter.nextAvailable;
        await db.update(projectNumberCounters)
          .set({
            currentMax: nextNum,
            nextAvailable: nextNum + 1,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(projectNumberCounters.id, counter.id));
        return `${input.prefix}${nextNum.toString().padStart(counter.formatDigits, "0")}`;
      }
      return `${input.prefix}001`;
    }),

    convert: protectedProcedure.input(z.object({
      tempCode: z.string(),
      contractNo: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await requireDb();
      const formalCode = `GRT${input.tempCode.replace(/^T/, "")}`;

      // Get current version
      const [currentVersion] = await db.select().from(namingVersions)
        .where(eq(namingVersions.isCurrent, 1))
        .limit(1);

      await db.insert(projectConversionHistory).values({
        tempProjectCode: input.tempCode,
        formalProjectCode: formalCode,
        contractNo: input.contractNo,
        conversionDate: new Date().toISOString(),
        numberingVersion: currentVersion?.versionCode || "V1.0",
      });

      return { formalCode };
    }),
  }),

  // ===== 变更请求子路由 =====
  changeRequests: router({
    list: protectedProcedure.input(z.object({ status: z.string() }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      let query = db.select().from(namingChangeRequests).orderBy(desc(namingChangeRequests.requestDate));
      if (input?.status) {
        const rows = await db.select().from(namingChangeRequests)
          .where(eq(namingChangeRequests.status, input.status as "pending"))
          .orderBy(desc(namingChangeRequests.requestDate));
        return rows.map(r => ({
          id: r.id.toString(),
          requestCode: r.requestCode,
          ruleType: r.ruleType,
          requestType: r.requestType,
          title: r.title,
          status: r.status,
          requestorName: r.requestorName || "",
          requestDate: r.requestDate,
        }));
      }
      const rows = await query;
      return rows.map(r => ({
        id: r.id.toString(),
        requestCode: r.requestCode,
        ruleType: r.ruleType,
        requestType: r.requestType,
        title: r.title,
        status: r.status,
        requestorName: r.requestorName || "",
        requestDate: r.requestDate,
      }));
    }),

    create: protectedProcedure.input(z.object({
      requestType: z.string(),
      ruleType: z.string(),
      title: z.string(),
      description: z.string(),
      reason: z.string(),
      impactScope: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await requireDb();
      const code = `NCR-${Date.now().toString(36).toUpperCase()}`;
      const [request] = await db.insert(namingChangeRequests).values({
        requestCode: code,
        requestType: input.requestType as "add",
        ruleType: input.ruleType as "equipment",
        title: input.title,
        description: input.description,
        reason: input.reason,
        impactScope: input.impactScope,
        requestorId: 1,
      }).returning();
      return { success: true, message: "变更请求已创建", data: request };
    }),

    approve: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const db = await requireDb();
      const [request] = await db.update(namingChangeRequests)
        .set({
          status: "approved" as const,
          approvalDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(namingChangeRequests.id, parseInt(input.id)))
        .returning();
      return { success: true, message: "已批准", data: request };
    }),

    reject: protectedProcedure.input(z.object({ id: z.string(), notes: z.string().optional() })).mutation(async ({ input }) => {
      const db = await requireDb();
      const [request] = await db.update(namingChangeRequests)
        .set({
          status: "rejected" as const,
          approvalNotes: input.notes,
          approvalDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(namingChangeRequests.id, parseInt(input.id)))
        .returning();
      return { success: true, message: "已拒绝", data: request };
    }),
  }),

  // ===== 设备型号子路由 =====
  equipmentModels: router({
    list: protectedProcedure.input(z.object({ search: z.string() }).optional()).query(async ({ input }) => {
      const db = await requireDb();
      let rows;
      if (input?.search) {
        rows = await db.select().from(equipmentModels)
          .where(sql`${equipmentModels.fullName} ILIKE ${"%" + input.search + "%"} OR ${equipmentModels.chineseName} ILIKE ${"%" + input.search + "%"}`)
          .orderBy(desc(equipmentModels.createdAt));
      } else {
        rows = await db.select().from(equipmentModels).orderBy(desc(equipmentModels.createdAt));
      }
      return rows.map(r => ({
        id: r.id.toString(),
        numericCode: r.numericCode,
        functionCode: r.functionCode,
        fullName: r.fullName,
        chineseName: r.chineseName,
        processType: r.processType,
        configLevel: r.configLevel,
        chamberCount: r.chamberCount,
        status: r.status,
        namingVersion: r.namingVersion,
      }));
    }),

    create: protectedProcedure.input(z.object({
      numericCode: z.string(),
      functionCode: z.string(),
      categoryCode: z.string(),
      fullName: z.string(),
      chineseName: z.string(),
      processType: z.string().optional(),
      configLevel: z.string().optional(),
      chamberCount: z.number().optional(),
      effectiveDate: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await requireDb();
      const { effectiveDate, ...rest } = input;
      const [model] = await db.insert(equipmentModels).values({
        ...rest,
        effectiveDate: effectiveDate || new Date().toISOString(),
      }).returning();
      return { success: true, message: "设备型号已创建", data: model };
    }),

    initSample: protectedProcedure.mutation(async () => {
      const db = await requireDb();
      const existing = await db.select({ count: count() }).from(equipmentModels);
      if (existing[0].count > 0) return { created: 0 };

      const samples = [
        { numericCode: "001", functionCode: "CL", categoryCode: "SC", fullName: "GRT-CL-SC001", chineseName: "单槽式超声波清洗机", effectiveDate: new Date().toISOString() },
        { numericCode: "002", functionCode: "CL", categoryCode: "MC", fullName: "GRT-CL-MC002", chineseName: "多槽式超声波清洗机", chamberCount: 4, effectiveDate: new Date().toISOString() },
        { numericCode: "003", functionCode: "DR", categoryCode: "VD", fullName: "GRT-DR-VD003", chineseName: "真空干燥设备", effectiveDate: new Date().toISOString() },
      ];

      for (const s of samples) {
        await db.insert(equipmentModels).values(s);
      }
      return { created: samples.length };
    }),
  }),

  // ===== 审批人子路由 =====
  approvers: router({
    list: protectedProcedure.query(async () => {
      const db = await requireDb();
      const rows = await db.select().from(namingRuleApprovers).orderBy(desc(namingRuleApprovers.createdAt));
      return rows.map(r => ({
        id: r.id.toString(),
        userId: r.userId,
        ruleType: r.ruleType,
        changeType: r.changeType,
        approvalLevel: r.approvalLevel,
        isActive: r.isActive === 1,
        remark: r.remark,
      }));
    }),

    create: protectedProcedure.input(z.object({
      userId: z.number(),
      ruleType: z.string(),
      changeType: z.string(),
      approvalLevel: z.number().optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await requireDb();
      const [approver] = await db.insert(namingRuleApprovers).values({
        userId: input.userId,
        ruleType: input.ruleType as "equipment",
        changeType: input.changeType as "add",
        approvalLevel: input.approvalLevel || 1,
        remark: input.remark,
      }).returning();
      return { success: true, message: "审批人已添加", data: approver };
    }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(namingRuleApprovers).where(eq(namingRuleApprovers.id, parseInt(input.id)));
      return { success: true, message: "审批人已删除" };
    }),
  }),

  // ===== 版本子路由 =====
  versions: router({
    list: protectedProcedure.query(async () => {
      const db = await requireDb();
      const rows = await db.select().from(namingVersions).orderBy(desc(namingVersions.createdAt));
      return rows.map(r => ({
        id: r.id.toString(),
        versionCode: r.versionCode,
        versionName: r.versionName,
        ruleType: r.ruleType,
        changeType: r.changeType,
        effectiveDate: r.effectiveDate,
        isCurrent: r.isCurrent === 1,
        changeDescription: r.changeDescription,
      }));
    }),

    initDefault: protectedProcedure.mutation(async () => {
      const db = await requireDb();
      const existing = await db.select({ count: count() }).from(namingVersions);
      if (existing[0].count > 0) return { success: true, message: "版本已存在" };

      for (const ruleType of ["equipment", "project", "material"] as const) {
        await db.insert(namingVersions).values({
          versionCode: "V1.0",
          versionName: `${ruleType}命名规范 V1.0`,
          ruleType,
          effectiveDate: new Date().toISOString(),
          changeType: "major" as const,
          changeDescription: "初始版本",
          isCurrent: 1,
        });
      }
      return { success: true, message: "默认版本已初始化" };
    }),
  }),
});
