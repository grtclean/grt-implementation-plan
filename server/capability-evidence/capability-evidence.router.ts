/**
 * Capability Evidence Router - 能力证据tRPC路由
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import {
  generateEvidenceId,
  uploadEvidenceFile,
  validateEvidenceForUpgrade,
  calculateRequiredEvidences,
  checkAutoUpgradeEligibility,
  CAPABILITY_LEVELS,
  CAPABILITY_DOMAINS,
  EVIDENCE_TYPES,
} from "./capability-evidence.service";

// 证据类型枚举
const evidenceTypeEnum = z.enum([
  'project_delivery',
  'training_cert',
  'skill_cert',
  'customer_feedback',
  'peer_review',
  'self_assessment',
  'supervisor_eval',
  'other'
]);

// 能力域枚举
const capabilityDomainEnum = z.enum(['T', 'S', 'D', 'C', 'K', 'L']);

// 证据状态枚举
const evidenceStatusEnum = z.enum(['pending', 'approved', 'rejected', 'archived']);

export const capabilityEvidenceRouter = router({
  // 获取配置信息
  getConfig: protectedProcedure.query(async () => {
    return {
      levels: CAPABILITY_LEVELS,
      domains: CAPABILITY_DOMAINS,
      evidenceTypes: EVIDENCE_TYPES,
    };
  }),

  // 上传证据
  upload: protectedProcedure
    .input(z.object({
      evidenceType: evidenceTypeEnum,
      capabilityDomain: capabilityDomainEnum,
      title: z.string().min(1, "标题不能为空").max(200),
      description: z.string().optional(),
      projectId: z.string().optional(),
      projectName: z.string().optional(),
      equipmentModel: z.string().optional(),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
      tags: z.array(z.string()).optional(),
      // 文件信息（Base64编码）
      file: z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        data: z.string(), // Base64编码的文件内容
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const evidenceId = generateEvidenceId();
      
      let fileInfo = null;
      if (input.file) {
        // 解码Base64文件
        const fileBuffer = Buffer.from(input.file.data, 'base64');
        
        // 上传文件
        const { url, key } = await uploadEvidenceFile(evidenceId, {
          fileName: input.file.name,
          fileType: input.file.type,
          fileSize: input.file.size,
          fileBuffer,
        });
        
        fileInfo = {
          url,
          key,
          name: input.file.name,
          type: input.file.type,
          size: input.file.size,
        };
      }

      // TODO: 保存到数据库
      const evidence = {
        evidenceId,
        userId: ctx.user!.id,
        userName: ctx.user!.name,
        evidenceType: input.evidenceType,
        capabilityDomain: input.capabilityDomain,
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        projectName: input.projectName,
        equipmentModel: input.equipmentModel,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        tags: input.tags,
        file: fileInfo,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      return {
        success: true,
        evidence,
        message: '证据上传成功，等待审核',
      };
    }),

  // 获取我的证据列表
  getMyEvidences: protectedProcedure
    .input(z.object({
      status: evidenceStatusEnum.optional(),
      capabilityDomain: capabilityDomainEnum.optional(),
      evidenceType: evidenceTypeEnum.optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      // TODO: 从数据库查询
      return {
        evidences: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // 获取证据详情
  getEvidence: protectedProcedure
    .input(z.object({
      evidenceId: z.string(),
    }))
    .query(async ({ input }) => {
      // TODO: 从数据库查询
      return {
        evidence: null,
      };
    }),

  // 删除证据（仅限pending状态）
  deleteEvidence: requirePermission('capability:evidence:submit')
    .input(z.object({
      evidenceId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: 从数据库删除
      return {
        success: true,
        message: '证据已删除',
      };
    }),

  // 审核证据（管理员）
  review: adminProcedure
    .input(z.object({
      evidenceId: z.string(),
      action: z.enum(['approve', 'reject']),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: 更新数据库状态
      const status = input.action === 'approve' ? 'approved' : 'rejected';
      
      // 如果批准，检查是否触发自动升级
      let upgradeInfo = null;
      if (input.action === 'approve') {
        // TODO: 获取用户当前能力等级和已批准证据数量
        const currentLevel = 2; // 示例
        const approvedCount = 3; // 示例
        const domain = 'T' as const; // 示例
        
        upgradeInfo = checkAutoUpgradeEligibility(approvedCount, currentLevel, domain);
      }

      return {
        success: true,
        status,
        upgradeInfo,
        message: input.action === 'approve' ? '证据已批准' : '证据已拒绝',
      };
    }),

  // 获取待审核证据列表（管理员）
  getPendingEvidences: adminProcedure
    .input(z.object({
      capabilityDomain: capabilityDomainEnum.optional(),
      evidenceType: evidenceTypeEnum.optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      // TODO: 从数据库查询
      return {
        evidences: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // 验证升级资格
  validateUpgrade: protectedProcedure
    .input(z.object({
      evidenceType: evidenceTypeEnum,
      capabilityDomain: capabilityDomainEnum,
      currentLevel: z.number().min(1).max(5),
    }))
    .query(async ({ input }) => {
      return validateEvidenceForUpgrade(
        input.evidenceType,
        input.capabilityDomain,
        input.currentLevel
      );
    }),

  // 获取升级要求
  getUpgradeRequirements: protectedProcedure
    .input(z.object({
      currentLevel: z.number().min(1).max(4),
      targetLevel: z.number().min(2).max(5),
      capabilityDomain: capabilityDomainEnum,
    }))
    .query(async ({ input }) => {
      return calculateRequiredEvidences(
        input.currentLevel,
        input.targetLevel,
        input.capabilityDomain
      );
    }),

  // 获取能力统计
  getCapabilityStats: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const targetUserId = input.userId || ctx.user!.id;
      
      // TODO: 从数据库统计
      return {
        userId: targetUserId,
        domains: {
          T: { level: 2, evidenceCount: 3, pendingCount: 1 },
          S: { level: 1, evidenceCount: 1, pendingCount: 0 },
          D: { level: 2, evidenceCount: 2, pendingCount: 1 },
          C: { level: 1, evidenceCount: 0, pendingCount: 0 },
          K: { level: 1, evidenceCount: 1, pendingCount: 0 },
          L: { level: 1, evidenceCount: 0, pendingCount: 0 },
        },
        totalEvidences: 7,
        approvedEvidences: 5,
        pendingEvidences: 2,
      };
    }),
});
