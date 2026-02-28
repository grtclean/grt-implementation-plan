import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendNotification, getEnabledChannels } from "../notification-service";

// 资质类型枚举
const certTypeEnum = z.enum(['quality', 'environment', 'safety', 'process', 'security', 'energy', 'other']);
const certStatusEnum = z.enum(['valid', 'expired', 'pending', 'planned', 'suspended']);
const priorityEnum = z.enum(['high', 'medium', 'low']);
const milestoneStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']);
const reminderTypeEnum = z.enum(['expiry', 'milestone', 'target_date', 'custom']);
const customerTypeEnum = z.enum(['OEM', 'Tier1', 'Tier2', 'Other']);

export const certificationRouter = router({
  // 获取资质列表
  list: protectedProcedure
    .input(z.object({
      status: certStatusEnum.optional(),
      certType: certTypeEnum.optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { status, certType, search, page = 1, pageSize = 20 } = input || {};
      
      let whereClause = "WHERE 1=1";
      if (status) whereClause += ` AND status = '${status}'`;
      if (certType) whereClause += ` AND cert_type = '${certType}'`;
      if (search) whereClause += ` AND (name LIKE '%${search}%' OR name_en LIKE '%${search}%')`;
      
      const offset = (page - 1) * pageSize;
      
      const [certifications, countResult] = await Promise.all([
        db.execute(sql.raw(`SELECT * FROM certifications ${whereClause} ORDER BY target_date ASC LIMIT ${pageSize} OFFSET ${offset}`)),
        db.execute(sql.raw(`SELECT COUNT(*) as total FROM certifications ${whereClause}`))
      ]);
      
      return {
        items: certifications[0] as any[],
        total: (countResult[0] as any[])[0]?.total || 0,
        page,
        pageSize,
      };
    }),

  // 获取单个资质详情
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM certifications WHERE id = ${input.id}`));
      return (result[0] as any[])[0] || null;
    }),

  // 创建资质
  create: protectedProcedure
    .input(z.object({
      certCode: z.string(),
      name: z.string(),
      nameEn: z.string().optional(),
      certType: certTypeEnum,
      status: certStatusEnum.default('planned'),
      issueDate: z.string().optional(),
      expiryDate: z.string().optional(),
      targetDate: z.string().optional(),
      certBody: z.string().optional(),
      certNumber: z.string().optional(),
      scope: z.string().optional(),
      priority: priorityEnum.default('medium'),
      budget: z.number().optional(),
      responsibleDept: z.string().optional(),
      responsiblePerson: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`
        INSERT INTO certifications (cert_code, name, name_en, cert_type, status, issue_date, expiry_date, target_date, cert_body, cert_number, scope, priority, budget, responsible_dept, responsible_person, notes, created_by)
        VALUES ('${input.certCode}', '${input.name}', ${input.nameEn ? `'${input.nameEn}'` : 'NULL'}, '${input.certType}', '${input.status}', ${input.issueDate ? `'${input.issueDate}'` : 'NULL'}, ${input.expiryDate ? `'${input.expiryDate}'` : 'NULL'}, ${input.targetDate ? `'${input.targetDate}'` : 'NULL'}, ${input.certBody ? `'${input.certBody}'` : 'NULL'}, ${input.certNumber ? `'${input.certNumber}'` : 'NULL'}, ${input.scope ? `'${input.scope}'` : 'NULL'}, '${input.priority}', ${input.budget || 'NULL'}, ${input.responsibleDept ? `'${input.responsibleDept}'` : 'NULL'}, ${input.responsiblePerson ? `'${input.responsiblePerson}'` : 'NULL'}, ${input.notes ? `'${input.notes}'` : 'NULL'}, ${ctx.user?.id || 'NULL'})
      `));
      return { success: true, id: (result[0] as any).insertId };
    }),

  // 更新资质
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: certStatusEnum.optional(),
      progress: z.number().optional(),
      actualCost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: string[] = [];
      if (input.status) updates.push(`status = '${input.status}'`);
      if (input.progress !== undefined) updates.push(`progress = ${input.progress}`);
      if (input.actualCost !== undefined) updates.push(`actual_cost = ${input.actualCost}`);
      if (input.notes !== undefined) updates.push(`notes = ${input.notes ? `'${input.notes}'` : 'NULL'}`);
      
      if (updates.length === 0) return { success: false, message: "No fields to update" };
      
      await db.execute(sql.raw(`UPDATE certifications SET ${updates.join(', ')} WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 删除资质
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM certifications WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 获取里程碑列表
  getMilestones: protectedProcedure
    .input(z.object({ certificationId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM certification_milestones WHERE certification_id = ${input.certificationId} ORDER BY sort_order ASC`));
      return result[0] as any[];
    }),

  // 创建里程碑
  createMilestone: protectedProcedure
    .input(z.object({
      certificationId: z.number(),
      milestoneCode: z.string(),
      name: z.string(),
      targetDate: z.string(),
      sortOrder: z.number().default(0),
      responsiblePerson: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`
        INSERT INTO certification_milestones (certification_id, milestone_code, name, target_date, sort_order, responsible_person)
        VALUES (${input.certificationId}, '${input.milestoneCode}', '${input.name}', '${input.targetDate}', ${input.sortOrder}, ${input.responsiblePerson ? `'${input.responsiblePerson}'` : 'NULL'})
      `));
      return { success: true, id: (result[0] as any).insertId };
    }),

  // 更新里程碑状态
  updateMilestone: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: milestoneStatusEnum.optional(),
      completedDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: string[] = [];
      if (input.status) updates.push(`status = '${input.status}'`);
      if (input.completedDate) updates.push(`completed_date = '${input.completedDate}'`);
      
      if (updates.length === 0) return { success: false };
      
      await db.execute(sql.raw(`UPDATE certification_milestones SET ${updates.join(', ')} WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 获取提醒配置
  getReminders: protectedProcedure
    .input(z.object({ certificationId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM certification_reminders WHERE certification_id = ${input.certificationId}`));
      return result[0] as any[];
    }),

  // 创建提醒配置
  createReminder: protectedProcedure
    .input(z.object({
      certificationId: z.number(),
      reminderType: reminderTypeEnum,
      daysBefore: z.number(),
      isEnabled: z.boolean().default(true),
      notifyChannels: z.array(z.string()).default(['system']),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`
        INSERT INTO certification_reminders (certification_id, reminder_type, days_before, is_enabled, notify_channels, created_by)
        VALUES (${input.certificationId}, '${input.reminderType}', ${input.daysBefore}, ${input.isEnabled ? 1 : 0}, '${JSON.stringify(input.notifyChannels)}', ${ctx.user?.id || 'NULL'})
      `));
      return { success: true, id: (result[0] as any).insertId };
    }),

  // 更新提醒配置
  updateReminder: protectedProcedure
    .input(z.object({
      id: z.number(),
      isEnabled: z.boolean().optional(),
      daysBefore: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: string[] = [];
      if (input.isEnabled !== undefined) updates.push(`is_enabled = ${input.isEnabled ? 1 : 0}`);
      if (input.daysBefore !== undefined) updates.push(`days_before = ${input.daysBefore}`);
      
      if (updates.length === 0) return { success: false };
      
      await db.execute(sql.raw(`UPDATE certification_reminders SET ${updates.join(', ')} WHERE id = ${input.id}`));
      return { success: true };
    }),

  // 获取客户资质要求
  getCustomerRequirements: protectedProcedure
    .input(z.object({
      customerType: customerTypeEnum.optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let whereClause = "WHERE 1=1";
      if (input?.customerType) whereClause += ` AND customer_type = '${input.customerType}'`;
      
      const result = await db.execute(sql.raw(`SELECT * FROM customer_cert_requirements ${whereClause} ORDER BY customer_type, customer_name`));
      return result[0] as any[];
    }),

  // 创建客户资质要求
  createCustomerRequirement: protectedProcedure
    .input(z.object({
      customerCode: z.string(),
      customerName: z.string(),
      customerType: customerTypeEnum,
      country: z.string().optional(),
      region: z.string().optional(),
      requiredCerts: z.array(z.string()),
      portalUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`
        INSERT INTO customer_cert_requirements (customer_code, customer_name, customer_type, country, region, required_certs, portal_url)
        VALUES ('${input.customerCode}', '${input.customerName}', '${input.customerType}', ${input.country ? `'${input.country}'` : 'NULL'}, ${input.region ? `'${input.region}'` : 'NULL'}, '${JSON.stringify(input.requiredCerts)}', ${input.portalUrl ? `'${input.portalUrl}'` : 'NULL'})
      `));
      return { success: true, id: (result[0] as any).insertId };
    }),

  // 生成差距分析
  generateGapAnalysis: protectedProcedure
    .input(z.object({ customerId: z.number().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const certifications = await db.execute(sql.raw(`SELECT cert_code, name, status FROM certifications`));
      const certMap = new Map((certifications[0] as any[]).map(c => [c.cert_code, c]));
      
      let customerQuery = "SELECT * FROM customer_cert_requirements";
      if (input?.customerId) customerQuery += ` WHERE id = ${input.customerId}`;
      
      const customers = await db.execute(sql.raw(customerQuery));
      
      let totalRequired = 0, totalMet = 0, totalPlanned = 0, totalGap = 0;
      const gapDetails: any[] = [];
      
      for (const customer of (customers[0] as any[])) {
        const requiredCerts = JSON.parse(customer.required_certs || '[]');
        const customerGaps: any[] = [];
        
        for (const certCode of requiredCerts) {
          totalRequired++;
          const cert = certMap.get(certCode);
          
          if (cert?.status === 'valid') {
            totalMet++;
            customerGaps.push({ certCode, status: 'met', certName: cert.name });
          } else if (cert?.status === 'planned' || cert?.status === 'pending') {
            totalPlanned++;
            customerGaps.push({ certCode, status: 'planned', certName: cert?.name || certCode });
          } else {
            totalGap++;
            customerGaps.push({ certCode, status: 'gap', certName: cert?.name || certCode });
          }
        }
        
        gapDetails.push({
          customerId: customer.id,
          customerName: customer.customer_name,
          customerType: customer.customer_type,
          gaps: customerGaps,
        });
      }
      
      const coverageRate = totalRequired > 0 ? ((totalMet / totalRequired) * 100).toFixed(2) : 0;
      const analysisCode = `GAP-${Date.now()}`;
      
      await db.execute(sql.raw(`
        INSERT INTO certification_gap_analysis (analysis_code, analysis_date, customer_id, total_required, total_met, total_planned, total_gap, coverage_rate, gap_details, created_by)
        VALUES ('${analysisCode}', CURDATE(), ${input?.customerId || 'NULL'}, ${totalRequired}, ${totalMet}, ${totalPlanned}, ${totalGap}, ${coverageRate}, '${JSON.stringify(gapDetails)}', ${ctx.user?.id || 'NULL'})
      `));
      
      return {
        success: true,
        analysisCode,
        summary: { totalRequired, totalMet, totalPlanned, totalGap, coverageRate: Number(coverageRate) },
        gapDetails,
      };
    }),

  // 获取差距分析历史
  getGapAnalysisHistory: protectedProcedure
    .input(z.object({ page: z.number().default(1), pageSize: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page = 1, pageSize = 10 } = input || {};
      const offset = (page - 1) * pageSize;
      
      const [records, countResult] = await Promise.all([
        db.execute(sql.raw(`SELECT * FROM certification_gap_analysis ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`)),
        db.execute(sql.raw(`SELECT COUNT(*) as total FROM certification_gap_analysis`))
      ]);
      
      return {
        items: records[0] as any[],
        total: (countResult[0] as any[])[0]?.total || 0,
        page,
        pageSize,
      };
    }),

  // 发送提醒通知（支持多渠道）
  sendReminder: protectedProcedure
    .input(z.object({
      certificationId: z.number(),
      message: z.string(),
      channels: z.array(z.enum(['system', 'dingtalk', 'email', 'wechat'])).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const certResult = await db.execute(sql.raw(`SELECT name, target_date, expiry_date FROM certifications WHERE id = ${input.certificationId}`));
      const cert = (certResult[0] as any[])[0];
      if (!cert) return { success: false, message: "Certification not found", results: [] };
      
      const title = `资质提醒: ${cert.name}`;
      const content = input.message;
      
      // 确定要发送的渠道
      const channels = input.channels || getEnabledChannels();
      
      // 发送多渠道通知
      const results = await sendNotification(
        { title, content, severity: 'warning' },
        channels as any[]
      );
      
      // 更新提醒发送时间
      await db.execute(sql.raw(`
        UPDATE certification_reminders 
        SET last_sent_at = NOW() 
        WHERE certification_id = ${input.certificationId}
      `));
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: successCount > 0, 
        message: `成功发送到 ${successCount}/${results.length} 个渠道`,
        results 
      };
    }),

  // 检查并发送即将到期的资质提醒
  checkAndSendExpiryReminders: protectedProcedure
    .mutation(async () => {
      const db = await requireDb();
      
      // 获取所有启用的提醒配置
      const reminders = await db.execute(sql.raw(`
        SELECT cr.*, c.name as cert_name, c.expiry_date, c.target_date
        FROM certification_reminders cr
        JOIN certifications c ON cr.certification_id = c.id
        WHERE cr.is_enabled = 1
          AND (
            (cr.reminder_type = 'expiry' AND c.expiry_date IS NOT NULL 
             AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL cr.days_before DAY)
             AND (cr.last_sent_at IS NULL OR cr.last_sent_at < DATE_SUB(NOW(), INTERVAL 1 DAY)))
            OR
            (cr.reminder_type = 'target_date' AND c.target_date IS NOT NULL 
             AND c.target_date <= DATE_ADD(CURDATE(), INTERVAL cr.days_before DAY)
             AND (cr.last_sent_at IS NULL OR cr.last_sent_at < DATE_SUB(NOW(), INTERVAL 1 DAY)))
          )
      `));
      
      const sentReminders: any[] = [];
      
      for (const reminder of (reminders[0] as any[])) {
        const channels = JSON.parse(reminder.notify_channels || '["system"]');
        const dateField = reminder.reminder_type === 'expiry' ? reminder.expiry_date : reminder.target_date;
        const dateLabel = reminder.reminder_type === 'expiry' ? '到期日期' : '目标日期';
        
        const message = `资质「${reminder.cert_name}」${dateLabel}为 ${dateField}，距今仅剩 ${reminder.days_before} 天，请及时处理。`;
        
        const results = await sendNotification(
          { title: `资质提醒: ${reminder.cert_name}`, content: message, severity: 'warning' },
          channels
        );
        
        // 更新发送时间
        await db.execute(sql.raw(`UPDATE certification_reminders SET last_sent_at = NOW() WHERE id = ${reminder.id}`));
        
        sentReminders.push({
          certificationId: reminder.certification_id,
          certName: reminder.cert_name,
          reminderType: reminder.reminder_type,
          results,
        });
      }
      
      return { success: true, sentCount: sentReminders.length, reminders: sentReminders };
    }),

  // 获取统计数据
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned
      FROM certifications
    `));
    
    const expiringResult = await db.execute(sql.raw(`
      SELECT id, cert_code, name, expiry_date FROM certifications 
      WHERE status = 'valid' AND expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY expiry_date ASC LIMIT 5
    `));
    
    return {
      ...(result[0] as any[])[0],
      expiringSoon: expiringResult[0] as any[],
    };
  }),
});
