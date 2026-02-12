/**
 * v1.7.0 绩效数据与薪酬模块联动服务
 * Salary Bonus Service
 * 
 * 功能：
 * 1. 基于绩效排行榜数据自动计算绩效奖金
 * 2. 薪酬计算规则管理
 * 3. 薪酬数据导出
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ============================================================
// 1. 薪酬计算规则管理
// ============================================================

/** 获取所有薪酬计算规则 */
export async function getSalaryRules(activeOnly?: boolean) {
  const db = await requireDb();
  if (activeOnly) {
    const rows = (await db.execute(sql`
      SELECT * FROM salary_calculation_rules WHERE is_active = 1 ORDER BY created_at DESC
    `)).rows;
    return rows;
  }
  const rows = (await db.execute(sql`
    SELECT * FROM salary_calculation_rules ORDER BY is_active DESC, created_at DESC
  `)).rows;
  return rows;
}

/** 获取单个规则详情 */
export async function getSalaryRule(ruleId: number) {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT * FROM salary_calculation_rules WHERE id = ${ruleId}
  `)).rows;
  return (rows as any[])[0] || null;
}

/** 创建薪酬计算规则 */
export async function createSalaryRule(params: {
  ruleName: string;
  ruleCode: string;
  description?: string;
  efficiencyBaseAmount?: number;
  efficiencyThreshold?: number;
  efficiencyMaxMultiplier?: number;
  efficiencyWeight?: number;
  qualityBaseAmount?: number;
  qualityThreshold?: number;
  qualityMaxMultiplier?: number;
  qualityWeight?: number;
  attendanceBaseAmount?: number;
  attendanceThreshold?: number;
  attendanceWeight?: number;
  rankTop1Bonus?: number;
  rankTop3Bonus?: number;
  rankTop5Bonus?: number;
  defectPenaltyPerCount?: number;
  criticalDefectPenalty?: number;
  createdBy?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  const result = (await db.execute(sql`
    INSERT INTO salary_calculation_rules
    (rule_name, rule_code, description, is_active,
     efficiency_base_amount, efficiency_threshold, efficiency_max_multiplier, efficiency_weight,
     quality_base_amount, quality_threshold, quality_max_multiplier, quality_weight,
     attendance_base_amount, attendance_threshold, attendance_weight,
     rank_top1_bonus, rank_top3_bonus, rank_top5_bonus,
     defect_penalty_per_count, critical_defect_penalty,
     created_by, created_at, updated_at)
    VALUES (${params.ruleName}, ${params.ruleCode}, ${params.description || null}, 1,
            ${params.efficiencyBaseAmount ?? 500}, ${params.efficiencyThreshold ?? 100},
            ${params.efficiencyMaxMultiplier ?? 2.0}, ${params.efficiencyWeight ?? 0.40},
            ${params.qualityBaseAmount ?? 400}, ${params.qualityThreshold ?? 95},
            ${params.qualityMaxMultiplier ?? 1.5}, ${params.qualityWeight ?? 0.35},
            ${params.attendanceBaseAmount ?? 300}, ${params.attendanceThreshold ?? 90},
            ${params.attendanceWeight ?? 0.25},
            ${params.rankTop1Bonus ?? 1000}, ${params.rankTop3Bonus ?? 500}, ${params.rankTop5Bonus ?? 200},
            ${params.defectPenaltyPerCount ?? 50}, ${params.criticalDefectPenalty ?? 500},
            ${params.createdBy || null}, ${now}, ${now})
  `)).rows;

  return { id: (result as any)[0]?.id };
}

/** 更新薪酬计算规则 */
export async function updateSalaryRule(ruleId: number, params: Record<string, any>) {
  const db = await requireDb();
  const now = Date.now();
  
  // Build dynamic update - only update provided fields
  const updates: string[] = [];
  const fieldMap: Record<string, string> = {
    ruleName: 'rule_name',
    description: 'description',
    isActive: 'is_active',
    efficiencyBaseAmount: 'efficiency_base_amount',
    efficiencyThreshold: 'efficiency_threshold',
    efficiencyMaxMultiplier: 'efficiency_max_multiplier',
    efficiencyWeight: 'efficiency_weight',
    qualityBaseAmount: 'quality_base_amount',
    qualityThreshold: 'quality_threshold',
    qualityMaxMultiplier: 'quality_max_multiplier',
    qualityWeight: 'quality_weight',
    attendanceBaseAmount: 'attendance_base_amount',
    attendanceThreshold: 'attendance_threshold',
    attendanceWeight: 'attendance_weight',
    rankTop1Bonus: 'rank_top1_bonus',
    rankTop3Bonus: 'rank_top3_bonus',
    rankTop5Bonus: 'rank_top5_bonus',
    defectPenaltyPerCount: 'defect_penalty_per_count',
    criticalDefectPenalty: 'critical_defect_penalty',
  };
  
  // Use a simple approach - update all fields that are present
  await db.execute(sql`
    UPDATE salary_calculation_rules SET
      rule_name = COALESCE(${params.ruleName || null}, rule_name),
      description = COALESCE(${params.description || null}, description),
      is_active = COALESCE(${params.isActive !== undefined ? (params.isActive ? 1 : 0) : null}, is_active),
      efficiency_base_amount = COALESCE(${params.efficiencyBaseAmount ?? null}, efficiency_base_amount),
      efficiency_threshold = COALESCE(${params.efficiencyThreshold ?? null}, efficiency_threshold),
      efficiency_max_multiplier = COALESCE(${params.efficiencyMaxMultiplier ?? null}, efficiency_max_multiplier),
      efficiency_weight = COALESCE(${params.efficiencyWeight ?? null}, efficiency_weight),
      quality_base_amount = COALESCE(${params.qualityBaseAmount ?? null}, quality_base_amount),
      quality_threshold = COALESCE(${params.qualityThreshold ?? null}, quality_threshold),
      quality_max_multiplier = COALESCE(${params.qualityMaxMultiplier ?? null}, quality_max_multiplier),
      quality_weight = COALESCE(${params.qualityWeight ?? null}, quality_weight),
      attendance_base_amount = COALESCE(${params.attendanceBaseAmount ?? null}, attendance_base_amount),
      attendance_threshold = COALESCE(${params.attendanceThreshold ?? null}, attendance_threshold),
      attendance_weight = COALESCE(${params.attendanceWeight ?? null}, attendance_weight),
      rank_top1_bonus = COALESCE(${params.rankTop1Bonus ?? null}, rank_top1_bonus),
      rank_top3_bonus = COALESCE(${params.rankTop3Bonus ?? null}, rank_top3_bonus),
      rank_top5_bonus = COALESCE(${params.rankTop5Bonus ?? null}, rank_top5_bonus),
      defect_penalty_per_count = COALESCE(${params.defectPenaltyPerCount ?? null}, defect_penalty_per_count),
      critical_defect_penalty = COALESCE(${params.criticalDefectPenalty ?? null}, critical_defect_penalty),
      updated_at = ${now}
    WHERE id = ${ruleId}
  `);
  
  return { success: true };
}

// ============================================================
// 2. 薪酬奖金计算
// ============================================================

/** 
 * 基于绩效数据计算员工奖金
 * 从 worker_performance_records 表获取绩效数据
 */
export async function calculateSalaryBonus(params: {
  workerId: string;
  workerName: string;
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: number;
  periodEnd: number;
  ruleId?: number;
  baseSalary?: number;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  // 获取计算规则
  let rule: any;
  if (params.ruleId) {
    rule = await getSalaryRule(params.ruleId);
  } else {
    const rules = (await db.execute(sql`
      SELECT * FROM salary_calculation_rules WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1
    `)).rows;
    rule = (rules as any[])[0];
  }
  
  if (!rule) {
    throw new Error('未找到有效的薪酬计算规则');
  }
  
  // 获取员工绩效数据
  const perfRows = (await db.execute(sql`
    SELECT * FROM worker_performance_records
    WHERE worker_id = ${params.workerId}
      AND period_start >= ${params.periodStart}
      AND period_end <= ${params.periodEnd}
    ORDER BY period_start DESC
  `)).rows;
  const perfRecords = perfRows as any[];
  
  // 计算平均绩效指标
  let avgEfficiency = 0;
  let avgQualityRate = 0;
  let totalDefects = 0;
  let criticalDefects = 0;
  
  if (perfRecords.length > 0) {
    avgEfficiency = perfRecords.reduce((sum: number, r: any) => sum + (Number(r.efficiency_rate) || 0), 0) / perfRecords.length;
    avgQualityRate = perfRecords.reduce((sum: number, r: any) => sum + (Number(r.quality_pass_rate) || 0), 0) / perfRecords.length;
    totalDefects = perfRecords.reduce((sum: number, r: any) => sum + (Number(r.defect_count) || 0), 0);
    criticalDefects = perfRecords.reduce((sum: number, r: any) => sum + (Number(r.critical_defect_count) || 0), 0);
  }
  
  // 计算效率奖金
  const efficiencyMultiplier = Math.min(
    avgEfficiency / Number(rule.efficiency_threshold) * 1,
    Number(rule.efficiency_max_multiplier)
  );
  const efficiencyBonus = Number(rule.efficiency_base_amount) * Math.max(0, efficiencyMultiplier);
  
  // 计算质量奖金
  const qualityMultiplier = Math.min(
    avgQualityRate / Number(rule.quality_threshold) * 1,
    Number(rule.quality_max_multiplier)
  );
  const qualityBonus = Number(rule.quality_base_amount) * Math.max(0, qualityMultiplier);
  
  // 计算出勤奖金（简化：假设出勤率从绩效记录中获取）
  const attendanceBonus = Number(rule.attendance_base_amount); // 默认全勤
  
  // 获取排名信息
  const rankRows = (await db.execute(sql`
    SELECT performance_rank FROM worker_performance_records
    WHERE worker_id = ${params.workerId}
      AND period_start >= ${params.periodStart}
      AND period_end <= ${params.periodEnd}
    ORDER BY period_end DESC LIMIT 1
  `)).rows;
  const rank = (rankRows as any[])[0]?.performance_rank || 999;
  
  // 排名奖金
  let specialBonus = 0;
  if (rank === 1) specialBonus = Number(rule.rank_top1_bonus);
  else if (rank <= 3) specialBonus = Number(rule.rank_top3_bonus);
  else if (rank <= 5) specialBonus = Number(rule.rank_top5_bonus);
  
  // 处罚扣款
  const penaltyDeduction = 
    totalDefects * Number(rule.defect_penalty_per_count) +
    criticalDefects * Number(rule.critical_defect_penalty);
  
  // 计算总奖金
  const totalBonus = Math.max(0, efficiencyBonus + qualityBonus + attendanceBonus + specialBonus - penaltyDeduction);
  
  // 综合评分
  const overallScore = (
    avgEfficiency * Number(rule.efficiency_weight) +
    avgQualityRate * Number(rule.quality_weight) +
    (attendanceBonus > 0 ? 100 : 0) * Number(rule.attendance_weight)
  );
  
  // 保存奖金记录
  const calculationDetails = JSON.stringify({
    performanceRecords: perfRecords.length,
    avgEfficiency,
    avgQualityRate,
    totalDefects,
    criticalDefects,
    efficiencyMultiplier,
    qualityMultiplier,
    rank,
    rule: { id: rule.id, name: rule.rule_name, code: rule.rule_code },
  });
  
  const result = (await db.execute(sql`
    INSERT INTO salary_bonus_records
    (worker_id, worker_name, period_type, period_start, period_end,
     base_salary, efficiency_bonus, quality_bonus, attendance_bonus,
     special_bonus, penalty_deduction, total_bonus,
     efficiency_rate, quality_pass_rate, overall_score, performance_rank,
     calculation_rule_id, calculation_details, status,
     created_at, updated_at)
    VALUES (${params.workerId}, ${params.workerName}, ${params.periodType},
            ${params.periodStart}, ${params.periodEnd},
            ${params.baseSalary || 0}, ${efficiencyBonus.toFixed(2)}, ${qualityBonus.toFixed(2)},
            ${attendanceBonus.toFixed(2)}, ${specialBonus.toFixed(2)}, ${penaltyDeduction.toFixed(2)},
            ${totalBonus.toFixed(2)}, ${avgEfficiency.toFixed(2)}, ${avgQualityRate.toFixed(2)},
            ${overallScore.toFixed(2)}, ${rank},
            ${rule.id}, ${calculationDetails}, 'calculated',
            ${now}, ${now})
  `)).rows;
  
  return {
    id: (result as any)[0]?.id,
    workerId: params.workerId,
    workerName: params.workerName,
    efficiencyBonus: Number(efficiencyBonus.toFixed(2)),
    qualityBonus: Number(qualityBonus.toFixed(2)),
    attendanceBonus: Number(attendanceBonus.toFixed(2)),
    specialBonus,
    penaltyDeduction: Number(penaltyDeduction.toFixed(2)),
    totalBonus: Number(totalBonus.toFixed(2)),
    overallScore: Number(overallScore.toFixed(2)),
    rank,
    details: {
      avgEfficiency,
      avgQualityRate,
      totalDefects,
      criticalDefects,
    },
  };
}

/** 批量计算所有员工的奖金 */
export async function batchCalculateSalaryBonus(params: {
  periodType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: number;
  periodEnd: number;
  ruleId?: number;
}) {
  const db = await requireDb();
  
  // 获取期间内有绩效记录的所有员工
  const workers = (await db.execute(sql`
    SELECT DISTINCT worker_id, worker_name FROM worker_performance_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
  `)).rows;
  
  const results: any[] = [];
  for (const worker of workers as any[]) {
    try {
      const result = await calculateSalaryBonus({
        workerId: worker.worker_id,
        workerName: worker.worker_name,
        periodType: params.periodType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        ruleId: params.ruleId,
      });
      results.push(result);
    } catch (e: any) {
      results.push({
        workerId: worker.worker_id,
        workerName: worker.worker_name,
        error: e.message,
      });
    }
  }
  
  return {
    total: (workers as any[]).length,
    calculated: results.filter(r => !r.error).length,
    errors: results.filter(r => r.error).length,
    results,
  };
}

// ============================================================
// 3. 薪酬记录查询
// ============================================================

/** 获取薪酬奖金记录列表 */
export async function getSalaryBonusRecords(options: {
  workerId?: string;
  periodType?: string;
  periodStart?: number;
  periodEnd?: number;
  status?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = options.limit || 50;
  
  if (options.workerId) {
    const rows = (await db.execute(sql`
      SELECT * FROM salary_bonus_records
      WHERE worker_id = ${options.workerId}
      ORDER BY period_end DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  if (options.status) {
    const rows = (await db.execute(sql`
      SELECT * FROM salary_bonus_records
      WHERE status = ${options.status}
      ORDER BY period_end DESC
      LIMIT ${limit}
    `)).rows;
    return rows;
  }

  const rows = (await db.execute(sql`
    SELECT * FROM salary_bonus_records
    ORDER BY period_end DESC
    LIMIT ${limit}
  `)).rows;
  return rows;
}

/** 获取单条薪酬记录详情 */
export async function getSalaryBonusDetail(recordId: number) {
  const db = await requireDb();
  const rows = (await db.execute(sql`
    SELECT * FROM salary_bonus_records WHERE id = ${recordId}
  `)).rows;
  return (rows as any[])[0] || null;
}

/** 更新薪酬记录状态（审核/批准/已发放） */
export async function updateSalaryBonusStatus(recordId: number, params: {
  status: string;
  reviewedBy?: string;
  approvedBy?: string;
  notes?: string;
}) {
  const db = await requireDb();
  const now = Date.now();
  
  await db.execute(sql`
    UPDATE salary_bonus_records SET
      status = ${params.status},
      reviewed_by = COALESCE(${params.reviewedBy || null}, reviewed_by),
      reviewed_at = CASE WHEN ${params.status} = 'reviewed' THEN ${now} ELSE reviewed_at END,
      approved_by = COALESCE(${params.approvedBy || null}, approved_by),
      approved_at = CASE WHEN ${params.status} = 'approved' THEN ${now} ELSE approved_at END,
      notes = COALESCE(${params.notes || null}, notes),
      updated_at = ${now}
    WHERE id = ${recordId}
  `);
  
  return { success: true };
}

/** 获取薪酬统计概览 */
export async function getSalaryBonusStats(periodType?: string, periodStart?: number, periodEnd?: number) {
  const db = await requireDb();
  
  let query;
  if (periodStart && periodEnd) {
    query = (await db.execute(sql`
      SELECT
        COUNT(*) as total_records,
        SUM(total_bonus) as total_bonus_amount,
        AVG(total_bonus) as avg_bonus,
        MAX(total_bonus) as max_bonus,
        MIN(total_bonus) as min_bonus,
        AVG(efficiency_rate) as avg_efficiency,
        AVG(quality_pass_rate) as avg_quality_rate,
        AVG(overall_score) as avg_score,
        SUM(CASE WHEN status = 'paid' THEN total_bonus ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'approved' THEN total_bonus ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'calculated' THEN total_bonus ELSE 0 END) as pending_amount
      FROM salary_bonus_records
      WHERE period_start >= ${periodStart} AND period_end <= ${periodEnd}
    `)).rows;
  } else {
    query = (await db.execute(sql`
      SELECT
        COUNT(*) as total_records,
        SUM(total_bonus) as total_bonus_amount,
        AVG(total_bonus) as avg_bonus,
        MAX(total_bonus) as max_bonus,
        MIN(total_bonus) as min_bonus,
        AVG(efficiency_rate) as avg_efficiency,
        AVG(quality_pass_rate) as avg_quality_rate,
        AVG(overall_score) as avg_score,
        SUM(CASE WHEN status = 'paid' THEN total_bonus ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'approved' THEN total_bonus ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'calculated' THEN total_bonus ELSE 0 END) as pending_amount
      FROM salary_bonus_records
    `)).rows;
  }

  return (query as any[])[0] || {};
}

/** 导出薪酬数据为CSV格式 */
export async function exportSalaryBonusCSV(options: {
  periodStart?: number;
  periodEnd?: number;
  status?: string;
}) {
  const db = await requireDb();
  
  let rows: any[];
  if (options.periodStart && options.periodEnd) {
    rows = (await db.execute(sql`
      SELECT * FROM salary_bonus_records
      WHERE period_start >= ${options.periodStart} AND period_end <= ${options.periodEnd}
      ORDER BY total_bonus DESC
    `)).rows as any[];
  } else {
    rows = (await db.execute(sql`
      SELECT * FROM salary_bonus_records ORDER BY period_end DESC, total_bonus DESC
    `)).rows as any[];
  }
  
  // Generate CSV
  const headers = [
    '员工ID', '员工姓名', '周期类型', '周期开始', '周期结束',
    '基本工资', '效率奖金', '质量奖金', '出勤奖金', '特别奖金',
    '处罚扣款', '奖金合计', '效率系数', '质量合格率', '综合评分',
    '绩效排名', '状态',
  ];
  
  const csvRows = rows.map((r: any) => [
    r.worker_id,
    r.worker_name,
    r.period_type,
    new Date(Number(r.period_start)).toLocaleDateString(),
    new Date(Number(r.period_end)).toLocaleDateString(),
    r.base_salary,
    r.efficiency_bonus,
    r.quality_bonus,
    r.attendance_bonus,
    r.special_bonus,
    r.penalty_deduction,
    r.total_bonus,
    r.efficiency_rate,
    r.quality_pass_rate,
    r.overall_score,
    r.performance_rank,
    r.status,
  ].join(','));
  
  return {
    csv: [headers.join(','), ...csvRows].join('\n'),
    count: rows.length,
  };
}
