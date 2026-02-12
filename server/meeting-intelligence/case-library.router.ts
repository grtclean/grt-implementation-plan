/**
 * 案例库管理路由
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import {
  importCase,
  batchImportCases,
  getCases,
  deleteCase,
  updateCase,
  getCaseStatistics,
  initializeSampleCases,
  CaseData
} from './case-library.service';

// 案例数据Schema
const caseDataSchema = z.object({
  id: z.string().optional(),
  caseNumber: z.string().min(1, '请输入案例编号'),
  projectName: z.string().min(1, '请输入项目名称'),
  customerName: z.string().min(1, '请输入客户名称'),
  industry: z.string().min(1, '请选择行业'),
  productType: z.string().min(1, '请输入产品类型'),
  cleanlinessStandard: z.string().min(1, '请选择清洁度标准'),
  cleanlinessValue: z.string().optional(),
  partType: z.string().min(1, '请输入零件类型'),
  partMaterial: z.string().optional(),
  processFlow: z.string().min(1, '请输入工艺流程'),
  technicalSolution: z.string().min(1, '请输入技术方案'),
  equipmentUsed: z.string().optional(),
  deliveryResult: z.string().min(1, '请选择交付结果'),
  lessonsLearned: z.string().optional(),
  keySuccessFactors: z.string().optional(),
  projectPhase: z.string().min(1, '请选择项目阶段'),
  processStages: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  createdBy: z.string().default('user')
});

export const caseLibraryRouter = router({
  // 获取案例列表
  list: protectedProcedure
    .input(z.object({
      industry: z.string().optional(),
      productType: z.string().optional(),
      cleanlinessStandard: z.string().optional(),
      projectPhase: z.string().optional(),
      keyword: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0)
    }).optional())
    .query(async ({ input }) => {
      return await getCases(input || {});
    }),

  // 获取单个案例
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await getCases({ keyword: input.id, limit: 1 });
      return result.cases[0] || null;
    }),

  // 创建案例
  create: protectedProcedure
    .input(caseDataSchema)
    .mutation(async ({ input, ctx }) => {
      const caseData: CaseData = {
        ...input,
        createdBy: ctx.user?.name || 'user'
      };
      return await importCase(caseData);
    }),

  // 更新案例
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      updates: caseDataSchema.partial()
    }))
    .mutation(async ({ input }) => {
      return await updateCase(input.id, input.updates);
    }),

  // 删除案例
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteCase(input.id);
    }),

  // 批量导入案例
  batchImport: adminProcedure
    .input(z.object({
      cases: z.array(caseDataSchema)
    }))
    .mutation(async ({ input }) => {
      return await batchImportCases(input.cases as CaseData[]);
    }),

  // 获取统计信息
  statistics: protectedProcedure
    .query(async () => {
      return await getCaseStatistics();
    }),

  // 初始化示例数据
  initializeSamples: adminProcedure
    .mutation(async () => {
      return await initializeSampleCases();
    }),

  // 获取筛选选项
  filterOptions: protectedProcedure
    .query(async () => {
      // 返回预定义的筛选选项
      return {
        industries: [
          '汽车制造',
          '新能源汽车',
          '工程机械',
          '半导体',
          '航空航天',
          '医疗器械',
          '光学仪器',
          '电子制造',
          '轨道交通',
          '船舶制造',
          '军工',
          '其他'
        ],
        cleanlinessStandards: [
          'VDA 19.1',
          'VDA 19.2',
          'ISO 16232',
          'NAS 1638',
          'SAE AS4059',
          'SEMI F57',
          'AS9100D',
          'ISO 13485',
          'MIL-C-48497A',
          'IPC-A-610',
          '客户自定义标准'
        ],
        projectPhases: [
          'M0 - 项目启动',
          'M1 - 需求确认',
          'M2 - 概念设计',
          'M3 - 详细设计',
          'M4 - 设计评审',
          'M5 - 样机制作',
          'M6 - 样机测试',
          'M7 - 设计定型',
          'M8 - 试生产',
          'M9 - 生产验证',
          'M10 - 批量生产',
          'M11 - 客户验收',
          'M12 - 项目结项'
        ],
        deliveryResults: [
          '成功',
          '部分成功',
          '失败',
          '进行中'
        ]
      };
    })
});

export default caseLibraryRouter;
