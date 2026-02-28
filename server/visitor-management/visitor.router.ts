/**
 * 来访申请管理tRPC路由
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { visitorService } from './visitor.service';
import { createRoleMiddleware } from '../permission-management/permission.middleware';
import { TRPCError } from '@trpc/server';

/**
 * 来访申请路由
 */
export const visitorRouter = router({
  /**
   * 创建来访申请
   */
  createRequest: protectedProcedure
    .input(
      z.object({
        applicantName: z.string().min(1),
        applicantId: z.string().min(1),
        applicantEmail: z.string().email(),
        applicantPhone: z.string().min(1),
        applicantCompany: z.string().optional(),
        applicantPosition: z.string().optional(),
        visitPurpose: z.string().min(1),
        visitDate: z.date(),
        visitEndDate: z.date().optional(),
        estimatedDuration: z.number().optional(),
        numberOfVisitors: z.number().min(1),
        factoryId: z.number(),
        factoryName: z.string().min(1),
        country: z.string().min(1),
        region: z.string().optional(),
        department: z.string().optional(),
        area: z.string().optional(),
        needsFactoryAccess: z.boolean().optional(),
        needsProductionFloor: z.boolean().optional(),
        needsLabAccess: z.boolean().optional(),
        contactPersonId: z.string().min(1),
        contactPersonName: z.string().min(1),
        contactPersonEmail: z.string().email(),
        contactPersonPhone: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const requestId = await visitorService.createVisitorRequest(input);
        return { requestId };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * 提交来访申请
   */
  submitRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await visitorService.submitVisitorRequest(input.requestId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * 添加来访者详情
   */
  addVisitorDetail: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        visitorName: z.string().min(1),
        visitorId: z.string().min(1),
        visitorEmail: z.string().email().optional(),
        visitorPhone: z.string().optional(),
        visitorCompany: z.string().optional(),
        visitorPosition: z.string().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
        nationality: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const visitorDetailId = await visitorService.addVisitorDetail(input);
        return { visitorDetailId };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * 获取来访申请详情
   */
  getRequestDetails: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const details = await visitorService.getVisitorRequestDetails(input.requestId);
      if (!details) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Visitor request not found',
        });
      }
      return details;
    }),

  /**
   * 管理员：审批来访申请
   */
  approveRequest: protectedProcedure
    .use(createRoleMiddleware(['admin', 'supervisor']))
    .input(
      z.object({
        requestId: z.number(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await visitorService.approveVisitorRequest(
          input.requestId,
          String(ctx.user.id),
          ctx.user.name || 'Unknown',
          ctx.user.email || 'unknown@example.com',
          input.comments
        );
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * 管理员：拒绝来访申请
   */
  rejectRequest: protectedProcedure
    .use(createRoleMiddleware(['admin', 'supervisor']))
    .input(
      z.object({
        requestId: z.number(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await visitorService.rejectVisitorRequest(
          input.requestId,
          String(ctx.user.id),
          ctx.user.name || 'Unknown',
          input.reason
        );
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * 签到来访者
   */
  checkInVisitor: protectedProcedure
    .input(
      z.object({
        passCode: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await visitorService.checkInVisitor(
          input.passCode,
          String(ctx.user.id),
          ctx.user.name || 'Unknown'
        );
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * 签出来访者
   */
  checkOutVisitor: protectedProcedure
    .input(
      z.object({
        passCode: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await visitorService.checkOutVisitor(
          input.passCode,
          String(ctx.user.id),
          ctx.user.name || 'Unknown'
        );
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),
});
