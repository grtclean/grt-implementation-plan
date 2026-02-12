/**
 * v1.7.1 薪酬报表可视化服务
 * Salary Report Visualization Service
 * 
 * 功能：
 * 1. 月度奖金分布图表数据
 * 2. 部门/工序对比分析
 * 3. 绩效-薪酬相关性分析
 * 4. 趋势分析（多周期对比）
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ============================================================
// 1. 月度奖金分布
// ============================================================

/** 获取月度奖金分布数据（用于柱状图/饼图） */
export async function getMonthlyBonusDistribution(params: {
  periodStart: number;
  periodEnd: number;
}) {
  const db = await requireDb();
  
  // 奖金区间分布
  const distribution = (await db.execute(sql`
    SELECT
      CASE
        WHEN total_bonus < 500 THEN '0-500'
        WHEN total_bonus < 1000 THEN '500-1000'
        WHEN total_bonus < 1500 THEN '1000-1500'
        WHEN total_bonus < 2000 THEN '1500-2000'
        WHEN total_bonus < 3000 THEN '2000-3000'
        ELSE '3000+'
      END as bonus_range,
      COUNT(*) as worker_count,
      AVG(total_bonus) as avg_bonus,
      SUM(total_bonus) as total_amount
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
    GROUP BY bonus_range
    ORDER BY MIN(total_bonus)
  `)).rows;

  // 奖金组成占比
  const composition = (await db.execute(sql`
    SELECT
      SUM(efficiency_bonus) as total_efficiency,
      SUM(quality_bonus) as total_quality,
      SUM(attendance_bonus) as total_attendance,
      SUM(special_bonus) as total_special,
      SUM(penalty_deduction) as total_penalty,
      SUM(total_bonus) as grand_total,
      COUNT(*) as worker_count
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
  `)).rows;

  // Top 10 员工奖金
  const topWorkers = (await db.execute(sql`
    SELECT worker_id, worker_name, total_bonus, efficiency_bonus, quality_bonus,
           attendance_bonus, special_bonus, penalty_deduction, overall_score, performance_rank
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
    ORDER BY total_bonus DESC
    LIMIT 10
  `)).rows;

  // Bottom 10 员工奖金
  const bottomWorkers = (await db.execute(sql`
    SELECT worker_id, worker_name, total_bonus, efficiency_bonus, quality_bonus,
           attendance_bonus, special_bonus, penalty_deduction, overall_score, performance_rank
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
    ORDER BY total_bonus ASC
    LIMIT 10
  `)).rows;
  
  return {
    distribution: distribution as any[],
    composition: (composition as any[])[0] || {},
    topWorkers: topWorkers as any[],
    bottomWorkers: bottomWorkers as any[],
  };
}

// ============================================================
// 2. 部门/工序对比分析
// ============================================================

/** 获取按工序分组的薪酬对比数据 */
export async function getProcessComparisonData(params: {
  periodStart: number;
  periodEnd: number;
}) {
  const db = await requireDb();
  
  // 按工序统计（通过绩效记录关联工序）
  const processStats = (await db.execute(sql`
    SELECT
      wpr.process_code,
      COUNT(DISTINCT sbr.worker_id) as worker_count,
      AVG(sbr.total_bonus) as avg_bonus,
      MAX(sbr.total_bonus) as max_bonus,
      MIN(sbr.total_bonus) as min_bonus,
      SUM(sbr.total_bonus) as total_bonus,
      AVG(sbr.efficiency_rate) as avg_efficiency,
      AVG(sbr.quality_pass_rate) as avg_quality_rate,
      AVG(sbr.overall_score) as avg_score
    FROM salary_bonus_records sbr
    INNER JOIN worker_performance_records wpr
      ON wpr.worker_id = sbr.worker_id
      AND wpr.period_start >= sbr.period_start
      AND wpr.period_end <= sbr.period_end
    WHERE sbr.period_start >= ${params.periodStart} AND sbr.period_end <= ${params.periodEnd}
    GROUP BY wpr.process_code
    ORDER BY wpr.process_code
  `)).rows;
  
  // 工序间差异指标
  const stats = processStats as any[];
  const avgBonusValues = stats.map(s => Number(s.avg_bonus) || 0);
  const overallAvg = avgBonusValues.length > 0 
    ? avgBonusValues.reduce((a, b) => a + b, 0) / avgBonusValues.length 
    : 0;
  
  const processComparison = stats.map(s => ({
    ...s,
    deviationFromAvg: ((Number(s.avg_bonus) || 0) - overallAvg).toFixed(2),
    deviationPercent: overallAvg > 0 
      ? (((Number(s.avg_bonus) || 0) - overallAvg) / overallAvg * 100).toFixed(1) 
      : '0',
  }));
  
  return {
    processStats: processComparison,
    overallAvgBonus: overallAvg.toFixed(2),
    processCount: stats.length,
  };
}

// ============================================================
// 3. 绩效-薪酬相关性分析
// ============================================================

/** 获取绩效-薪酬散点图数据 */
export async function getPerformanceSalaryCorrelation(params: {
  periodStart: number;
  periodEnd: number;
  metric?: 'efficiency' | 'quality' | 'overall';
}) {
  const db = await requireDb();
  const metric = params.metric || 'overall';
  
  // 获取所有员工的绩效和薪酬数据
  const records = (await db.execute(sql`
    SELECT
      worker_id, worker_name,
      efficiency_rate, quality_pass_rate, overall_score,
      total_bonus, efficiency_bonus, quality_bonus,
      performance_rank, penalty_deduction
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
    ORDER BY overall_score DESC
  `)).rows;
  
  const data = records as any[];
  
  // 计算相关系数（皮尔逊）
  let xValues: number[], yValues: number[];
  
  if (metric === 'efficiency') {
    xValues = data.map(d => Number(d.efficiency_rate) || 0);
    yValues = data.map(d => Number(d.total_bonus) || 0);
  } else if (metric === 'quality') {
    xValues = data.map(d => Number(d.quality_pass_rate) || 0);
    yValues = data.map(d => Number(d.total_bonus) || 0);
  } else {
    xValues = data.map(d => Number(d.overall_score) || 0);
    yValues = data.map(d => Number(d.total_bonus) || 0);
  }
  
  const correlation = calculatePearsonCorrelation(xValues, yValues);
  
  // 散点数据
  const scatterData = data.map(d => ({
    workerId: d.worker_id,
    workerName: d.worker_name,
    x: metric === 'efficiency' ? Number(d.efficiency_rate) || 0
       : metric === 'quality' ? Number(d.quality_pass_rate) || 0
       : Number(d.overall_score) || 0,
    y: Number(d.total_bonus) || 0,
    rank: Number(d.performance_rank) || 0,
  }));
  
  // 回归线数据
  const regression = calculateLinearRegression(xValues, yValues);
  
  return {
    scatterData,
    correlation: {
      coefficient: correlation,
      strength: Math.abs(correlation) > 0.7 ? '强相关' 
               : Math.abs(correlation) > 0.4 ? '中等相关' 
               : '弱相关',
      direction: correlation > 0 ? '正相关' : '负相关',
    },
    regression: {
      slope: regression.slope,
      intercept: regression.intercept,
      rSquared: regression.rSquared,
    },
    metric,
    dataPoints: data.length,
  };
}

/** 计算皮尔逊相关系数 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

/** 计算线性回归 */
function calculateLinearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R²
  const meanY = sumY / n;
  const ssRes = y.reduce((total, yi, i) => total + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const ssTot = y.reduce((total, yi) => total + Math.pow(yi - meanY, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    rSquared: Number(rSquared.toFixed(4)),
  };
}

// ============================================================
// 4. 趋势分析（多周期对比）
// ============================================================

/** 获取多周期趋势数据 */
export async function getSalaryTrendData(params: {
  periodType: 'weekly' | 'monthly' | 'quarterly';
  periodsCount?: number;
}) {
  const db = await requireDb();
  const periodsCount = params.periodsCount || 12;
  
  // 按周期聚合
  const trendData = (await db.execute(sql`
    SELECT
      period_type,
      period_start,
      period_end,
      COUNT(*) as worker_count,
      SUM(total_bonus) as total_bonus,
      AVG(total_bonus) as avg_bonus,
      MAX(total_bonus) as max_bonus,
      MIN(total_bonus) as min_bonus,
      AVG(efficiency_rate) as avg_efficiency,
      AVG(quality_pass_rate) as avg_quality_rate,
      AVG(overall_score) as avg_score,
      SUM(penalty_deduction) as total_penalty,
      SUM(special_bonus) as total_special_bonus
    FROM salary_bonus_records
    WHERE period_type = ${params.periodType}
    GROUP BY period_type, period_start, period_end
    ORDER BY period_start DESC
    LIMIT ${periodsCount}
  `)).rows;
  
  // 反转使其按时间正序
  const trend = (trendData as any[]).reverse();
  
  // 计算环比变化
  const trendWithChange = trend.map((item, index) => {
    const prev = index > 0 ? trend[index - 1] : null;
    return {
      ...item,
      avgBonusChange: prev 
        ? ((Number(item.avg_bonus) - Number(prev.avg_bonus)) / Number(prev.avg_bonus) * 100).toFixed(1) 
        : null,
      avgEfficiencyChange: prev 
        ? ((Number(item.avg_efficiency) - Number(prev.avg_efficiency)) / Number(prev.avg_efficiency) * 100).toFixed(1) 
        : null,
      avgQualityChange: prev 
        ? ((Number(item.avg_quality_rate) - Number(prev.avg_quality_rate)) / Number(prev.avg_quality_rate) * 100).toFixed(1) 
        : null,
    };
  });
  
  return {
    trend: trendWithChange,
    periodType: params.periodType,
    periodsCount: trend.length,
  };
}

/** 获取员工个人薪酬趋势 */
export async function getWorkerSalaryTrend(workerId: string, limit?: number) {
  const db = await requireDb();
  const queryLimit = limit || 12;
  
  const records = (await db.execute(sql`
    SELECT
      period_type, period_start, period_end,
      total_bonus, efficiency_bonus, quality_bonus,
      attendance_bonus, special_bonus, penalty_deduction,
      efficiency_rate, quality_pass_rate, overall_score, performance_rank
    FROM salary_bonus_records
    WHERE worker_id = ${workerId}
    ORDER BY period_start DESC
    LIMIT ${queryLimit}
  `)).rows;
  
  // 反转使其按时间正序
  const trend = (records as any[]).reverse();
  
  return {
    workerId,
    trend,
    periodsCount: trend.length,
  };
}

// ============================================================
// 5. 综合仪表盘数据
// ============================================================

/** 获取薪酬可视化仪表盘数据 */
export async function getSalaryDashboardData(params: {
  periodStart: number;
  periodEnd: number;
  periodType?: string;
}) {
  const db = await requireDb();
  
  // 汇总统计
  const summary = (await db.execute(sql`
    SELECT
      COUNT(*) as total_records,
      COUNT(DISTINCT worker_id) as unique_workers,
      SUM(total_bonus) as total_bonus_amount,
      AVG(total_bonus) as avg_bonus,
      MAX(total_bonus) as max_bonus,
      MIN(total_bonus) as min_bonus,
      STDDEV(total_bonus) as bonus_stddev,
      AVG(efficiency_rate) as avg_efficiency,
      AVG(quality_pass_rate) as avg_quality,
      AVG(overall_score) as avg_score,
      SUM(penalty_deduction) as total_penalties,
      SUM(special_bonus) as total_special_bonuses,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN status = 'calculated' THEN 1 ELSE 0 END) as pending_count
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
  `)).rows;

  // 状态分布
  const statusDist = (await db.execute(sql`
    SELECT status, COUNT(*) as count, SUM(total_bonus) as amount
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
    GROUP BY status
  `)).rows;

  // 排名分布
  const rankDist = (await db.execute(sql`
    SELECT
      CASE
        WHEN performance_rank = 1 THEN 'Top 1'
        WHEN performance_rank <= 3 THEN 'Top 3'
        WHEN performance_rank <= 5 THEN 'Top 5'
        WHEN performance_rank <= 10 THEN 'Top 10'
        ELSE 'Other'
      END as rank_group,
      COUNT(*) as count,
      AVG(total_bonus) as avg_bonus
    FROM salary_bonus_records
    WHERE period_start >= ${params.periodStart} AND period_end <= ${params.periodEnd}
    GROUP BY rank_group
    ORDER BY MIN(performance_rank)
  `)).rows;
  
  return {
    summary: (summary as any[])[0] || {},
    statusDistribution: statusDist as any[],
    rankDistribution: rankDist as any[],
  };
}
