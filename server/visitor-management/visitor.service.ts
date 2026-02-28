/**
 * 客户来访申请服务
 * 处理来访申请、审批、来访证生成等业务逻辑
 */

import { TRPCError } from '@trpc/server';
import { requireDb } from '../utils/db-helpers';
import {
  visitorRequests,
  visitorDetails,
  approvalWorkflows,
  visitorPasses,
  countryRules,
  accessLogs,
} from '../../drizzle/schema';
import {
  VisitorRequest,
  CountryRule,
} from '../../drizzle/visitor-request-schema';
import { eq, and, or, gte, lte, isNull } from 'drizzle-orm';
import QRCode from 'qrcode';

/**
 * 来访申请服务类
 */
export class VisitorService {
  /**
   * 创建来访申请
   */
  async createVisitorRequest(data: {
    applicantName: string;
    applicantId: string;
    applicantEmail: string;
    applicantPhone: string;
    applicantCompany?: string;
    applicantPosition?: string;
    visitPurpose: string;
    visitDate: Date;
    visitEndDate?: Date;
    estimatedDuration?: number;
    numberOfVisitors: number;
    factoryId: number;
    factoryName: string;
    country: string;
    region?: string;
    department?: string;
    area?: string;
    needsFactoryAccess?: boolean;
    needsProductionFloor?: boolean;
    needsLabAccess?: boolean;
    contactPersonId: string;
    contactPersonName: string;
    contactPersonEmail: string;
    contactPersonPhone: string;
  }): Promise<number> {
    const db = await requireDb() as any;

    // 获取国家规则
    const rules = await this.getCountryRules(data.country);
    if (!rules) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No rules found for country: ${data.country}`,
      });
    }

    // 检查提前通知要求
    const advanceNotice = rules.advanceNoticeRequired || 3;
    const noticeDeadline = new Date();
    noticeDeadline.setDate(noticeDeadline.getDate() + advanceNotice);

    if (data.visitDate < noticeDeadline) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Visit must be requested at least ${advanceNotice} days in advance`,
      });
    }

    // 检查最大访问者数
    if (data.numberOfVisitors > (rules.maxVisitorsPerRequest || 10)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Maximum ${rules.maxVisitorsPerRequest} visitors allowed per request in ${data.country}`,
      });
    }

    // 创建申请
    const result = await db.insert(visitorRequests).values({
      applicantName: data.applicantName,
      applicantId: data.applicantId,
      applicantEmail: data.applicantEmail,
      applicantPhone: data.applicantPhone,
      applicantCompany: data.applicantCompany,
      applicantPosition: data.applicantPosition,
      visitPurpose: data.visitPurpose,
      visitDate: data.visitDate,
      visitEndDate: data.visitEndDate,
      estimatedDuration: data.estimatedDuration,
      numberOfVisitors: data.numberOfVisitors,
      factoryId: data.factoryId,
      factoryName: data.factoryName,
      country: data.country,
      region: data.region,
      department: data.department,
      area: data.area,
      needsFactoryAccess: data.needsFactoryAccess,
      needsProductionFloor: data.needsProductionFloor,
      needsLabAccess: data.needsLabAccess,
      contactPersonId: data.contactPersonId,
      contactPersonName: data.contactPersonName,
      contactPersonEmail: data.contactPersonEmail,
      contactPersonPhone: data.contactPersonPhone,
      approvalStatus: 'draft',
      countryRules: rules,
    });

    return (result as any).insertId;
  }

  /**
   * 提交来访申请
   */
  async submitVisitorRequest(requestId: number): Promise<void> {
    const db = await requireDb() as any;

    // 获取申请
    const request = await db
      .select()
      .from(visitorRequests)
      .where(eq(visitorRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Visitor request not found',
      });
    }

    const req = request[0];

    // 检查状态
    if (req.approvalStatus !== 'draft') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft requests can be submitted',
      });
    }

    // 更新状态
    await db
      .update(visitorRequests)
      .set({
        approvalStatus: 'submitted',
        submittedAt: new Date(),
      })
      .where(eq(visitorRequests.id, requestId));

    // 创建审批流程
    await this.createApprovalWorkflow(requestId, req.country);
  }

  /**
   * 创建审批流程
   */
  private async createApprovalWorkflow(
    requestId: number,
    country: string
  ): Promise<void> {
    const db = await requireDb() as any;

    // 获取国家规则
    const rules = await this.getCountryRules(country);
    if (!rules || !rules.approvalSteps) {
      return;
    }

    const approvalSteps = rules.approvalSteps as any[];

    for (let i = 0; i < approvalSteps.length; i++) {
      const step = approvalSteps[i];
      await db.insert(approvalWorkflows).values({
        requestId,
        stepNumber: i + 1,
        stepName: step.name,
        approverRole: step.role,
        status: 'pending',
      });
    }

    // 更新申请状态为等待审批
    await db
      .update(visitorRequests)
      .set({ approvalStatus: 'pending_supervisor' })
      .where(eq(visitorRequests.id, requestId));
  }

  /**
   * 审批来访申请
   */
  async approveVisitorRequest(
    requestId: number,
    approverId: string,
    approverName: string,
    approverEmail: string,
    comments?: string
  ): Promise<void> {
    const db = await requireDb() as any;

    // 获取当前待审批的步骤
    const pendingSteps = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.requestId, requestId),
          eq(approvalWorkflows.status, 'pending')
        )
      )
      .orderBy(approvalWorkflows.stepNumber);

    if (pendingSteps.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No pending approval steps',
      });
    }

    const currentStep = pendingSteps[0];

    // 更新当前步骤
    await db
      .update(approvalWorkflows)
      .set({
        status: 'approved',
        approverId,
        approverName,
        approverEmail,
        comments,
        completedAt: new Date(),
      })
      .where(eq(approvalWorkflows.id, currentStep.id));

    // 检查是否还有待审批的步骤
    const remainingSteps = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.requestId, requestId),
          eq(approvalWorkflows.status, 'pending')
        )
      );

    if (remainingSteps.length === 0) {
      // 所有步骤都已审批，更新申请状态为已批准
      await db
        .update(visitorRequests)
        .set({
          approvalStatus: 'approved',
          approvedAt: new Date(),
        })
        .where(eq(visitorRequests.id, requestId));

      // 生成来访证
      await this.generateVisitorPasses(requestId);
    } else {
      // 更新申请状态为等待下一步审批
      const nextStep = remainingSteps[0];
      const statusMap: Record<string, unknown> = {
        supervisor: 'pending_supervisor',
        security: 'pending_security',
        manager: 'pending_manager',
      };
      const newStatus = statusMap[nextStep.approverRole] || 'submitted';

      await db
        .update(visitorRequests)
        .set({ approvalStatus: newStatus })
        .where(eq(visitorRequests.id, requestId));
    }
  }

  /**
   * 拒绝来访申请
   */
  async rejectVisitorRequest(
    requestId: number,
    approverId: string,
    approverName: string,
    reason: string
  ): Promise<void> {
    const db = await requireDb() as any;

    // 更新当前待审批的步骤
    const pendingSteps = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.requestId, requestId),
          eq(approvalWorkflows.status, 'pending')
        )
      )
      .orderBy(approvalWorkflows.stepNumber);

    if (pendingSteps.length > 0) {
      await db
        .update(approvalWorkflows)
        .set({
          status: 'rejected',
          approverId,
          approverName,
          comments: reason,
          completedAt: new Date(),
        })
        .where(eq(approvalWorkflows.id, pendingSteps[0].id));
    }

    // 更新申请状态为已拒绝
    await db
      .update(visitorRequests)
      .set({
        approvalStatus: 'rejected',
        rejectionReason: reason,
      })
      .where(eq(visitorRequests.id, requestId));
  }

  /**
   * 生成来访证
   */
  private async generateVisitorPasses(requestId: number): Promise<void> {
    const db = await requireDb() as any;

    // 获取申请
    const request = await db
      .select()
      .from(visitorRequests)
      .where(eq(visitorRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      return;
    }

    const req = request[0];

    // 获取来访者详情
    const visitors = await db
      .select()
      .from(visitorDetails)
      .where(eq(visitorDetails.requestId, requestId));

    // 为每个来访者生成来访证
    for (const visitor of visitors) {
      const passCode = this.generatePassCode(req.factoryId, visitor.id);
      const qrCodeData = await QRCode.toDataURL(passCode);

      await db.insert(visitorPasses).values({
        requestId,
        visitorDetailId: visitor.id,
        passCode,
        qrCode: qrCodeData,
        accessLevel: (req.countryRules as any)?.defaultAccessLevel || 'public',
        allowedAreas: req.area ? [req.area] : [],
        expiresAt: req.visitEndDate || new Date(req.visitDate.getTime() + 24 * 60 * 60 * 1000),
      });
    }

    // 更新申请的来访证ID
    const firstPass = await db
      .select()
      .from(visitorPasses)
      .where(eq(visitorPasses.requestId, requestId))
      .limit(1);

    if (firstPass.length > 0) {
      await db
        .update(visitorRequests)
        .set({
          visitorPassId: firstPass[0].passCode,
          passGeneratedAt: new Date(),
          passExpiresAt: firstPass[0].expiresAt,
        })
        .where(eq(visitorRequests.id, requestId));
    }
  }

  /**
   * 生成来访证编码
   */
  private generatePassCode(factoryId: number, visitorDetailId: number): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PASS-${factoryId}-${visitorDetailId}-${timestamp}-${random}`;
  }

  /**
   * 获取国家规则
   */
  async getCountryRules(countryCode: string): Promise<CountryRule | null> {
    const db = await requireDb() as any;

    const rules = await db
      .select()
      .from(countryRules)
      .where(
        and(
          eq(countryRules.countryCode, countryCode),
          eq(countryRules.isActive, true),
          lte(countryRules.effectiveDate, new Date()),
          or(
            isNull(countryRules.expiryDate),
            gte(countryRules.expiryDate, new Date())
          )
        )
      )
      .orderBy(countryRules.effectiveDate)
      .limit(1);

    return rules.length > 0 ? rules[0] : null;
  }

  /**
   * 添加来访者详情
   */
  async addVisitorDetail(data: {
    requestId: number;
    visitorName: string;
    visitorId: string;
    visitorEmail?: string;
    visitorPhone?: string;
    visitorCompany?: string;
    visitorPosition?: string;
    idType?: string;
    idNumber?: string;
    nationality?: string;
  }): Promise<number> {
    const db = await requireDb() as any;

    const result = await db.insert(visitorDetails).values({
      requestId: data.requestId,
      visitorName: data.visitorName,
      visitorId: data.visitorId,
      visitorEmail: data.visitorEmail,
      visitorPhone: data.visitorPhone,
      visitorCompany: data.visitorCompany,
      visitorPosition: data.visitorPosition,
      idType: data.idType,
      idNumber: data.idNumber,
      nationality: data.nationality,
    });

    return (result as any).insertId;
  }

  /**
   * 获取来访申请详情
   */
  async getVisitorRequestDetails(requestId: number): Promise<any> {
    const db = await requireDb() as any;

    const request = await db
      .select()
      .from(visitorRequests)
      .where(eq(visitorRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      return null;
    }

    const visitors = await db
      .select()
      .from(visitorDetails)
      .where(eq(visitorDetails.requestId, requestId));

    const workflows = await db
      .select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.requestId, requestId));

    const passes = await db
      .select()
      .from(visitorPasses)
      .where(eq(visitorPasses.requestId, requestId));

    return {
      request: request[0],
      visitors,
      workflows,
      passes,
    };
  }

  /**
   * 签到来访者
   */
  async checkInVisitor(passCode: string, operatorId: string, operatorName: string): Promise<void> {
    const db = await requireDb() as any;

    const pass = await db
      .select()
      .from(visitorPasses)
      .where(eq(visitorPasses.passCode, passCode))
      .limit(1);

    if (pass.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Visitor pass not found',
      });
    }

    const p = pass[0];

    if (!p.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Visitor pass is not active',
      });
    }

    if (new Date() > p.expiresAt) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Visitor pass has expired',
      });
    }

    // 更新来访证
    await db
      .update(visitorPasses)
      .set({ checkedInAt: new Date(), checkedInBy: operatorId })
      .where(eq(visitorPasses.id, p.id));

    // 记录访问日志
    await db.insert(accessLogs).values({
      visitorPassId: p.id,
      requestId: p.requestId,
      accessType: 'check_in',
      operatorId,
      operatorName,
    });
  }

  /**
   * 签出来访者
   */
  async checkOutVisitor(passCode: string, operatorId: string, operatorName: string): Promise<void> {
    const db = await requireDb() as any;

    const pass = await db
      .select()
      .from(visitorPasses)
      .where(eq(visitorPasses.passCode, passCode))
      .limit(1);

    if (pass.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Visitor pass not found',
      });
    }

    const p = pass[0];

    // 更新来访证
    await db
      .update(visitorPasses)
      .set({ checkedOutAt: new Date(), checkedOutBy: operatorId, isActive: false })
      .where(eq(visitorPasses.id, p.id));

    // 记录访问日志
    await db.insert(accessLogs).values({
      visitorPassId: p.id,
      requestId: p.requestId,
      accessType: 'check_out',
      operatorId,
      operatorName,
    });
  }
}

/**
 * 导出单例
 */
export const visitorService = new VisitorService();
