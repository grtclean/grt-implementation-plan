/**
 * 能力管理tRPC路由
 * 
 * 实现能力操作系统(Capability OS)的API接口
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../_core/trpc';
import {
  getCapabilityConfigs,
  getCapabilityConfig,
  createCapabilityConfig,
  updateCapabilityConfig,
  deleteCapabilityConfig,
  getPublicCapabilityShowcases,
  createPublicCapabilityShowcase,
  calculateCapabilityLevel,
  getCapabilityLevelDetails,
  getCapabilityDomainDetails,
  getAllCapabilityDomains,
  getAllCapabilityLevels,
  initializeDefaultCapabilities,
  CAPABILITY_LEVELS,
  CAPABILITY_DOMAINS,
} from './capability.service';

export const capabilityRouter = router({
  // 获取能力配置列表
  getCapabilities: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(20),
    }).optional())
    .query(async ({ input }) => {
      return getCapabilityConfigs(input);
    }),

  // 获取单个能力配置
  getCapability: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCapabilityConfig(input.id);
    }),

  // 创建能力配置（管理员）
  createCapability: adminProcedure
    .input(z.object({
      capabilityCode: z.string(),
      capabilityName: z.string(),
      capabilityCategory: z.enum([
        'technical_skill',
        'system_understanding',
        'delivery_capability',
        'customer_value',
        'knowledge_precipitation',
        'equipment_capability',
      ]),
      description: z.string().optional(),
      proofRequirements: z.string().optional(),
      validationRules: z.string().optional(),
      levelCriteria: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return createCapabilityConfig(input);
    }),

  // 更新能力配置（管理员）
  updateCapability: adminProcedure
    .input(z.object({
      id: z.number(),
      capabilityName: z.string().optional(),
      description: z.string().optional(),
      proofRequirements: z.string().optional(),
      validationRules: z.string().optional(),
      levelCriteria: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateCapabilityConfig(id, data);
    }),

  // 删除能力配置（管理员）
  deleteCapability: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteCapabilityConfig(input.id);
    }),

  // 获取公开能力展示
  getShowcases: publicProcedure
    .input(z.object({
      showcaseType: z.string().optional(),
      isPublic: z.boolean().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(20),
    }).optional())
    .query(async ({ input }) => {
      return getPublicCapabilityShowcases(input);
    }),

  // 创建公开能力展示（管理员）
  createShowcase: adminProcedure
    .input(z.object({
      showcaseType: z.enum(['project_case', 'capability_certificate', 'team_profile', 'technology_stack']),
      title: z.string(),
      summary: z.string().optional(),
      contentJson: z.string().optional(),
      mediaUrls: z.string().optional(),
      relatedCapabilityIds: z.string().optional(),
      isPublic: z.boolean().optional(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return createPublicCapabilityShowcase(input);
    }),

  // 计算能力等级
  calculateLevel: publicProcedure
    .input(z.object({ score: z.number() }))
    .query(async ({ input }) => {
      const level = calculateCapabilityLevel(input.score);
      const details = getCapabilityLevelDetails(level);
      return { level, details };
    }),

  // 获取能力等级详情
  getLevelDetails: publicProcedure
    .input(z.object({ level: z.string() }))
    .query(async ({ input }) => {
      return getCapabilityLevelDetails(input.level);
    }),

  // 获取能力域详情
  getDomainDetails: publicProcedure
    .input(z.object({ domainCode: z.string() }))
    .query(async ({ input }) => {
      return getCapabilityDomainDetails(input.domainCode);
    }),

  // 获取所有能力域
  getAllDomains: publicProcedure
    .query(async () => {
      return getAllCapabilityDomains();
    }),

  // 获取所有能力等级
  getAllLevels: publicProcedure
    .query(async () => {
      return getAllCapabilityLevels();
    }),

  // 初始化默认能力配置（管理员）
  initializeDefaults: adminProcedure
    .mutation(async () => {
      return initializeDefaultCapabilities();
    }),

  // 获取能力等级和域的元数据
  getMetadata: publicProcedure
    .query(async () => {
      return {
        levels: CAPABILITY_LEVELS,
        domains: CAPABILITY_DOMAINS,
      };
    }),

  // 记录能力证据（占位符）
  recordEvidence: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      capabilityDomain: z.string(),
      evidenceType: z.string(),
      description: z.string(),
      score: z.number(),
    }))
    .mutation(async ({ input }) => {
      // TODO: 实现完整的证据记录功能
      return { success: true, message: '证据记录功能开发中' };
    }),
});
