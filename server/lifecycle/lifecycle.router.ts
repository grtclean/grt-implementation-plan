/**
 * GRT Intelligent System - Project Lifecycle tRPC Router
 * Version: 1.3.77
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import {
  ProjectLifecycleStateMachine,
  ProjectPhase,
  PhaseStatus,
  GateType,
  AIActionType,
  PHASE_CONFIGS,
  getPhaseDisplayName,
  getPhaseNumber,
  isGatePhase,
  getPhaseRequiredRoles,
} from './project-lifecycle';

// =============================================================================
// 输入验证Schema
// =============================================================================
const projectPhaseSchema = z.nativeEnum(ProjectPhase);
const gateTypeSchema = z.nativeEnum(GateType);
const aiActionTypeSchema = z.nativeEnum(AIActionType);

// =============================================================================
// 项目生命周期路由
// =============================================================================
export const lifecycleRouter = router({
  // ---------------------------------------------------------------------------
  // 获取所有阶段配置
  // ---------------------------------------------------------------------------
  getAllPhases: publicProcedure.query(() => {
    return Object.values(PHASE_CONFIGS).map(config => ({
      ...config,
      phaseNumber: getPhaseNumber(config.phase),
      isGate: isGatePhase(config.phase),
      displayNameEN: getPhaseDisplayName(config.phase, 'en'),
      displayNameCN: getPhaseDisplayName(config.phase, 'cn'),
    }));
  }),

  // ---------------------------------------------------------------------------
  // 获取单个阶段配置
  // ---------------------------------------------------------------------------
  getPhaseConfig: publicProcedure
    .input(z.object({ phase: projectPhaseSchema }))
    .query(({ input }) => {
      const config = PHASE_CONFIGS[input.phase];
      return {
        ...config,
        phaseNumber: getPhaseNumber(config.phase),
        isGate: isGatePhase(config.phase),
        displayNameEN: getPhaseDisplayName(config.phase, 'en'),
        displayNameCN: getPhaseDisplayName(config.phase, 'cn'),
      };
    }),

  // ---------------------------------------------------------------------------
  // 创建新项目生命周期
  // ---------------------------------------------------------------------------
  createProject: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      initialPhase: projectPhaseSchema.optional().default(ProjectPhase.M0_OPPORTUNITY),
    }))
    .mutation(({ input }) => {
      const machine = new ProjectLifecycleStateMachine(input.projectId, input.initialPhase);
      return {
        success: true,
        state: machine.getState(),
        serialized: machine.serialize(),
      };
    }),

  // ---------------------------------------------------------------------------
  // 开始阶段
  // ---------------------------------------------------------------------------
  startPhase: protectedProcedure
    .input(z.object({
      serializedState: z.string(),
    }))
    .mutation(({ input }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      const result = machine.startPhase();
      return {
        ...result,
        state: machine.getState(),
        serialized: machine.serialize(),
      };
    }),

  // ---------------------------------------------------------------------------
  // 转换到下一阶段
  // ---------------------------------------------------------------------------
  transitionPhase: protectedProcedure
    .input(z.object({
      serializedState: z.string(),
      targetPhase: projectPhaseSchema,
      approver: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      const result = machine.transition(
        input.targetPhase,
        input.approver || ctx.user?.name || 'System'
      );
      return {
        ...result,
        state: machine.getState(),
        serialized: machine.serialize(),
      };
    }),

  // ---------------------------------------------------------------------------
  // 提交Gate审批
  // ---------------------------------------------------------------------------
  submitGateApproval: protectedProcedure
    .input(z.object({
      serializedState: z.string(),
      gateType: gateTypeSchema,
      approved: z.boolean(),
      comments: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      machine.submitGateApproval(
        input.gateType,
        ctx.user?.name || 'System',
        input.approved,
        input.comments
      );
      return {
        success: true,
        state: machine.getState(),
        serialized: machine.serialize(),
      };
    }),

  // ---------------------------------------------------------------------------
  // 标记文档完成
  // ---------------------------------------------------------------------------
  markDocumentComplete: protectedProcedure
    .input(z.object({
      serializedState: z.string(),
      documentName: z.string(),
    }))
    .mutation(({ input }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      machine.markDocumentComplete(input.documentName);
      return {
        success: true,
        state: machine.getState(),
        serialized: machine.serialize(),
      };
    }),

  // ---------------------------------------------------------------------------
  // 添加AI洞察
  // ---------------------------------------------------------------------------
  addAIInsight: protectedProcedure
    .input(z.object({
      serializedState: z.string(),
      type: aiActionTypeSchema,
      phase: projectPhaseSchema,
      content: z.string(),
      confidence: z.number().min(0).max(1),
      recommendations: z.array(z.string()),
    }))
    .mutation(({ input }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      machine.addAIInsight({
        type: input.type,
        phase: input.phase,
        content: input.content,
        confidence: input.confidence,
        recommendations: input.recommendations,
      });
      return {
        success: true,
        state: machine.getState(),
        serialized: machine.serialize(),
      };
    }),

  // ---------------------------------------------------------------------------
  // 获取项目进度
  // ---------------------------------------------------------------------------
  getProgress: publicProcedure
    .input(z.object({
      serializedState: z.string(),
    }))
    .query(({ input }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      const state = machine.getState();
      return {
        projectId: state.projectId,
        currentPhase: state.currentPhase,
        phaseStatus: state.phaseStatus,
        progressPercentage: machine.getProgressPercentage(),
        estimatedEndDate: state.estimatedEndDate,
        phaseHistory: state.phaseHistory,
        blockers: state.blockers,
      };
    }),

  // ---------------------------------------------------------------------------
  // 获取阶段所需角色
  // ---------------------------------------------------------------------------
  getRequiredRoles: publicProcedure
    .input(z.object({ phase: projectPhaseSchema }))
    .query(({ input }) => {
      return {
        phase: input.phase,
        requiredRoles: getPhaseRequiredRoles(input.phase),
      };
    }),

  // ---------------------------------------------------------------------------
  // 验证用户是否有权限操作当前阶段
  // ---------------------------------------------------------------------------
  validateUserPermission: protectedProcedure
    .input(z.object({
      phase: projectPhaseSchema,
      userRole: z.string(),
    }))
    .query(({ input }) => {
      const requiredRoles = getPhaseRequiredRoles(input.phase);
      const hasPermission = requiredRoles.includes(input.userRole);
      return {
        phase: input.phase,
        userRole: input.userRole,
        hasPermission,
        requiredRoles,
      };
    }),

  // ---------------------------------------------------------------------------
  // 获取阶段转换建议
  // ---------------------------------------------------------------------------
  getTransitionSuggestions: publicProcedure
    .input(z.object({
      serializedState: z.string(),
    }))
    .query(({ input }) => {
      const machine = ProjectLifecycleStateMachine.deserialize(input.serializedState);
      const state = machine.getState();
      const config = PHASE_CONFIGS[state.currentPhase];
      
      return {
        currentPhase: state.currentPhase,
        allowedTransitions: config.allowedTransitions.map(phase => ({
          phase,
          displayName: getPhaseDisplayName(phase, 'en'),
          displayNameCN: getPhaseDisplayName(phase, 'cn'),
          isGate: isGatePhase(phase),
        })),
        gateRequired: config.gateType !== GateType.NONE,
        gateType: config.gateType,
        requiredDocuments: config.requiredDocuments,
        completedDocuments: state.completedDocuments,
        missingDocuments: config.requiredDocuments.filter(
          doc => !state.completedDocuments.includes(doc)
        ),
      };
    }),
});

export type LifecycleRouter = typeof lifecycleRouter;
