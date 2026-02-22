/**
 * GRT智能系统 - 安全管理路由
 * 提供安全监控、审计和管理功能的API
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import { securityAuditLogs, ipBlacklist, userMfaConfigs, userSessions } from "../../drizzle/schema";
import { eq, ne, desc, and, gte, lte, sql, like } from "drizzle-orm";
import {
  checkRateLimit,
  blockIP,
  unblockIP,
  getBlockedIPs,
  RATE_LIMIT_PRESETS,
  validateLicense,
  generateHardwareFingerprint,
  getDeidentificationStats,
  validatePasswordStrength,
  detectSuspiciousRequest,
  generateSecureToken,
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  encrypt,
  decrypt,
  SECURITY_CONFIG,
  logSecurityEvent,
} from "./index";
import {
  getInstallationStatus,
  checkFeatureAccess,
  getActiveSecurityStatus,
  setSecurityLevel,
  setServerPassword,
  verifyServerPassword,
  isPasswordConfigured,
  getAdminNotes,
  dismissAdminNote,
  addAdminNote,
} from "./installation-guard";
import {
  MODE_CONFIGS,
  FEATURE_LABELS,
  type ActiveSecurityLevel,
} from "../../shared/installation-modes";
import {
  addAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  getAlertConfig,
  getAllAlertConfigs,
  toggleAlertConfig,
  getAlertHistory,
  getAlertStats,
  testAlertConfig,
  getAlertConfigTemplates,
  createAlertConfigFromTemplate,
  SecurityAlertType,
  AlertSeverity,
} from "./securityAlertWebhook";

// 管理员权限检查中间件
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '需要管理员权限',
    });
  }
  return next();
});

export const securityRouter = router({
  // ==================== 安全仪表盘 ====================
  
  /**
   * 获取安全概览数据
   */
  getDashboard: adminProcedure.query(async () => {
    const db = await requireDb();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 获取审计日志统计
    const [
      totalEvents24h,
      criticalEvents24h,
      failedLogins24h,
      blockedRequests24h,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(securityAuditLogs)
        .where(gte(securityAuditLogs.createdAt, last24h.toISOString())),
      db.select({ count: sql<number>`count(*)` })
        .from(securityAuditLogs)
        .where(and(
          gte(securityAuditLogs.createdAt, last24h.toISOString()),
          eq(securityAuditLogs.severity, 'critical')
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(securityAuditLogs)
        .where(and(
          gte(securityAuditLogs.createdAt, last24h.toISOString()),
          eq(securityAuditLogs.eventType, 'auth.failed')
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(securityAuditLogs)
        .where(and(
          gte(securityAuditLogs.createdAt, last24h.toISOString()),
          eq(securityAuditLogs.result, 'blocked')
        )),
    ]);
    
    // 获取活跃会话数
    const activeSessions = await db.select({ count: sql<number>`count(*)` })
      .from(userSessions)
      .where(eq(userSessions.isActive, true));
    
    // 获取黑名单IP数
    const blockedIPs = await db.select({ count: sql<number>`count(*)` })
      .from(ipBlacklist)
      .where(eq(ipBlacklist.isActive, true));
    
    // 获取许可证状态
    const licenseStatus = await validateLicense();
    
    // 获取脱敏代理统计
    const deidentStats = getDeidentificationStats();
    
    return {
      overview: {
        totalEvents24h: totalEvents24h[0]?.count || 0,
        criticalEvents24h: criticalEvents24h[0]?.count || 0,
        failedLogins24h: failedLogins24h[0]?.count || 0,
        blockedRequests24h: blockedRequests24h[0]?.count || 0,
        activeSessions: activeSessions[0]?.count || 0,
        blockedIPs: blockedIPs[0]?.count || 0,
      },
      license: {
        valid: licenseStatus.valid,
        type: licenseStatus.licenseType,
        expiresAt: licenseStatus.expiresAt,
        daysRemaining: licenseStatus.daysRemaining,
        warnings: licenseStatus.warnings,
      },
      aiProxy: deidentStats,
      systemHealth: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
      },
    };
  }),
  
  // ==================== 审计日志 ====================
  
  /**
   * 查询审计日志
   */
  getAuditLogs: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(10).max(100).default(20),
      eventType: z.string().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      userId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize, eventType, severity, userId, startDate, endDate, search } = input;
      
      // 构建查询条件
      const conditions = [];
      if (eventType) conditions.push(eq(securityAuditLogs.eventType, eventType));
      if (severity) conditions.push(eq(securityAuditLogs.severity, severity));
      if (userId) conditions.push(eq(securityAuditLogs.userId, userId));
      if (startDate) conditions.push(gte(securityAuditLogs.createdAt, startDate));
      if (endDate) conditions.push(lte(securityAuditLogs.createdAt, endDate));
      if (search) conditions.push(like(securityAuditLogs.action, `%${search}%`));
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // 查询数据
      const [logs, totalResult] = await Promise.all([
        db.select()
          .from(securityAuditLogs)
          .where(whereClause)
          .orderBy(desc(securityAuditLogs.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ count: sql<number>`count(*)` })
          .from(securityAuditLogs)
          .where(whereClause),
      ]);
      
      return {
        logs,
        pagination: {
          page,
          pageSize,
          total: totalResult[0]?.count || 0,
          totalPages: Math.ceil((totalResult[0]?.count || 0) / pageSize),
        },
      };
    }),
  
  /**
   * 获取事件类型统计
   */
  getEventTypeStats: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      
      const stats = await db.select({
        eventType: securityAuditLogs.eventType,
        count: sql<number>`count(*)`,
      })
        .from(securityAuditLogs)
        .where(gte(securityAuditLogs.createdAt, startDate.toISOString()))
        .groupBy(securityAuditLogs.eventType)
        .orderBy(desc(sql`count(*)`));
      
      return stats;
    }),

  /**
   * 获取威胁统计
   */
  getThreatStats: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      
      const stats = await db.select({
        severity: securityAuditLogs.severity,
        count: sql<number>`count(*)`,
      })
        .from(securityAuditLogs)
        .where(and(
          gte(securityAuditLogs.createdAt, startDate.toISOString()),
          sql`${securityAuditLogs.severity} IN ('high', 'critical')`
        ))
        .groupBy(securityAuditLogs.severity)
        .orderBy(desc(sql`count(*)`));
      
      return stats;
    }),

  /**
   * 获取封禁IP列表（分页）
   */
  getBlockedIPs: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(5).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize } = input;
      
      const [list, totalResult] = await Promise.all([
        db.select()
          .from(ipBlacklist)
          .where(eq(ipBlacklist.isActive, true))
          .orderBy(desc(ipBlacklist.blockedAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ count: sql<number>`count(*)` })
          .from(ipBlacklist)
          .where(eq(ipBlacklist.isActive, true)),
      ]);
      
      return {
        items: list,
        pagination: {
          page,
          pageSize,
          total: totalResult[0]?.count || 0,
          totalPages: Math.ceil((totalResult[0]?.count || 0) / pageSize),
        },
      };
    }),

  /**
   * 封禁IP
   */
  blockIP: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
      reason: z.string(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      await db.insert(ipBlacklist).values({
        ipAddress: input.ipAddress,
        reason: input.reason,
        blockedBy: ctx.user?.id,
        expiresAt: input.expiresAt,
        isActive: true,
      });
      
      const durationMs = input.expiresAt 
        ? new Date(input.expiresAt).getTime() - Date.now()
        : 24 * 60 * 60 * 1000;
      blockIP(input.ipAddress, durationMs);
      
      return { success: true };
    }),

  /**
   * 解封IP
   */
  unblockIP: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      await db.update(ipBlacklist)
        .set({ isActive: false })
        .where(eq(ipBlacklist.ipAddress, input.ipAddress));
      unblockIP(input.ipAddress);
      
      return { success: true };
    }),
  
  // ==================== IP黑名单管理 ====================
  
  /**
   * 获取IP黑名单
   */
  getIPBlacklist: adminProcedure
    .input(z.object({
      activeOnly: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      
      const conditions = input.activeOnly 
        ? eq(ipBlacklist.isActive, true) 
        : undefined;
      
      const list = await db.select()
        .from(ipBlacklist)
        .where(conditions)
        .orderBy(desc(ipBlacklist.blockedAt));
      
      // 合并内存中的黑名单
      const memoryBlocked = getBlockedIPs();
      
      return {
        database: list,
        memory: memoryBlocked,
      };
    }),
  
  /**
   * 添加IP到黑名单
   */
  addToBlacklist: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
      reason: z.string(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      // 添加到数据库
      await db.insert(ipBlacklist).values({
        ipAddress: input.ipAddress,
        reason: input.reason,
        blockedBy: ctx.user?.id,
        expiresAt: input.expiresAt,
        isActive: true,
      });
      
      // 添加到内存
      const durationMs = input.expiresAt 
        ? new Date(input.expiresAt).getTime() - Date.now()
        : 24 * 60 * 60 * 1000;
      blockIP(input.ipAddress, durationMs);
      
      return { success: true };
    }),
  
  /**
   * 从黑名单移除IP
   */
  removeFromBlacklist: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      
      if (input.id) {
        await db.update(ipBlacklist)
          .set({ isActive: false })
          .where(eq(ipBlacklist.id, input.id));
      }
      
      if (input.ipAddress) {
        await db.update(ipBlacklist)
          .set({ isActive: false })
          .where(eq(ipBlacklist.ipAddress, input.ipAddress));
        unblockIP(input.ipAddress);
      }
      
      return { success: true };
    }),
  
  // ==================== MFA管理 ====================
  
  /**
   * 获取当前用户的MFA状态
   */
  getMFAStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    
    const config = await db.select()
      .from(userMfaConfigs)
      .where(eq(userMfaConfigs.userId, ctx.user!.id))
      .limit(1);
    
    if (config.length === 0) {
      return {
        enabled: false,
        type: null,
        lastUsed: null,
      };
    }
    
    return {
      enabled: config[0].isEnabled,
      type: config[0].mfaType,
      lastUsed: config[0].lastUsedAt,
    };
  }),
  
  /**
   * 启用TOTP MFA
   */
  enableTOTP: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await requireDb();
    const userId = ctx.user!.id;
    
    // 生成密钥
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes();
    
    // 加密存储
    const encryptedSecret = encrypt(secret);
    const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));
    
    // 检查是否已有配置
    const existing = await db.select()
      .from(userMfaConfigs)
      .where(eq(userMfaConfigs.userId, userId))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(userMfaConfigs)
        .set({
          mfaType: 'totp',
          secret: encryptedSecret,
          backupCodes: encryptedBackupCodes,
          isEnabled: false, // 需要验证后才启用
        })
        .where(eq(userMfaConfigs.userId, userId));
    } else {
      await db.insert(userMfaConfigs).values({
        userId,
        mfaType: 'totp',
        secret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        isEnabled: false,
      });
    }
    
    // 返回密钥供用户扫描
    const otpAuthUrl = `otpauth://totp/GRT:${ctx.user!.name}?secret=${secret}&issuer=GRT`;
    
    return {
      secret,
      otpAuthUrl,
      backupCodes,
    };
  }),
  
  /**
   * 验证并激活TOTP
   */
  verifyAndActivateTOTP: protectedProcedure
    .input(z.object({
      token: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user!.id;
      
      // 获取配置
      const config = await db.select()
        .from(userMfaConfigs)
        .where(eq(userMfaConfigs.userId, userId))
        .limit(1);
      
      if (config.length === 0 || !config[0].secret) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MFA配置未找到',
        });
      }
      
      // 解密密钥
      const secret = decrypt(config[0].secret);
      
      // 验证令牌
      if (!verifyTOTP(secret, input.token)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '验证码无效',
        });
      }
      
      // 激活MFA
      await db.update(userMfaConfigs)
        .set({
          isEnabled: true,
          lastUsedAt: new Date().toISOString(),
        })
        .where(eq(userMfaConfigs.userId, userId));
      
      return { success: true };
    }),
  
  /**
   * 禁用MFA
   */
  disableMFA: protectedProcedure
    .input(z.object({
      token: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user!.id;
      
      // 获取配置
      const config = await db.select()
        .from(userMfaConfigs)
        .where(eq(userMfaConfigs.userId, userId))
        .limit(1);
      
      if (config.length === 0 || !config[0].secret) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'MFA配置未找到',
        });
      }
      
      // 解密密钥
      const secret = decrypt(config[0].secret);
      
      // 验证令牌
      if (!verifyTOTP(secret, input.token)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '验证码无效',
        });
      }
      
      // 禁用MFA
      await db.update(userMfaConfigs)
        .set({ isEnabled: false })
        .where(eq(userMfaConfigs.userId, userId));
      
      return { success: true };
    }),
  
  // ==================== 会话管理 ====================
  
  /**
   * 获取当前用户的活跃会话
   */
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    
    const sessions = await db.select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, ctx.user!.id),
        eq(userSessions.isActive, true)
      ))
      .orderBy(desc(userSessions.lastActivityAt));
    
    return sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      geoLocation: s.geoLocation,
      lastActivity: s.lastActivityAt,
      createdAt: s.createdAt,
    }));
  }),
  
  /**
   * 终止指定会话
   */
  terminateSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      
      await db.update(userSessions)
        .set({ isActive: false })
        .where(and(
          eq(userSessions.id, input.sessionId),
          eq(userSessions.userId, ctx.user!.id)
        ));
      
      return { success: true };
    }),
  
  /**
   * 终止所有其他会话
   */
  terminateOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await requireDb();

    // Exclude current session if available in context
    const currentSessionId = (ctx as any).sessionId as number | undefined;

    const conditions = [
      eq(userSessions.userId, ctx.user!.id),
      eq(userSessions.isActive, true),
    ];
    if (currentSessionId) {
      conditions.push(ne(userSessions.id, currentSessionId));
    }

    await db.update(userSessions)
      .set({ isActive: false })
      .where(and(...conditions));

    return { success: true };
  }),
  
  // ==================== 许可证管理 ====================
  
  /**
   * 获取许可证信息
   */
  getLicenseInfo: adminProcedure.query(async () => {
    const validation = await validateLicense();
    const fingerprint = generateHardwareFingerprint();
    
    return {
      ...validation,
      hardwareFingerprint: fingerprint.slice(0, 16) + '...',
    };
  }),
  
  // ==================== 安全工具 ====================
  
  /**
   * 验证密码强度
   */
  validatePassword: publicProcedure
    .input(z.object({
      password: z.string(),
    }))
    .query(({ input }) => {
      return validatePasswordStrength(input.password);
    }),
  
  /**
   * 获取安全配置
   */
  getSecurityConfig: adminProcedure.query(() => {
    return SECURITY_CONFIG;
  }),
  
  /**
   * 检测可疑请求（测试用）
   */
  testSuspiciousDetection: adminProcedure
    .input(z.object({
      path: z.string(),
      method: z.string(),
      body: z.string().optional(),
      query: z.string().optional(),
    }))
    .query(({ input }) => {
      return detectSuspiciousRequest(input);
    }),

  // ==================== 安全告警Webhook配置 ====================

  /**
   * 获取所有告警配置
   */
  getAlertConfigs: adminProcedure.query(() => {
    return getAllAlertConfigs();
  }),

  /**
   * 获取告警统计
   */
  getAlertStats: adminProcedure.query(() => {
    return getAlertStats();
  }),

  /**
   * 获取告警发送历史
   */
  getAlertHistory: adminProcedure
    .input(z.object({
      configId: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(({ input }) => {
      return getAlertHistory(input);
    }),

  /**
   * 添加告警配置
   */
  addAlertConfig: adminProcedure
    .input(z.object({
      name: z.string(),
      webhookType: z.enum(['wecom', 'dingtalk', 'feishu', 'custom']),
      webhookUrl: z.string().url(),
      secret: z.string().optional(),
      alertTypes: z.array(z.enum([
        'intrusion_attempt', 'rate_limit_exceeded', 'ip_blocked',
        'sql_injection', 'xss_attack', 'command_injection',
        'unauthorized_access', 'suspicious_activity', 'license_violation', 'data_exfiltration'
      ])),
      minSeverity: z.enum(['info', 'warning', 'critical', 'emergency']),
      mentionAll: z.boolean().default(false),
      mentionUsers: z.array(z.string()).default([]),
      cooldownMinutes: z.number().default(5),
      enabled: z.boolean().default(true),
    }))
    .mutation(({ input }) => {
      return addAlertConfig(input);
    }),

  /**
   * 更新告警配置
   */
  updateAlertConfig: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      webhookUrl: z.string().url().optional(),
      secret: z.string().optional(),
      alertTypes: z.array(z.enum([
        'intrusion_attempt', 'rate_limit_exceeded', 'ip_blocked',
        'sql_injection', 'xss_attack', 'command_injection',
        'unauthorized_access', 'suspicious_activity', 'license_violation', 'data_exfiltration'
      ])).optional(),
      minSeverity: z.enum(['info', 'warning', 'critical', 'emergency']).optional(),
      mentionAll: z.boolean().optional(),
      mentionUsers: z.array(z.string()).optional(),
      cooldownMinutes: z.number().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      const result = updateAlertConfig(id, updates);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '告警配置不存在' });
      }
      return result;
    }),

  /**
   * 删除告警配置
   */
  deleteAlertConfig: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const success = deleteAlertConfig(input.id);
      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '告警配置不存在' });
      }
      return { success: true };
    }),

  /**
   * 启用/禁用告警配置
   */
  toggleAlertConfig: adminProcedure
    .input(z.object({
      id: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(({ input }) => {
      const result = toggleAlertConfig(input.id, input.enabled);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '告警配置不存在' });
      }
      return result;
    }),

  /**
   * 测试告警配置
   */
  testAlertConfig: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await testAlertConfig(input.id);
    }),

  /**
   * 获取告警配置模板
   */
  getAlertConfigTemplates: adminProcedure.query(() => {
    return getAlertConfigTemplates();
  }),

  /**
   * 从模板创建告警配置
   */
  createAlertConfigFromTemplate: adminProcedure
    .input(z.object({
      templateIndex: z.number(),
      webhookUrl: z.string().url(),
      overrides: z.object({
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        mentionAll: z.boolean().optional(),
        mentionUsers: z.array(z.string()).optional(),
        cooldownMinutes: z.number().optional(),
      }).optional(),
    }))
    .mutation(({ input }) => {
      const result = createAlertConfigFromTemplate(
        input.templateIndex,
        input.webhookUrl,
        input.overrides
      );
      if (!result) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '无效的模板索引' });
      }
      return result;
    }),

  // ==================== 安装模式 & 密码保护 ====================

  /**
   * 获取安装模式和系统状态（公开 — 用于初始化页面）
   */
  getInstallationInfo: publicProcedure.query(async () => {
    return await getInstallationStatus();
  }),

  /**
   * 获取所有安装模式定义
   */
  getInstallationModes: publicProcedure.query(() => {
    return {
      modes: MODE_CONFIGS,
      featureLabels: FEATURE_LABELS,
    };
  }),

  /**
   * 检查功能是否可用
   */
  checkFeature: publicProcedure
    .input(z.object({ featureKey: z.string() }))
    .query(({ input }) => {
      return checkFeatureAccess(input.featureKey);
    }),

  /**
   * 验证服务器密码
   */
  verifyPassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      const valid = verifyServerPassword(input.password);
      if (!valid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '服务器密码错误',
        });
      }
      return { success: true };
    }),

  /**
   * 设置服务器访问密码（仅管理员）
   */
  setServerPassword: adminProcedure
    .input(z.object({ password: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      setServerPassword(input.password);

      await logSecurityEvent({
        eventType: 'system.config.change',
        severity: 'high',
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        ipAddress: (ctx as any).req?.ip || 'unknown',
        action: '设置/更新服务器访问密码',
        result: 'success',
        details: { passwordLength: input.password.length },
      });

      return { success: true };
    }),

  /**
   * 检查密码是否已设置
   */
  isPasswordSet: publicProcedure.query(() => {
    return { configured: isPasswordConfigured() };
  }),

  // ==================== 主动安全模式 ====================

  /**
   * 获取当前安全级别状态
   */
  getSecurityLevel: adminProcedure.query(() => {
    return getActiveSecurityStatus();
  }),

  /**
   * 设置安全级别（管理员手动控制）
   */
  setSecurityLevel: adminProcedure
    .input(z.object({
      level: z.enum(['standard', 'elevated', 'lockdown']),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await setSecurityLevel(
        input.level as ActiveSecurityLevel,
        ctx.user?.name || 'admin',
        input.reason,
      );
      return result;
    }),

  // ==================== 管理员重要事项 ====================

  /**
   * 获取管理员重要事项
   */
  getAdminNotes: adminProcedure
    .input(z.object({
      includeDismissed: z.boolean().default(false),
    }).optional())
    .query(({ input }) => {
      return getAdminNotes(input?.includeDismissed ?? false);
    }),

  /**
   * 关闭/忽略一条管理员事项
   */
  dismissNote: adminProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(({ input }) => {
      const success = dismissAdminNote(input.noteId);
      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '事项不存在' });
      }
      return { success: true };
    }),

  /**
   * 手动添加管理员事项
   */
  addNote: adminProcedure
    .input(z.object({
      category: z.enum(['security', 'license', 'system', 'update', 'action_required']),
      severity: z.enum(['info', 'warning', 'critical']),
      title: z.string().min(1),
      description: z.string(),
      actionUrl: z.string().optional(),
      actionLabel: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return addAdminNote(input);
    }),
});

export type SecurityRouter = typeof securityRouter;
