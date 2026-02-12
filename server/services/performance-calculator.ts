/**
 * 绩效指标计算引擎
 * Performance Metrics Calculator Engine
 */

/**
 * 绩效评级类型
 */
export type PerformanceRating = "A+" | "A" | "B+" | "B" | "C";

/**
 * 绩效指标接口
 */
export interface PerformanceMetrics {
  // 经营指标 (25%)
  revenueAchievementRate: number; // 收入达成率
  profitMargin: number; // 利润率

  // 交付指标 (20%)
  deliveryOnTimeRate: number; // 按时交付率
  projectSatisfaction: number; // 项目满意度

  // 成本指标 (20%)
  costVarianceRate: number; // 成本差异率
  laborCostRatio: number; // 劳动成本比率

  // 质量指标 (15%)
  qualityScore: number; // 质量评分
  defectRate: number; // 缺陷率

  // 客户指标 (10%)
  customerSatisfaction: number; // 客户满意度
  customerRetentionRate: number; // 客户留存率

  // 人力资源指标 (5%)
  employeeSatisfaction: number; // 员工满意度
  employeeTurnoverRate: number; // 员工流失率

  // 创新指标 (5%)
  innovationScore: number; // 创新评分
}

/**
 * 维度权重
 */
const DIMENSION_WEIGHTS = {
  operational: 0.25, // 经营
  delivery: 0.2, // 交付
  cost: 0.2, // 成本
  quality: 0.15, // 质量
  customer: 0.1, // 客户
  hr: 0.05, // 人力
  innovation: 0.05, // 创新
};

/**
 * 评级阈值
 */
const RATING_THRESHOLDS = {
  "A+": 0.95,
  A: 0.85,
  "B+": 0.75,
  B: 0.65,
  C: 0.0,
};

/**
 * 计算经营指标评分 (25%)
 */
export function calculateOperationalScore(
  revenueAchievementRate: number,
  profitMargin: number
): number {
  // 收入达成率权重60%，利润率权重40%
  const normalizedRevenue = Math.min(revenueAchievementRate / 100, 1.0);
  const normalizedProfit = Math.min(profitMargin / 100, 1.0);

  return normalizedRevenue * 0.6 + normalizedProfit * 0.4;
}

/**
 * 计算交付指标评分 (20%)
 */
export function calculateDeliveryScore(
  deliveryOnTimeRate: number,
  projectSatisfaction: number
): number {
  // 按时交付率权重60%，项目满意度权重40%
  const normalizedDelivery = Math.min(deliveryOnTimeRate / 100, 1.0);
  const normalizedSatisfaction = Math.min(projectSatisfaction / 100, 1.0);

  return normalizedDelivery * 0.6 + normalizedSatisfaction * 0.4;
}

/**
 * 计算成本指标评分 (20%)
 */
export function calculateCostScore(
  costVarianceRate: number,
  laborCostRatio: number
): number {
  // 成本差异率：越接近0越好（-10%到+10%为最优）
  // 劳动成本比率：越低越好（目标30-40%）
  const normalizedCostVariance = Math.max(1 - Math.abs(costVarianceRate) / 20, 0);
  const normalizedLaborCost = Math.max(1 - Math.abs(laborCostRatio - 35) / 35, 0);

  return normalizedCostVariance * 0.5 + normalizedLaborCost * 0.5;
}

/**
 * 计算质量指标评分 (15%)
 */
export function calculateQualityScore(qualityScore: number, defectRate: number): number {
  // 质量评分权重60%，缺陷率权重40%
  const normalizedQuality = Math.min(qualityScore / 100, 1.0);
  const normalizedDefect = Math.max(1 - defectRate / 10, 0); // 假设缺陷率10%为最差

  return normalizedQuality * 0.6 + normalizedDefect * 0.4;
}

/**
 * 计算客户指标评分 (10%)
 */
export function calculateCustomerScore(
  customerSatisfaction: number,
  customerRetentionRate: number
): number {
  // 客户满意度权重60%，客户留存率权重40%
  const normalizedSatisfaction = Math.min(customerSatisfaction / 100, 1.0);
  const normalizedRetention = Math.min(customerRetentionRate / 100, 1.0);

  return normalizedSatisfaction * 0.6 + normalizedRetention * 0.4;
}

/**
 * 计算人力资源指标评分 (5%)
 */
export function calculateHRScore(
  employeeSatisfaction: number,
  employeeTurnoverRate: number
): number {
  // 员工满意度权重60%，员工流失率权重40%（流失率越低越好）
  const normalizedSatisfaction = Math.min(employeeSatisfaction / 100, 1.0);
  const normalizedTurnover = Math.max(1 - employeeTurnoverRate / 20, 0); // 假设20%流失率为最差

  return normalizedSatisfaction * 0.6 + normalizedTurnover * 0.4;
}

/**
 * 计算创新指标评分 (5%)
 */
export function calculateInnovationScore(innovationScore: number): number {
  return Math.min(innovationScore / 100, 1.0);
}

/**
 * 计算综合评分
 */
export function calculateOverallScore(metrics: PerformanceMetrics): number {
  const operationalScore = calculateOperationalScore(
    metrics.revenueAchievementRate,
    metrics.profitMargin
  );
  const deliveryScore = calculateDeliveryScore(
    metrics.deliveryOnTimeRate,
    metrics.projectSatisfaction
  );
  const costScore = calculateCostScore(metrics.costVarianceRate, metrics.laborCostRatio);
  const qualityScore = calculateQualityScore(metrics.qualityScore, metrics.defectRate);
  const customerScore = calculateCustomerScore(
    metrics.customerSatisfaction,
    metrics.customerRetentionRate
  );
  const hrScore = calculateHRScore(metrics.employeeSatisfaction, metrics.employeeTurnoverRate);
  const innovationScore = calculateInnovationScore(metrics.innovationScore);

  return (
    operationalScore * DIMENSION_WEIGHTS.operational +
    deliveryScore * DIMENSION_WEIGHTS.delivery +
    costScore * DIMENSION_WEIGHTS.cost +
    qualityScore * DIMENSION_WEIGHTS.quality +
    customerScore * DIMENSION_WEIGHTS.customer +
    hrScore * DIMENSION_WEIGHTS.hr +
    innovationScore * DIMENSION_WEIGHTS.innovation
  );
}

/**
 * 获取绩效评级
 */
export function getPerformanceRating(score: number): PerformanceRating {
  if (score >= RATING_THRESHOLDS["A+"]) return "A+";
  if (score >= RATING_THRESHOLDS.A) return "A";
  if (score >= RATING_THRESHOLDS["B+"]) return "B+";
  if (score >= RATING_THRESHOLDS.B) return "B";
  return "C";
}

/**
 * 获取评级描述
 */
export function getRatingDescription(rating: PerformanceRating): string {
  const descriptions: Record<PerformanceRating, string> = {
    "A+": "优秀 - 全面超越目标，各维度表现突出",
    A: "良好 - 整体达到目标，大部分指标表现优异",
    "B+": "满意 - 基本达到目标，部分指标需要改进",
    B: "一般 - 部分指标未达目标，需要重点关注",
    C: "较差 - 多个指标未达目标，需要立即改进",
  };
  return descriptions[rating];
}

/**
 * 计算维度评分
 */
export function calculateDimensionScores(metrics: PerformanceMetrics) {
  return {
    operational: calculateOperationalScore(
      metrics.revenueAchievementRate,
      metrics.profitMargin
    ),
    delivery: calculateDeliveryScore(metrics.deliveryOnTimeRate, metrics.projectSatisfaction),
    cost: calculateCostScore(metrics.costVarianceRate, metrics.laborCostRatio),
    quality: calculateQualityScore(metrics.qualityScore, metrics.defectRate),
    customer: calculateCustomerScore(metrics.customerSatisfaction, metrics.customerRetentionRate),
    hr: calculateHRScore(metrics.employeeSatisfaction, metrics.employeeTurnoverRate),
    innovation: calculateInnovationScore(metrics.innovationScore),
  };
}

/**
 * 比较两个时期的绩效
 */
export function comparePerformance(
  currentMetrics: PerformanceMetrics,
  previousMetrics: PerformanceMetrics
) {
  const currentScore = calculateOverallScore(currentMetrics);
  const previousScore = calculateOverallScore(previousMetrics);
  const scoreDifference = currentScore - previousScore;
  const scoreChangePercentage = (scoreDifference / previousScore) * 100;

  const currentDimensions = calculateDimensionScores(currentMetrics);
  const previousDimensions = calculateDimensionScores(previousMetrics);

  const dimensionChanges = {
    operational: currentDimensions.operational - previousDimensions.operational,
    delivery: currentDimensions.delivery - previousDimensions.delivery,
    cost: currentDimensions.cost - previousDimensions.cost,
    quality: currentDimensions.quality - previousDimensions.quality,
    customer: currentDimensions.customer - previousDimensions.customer,
    hr: currentDimensions.hr - previousDimensions.hr,
    innovation: currentDimensions.innovation - previousDimensions.innovation,
  };

  return {
    currentScore,
    previousScore,
    scoreDifference,
    scoreChangePercentage,
    currentRating: getPerformanceRating(currentScore),
    previousRating: getPerformanceRating(previousScore),
    dimensionChanges,
    trend: scoreDifference > 0 ? "up" : scoreDifference < 0 ? "down" : "stable",
  };
}

/**
 * 识别需要改进的领域
 */
export function identifyImprovementAreas(
  metrics: PerformanceMetrics,
  threshold: number = 0.7
) {
  const dimensions = calculateDimensionScores(metrics);
  const areas: Array<{ dimension: string; score: number; gap: number }> = [];

  Object.entries(dimensions).forEach(([dimension, score]) => {
    if (score < threshold) {
      areas.push({
        dimension,
        score,
        gap: threshold - score,
      });
    }
  });

  return areas.sort((a, b) => b.gap - a.gap);
}

/**
 * 生成绩效分析报告
 */
export function generatePerformanceReport(metrics: PerformanceMetrics) {
  const overallScore = calculateOverallScore(metrics);
  const rating = getPerformanceRating(overallScore);
  const dimensions = calculateDimensionScores(metrics);
  const improvementAreas = identifyImprovementAreas(metrics);

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    rating,
    ratingDescription: getRatingDescription(rating),
    dimensions: {
      operational: Math.round(dimensions.operational * 100) / 100,
      delivery: Math.round(dimensions.delivery * 100) / 100,
      cost: Math.round(dimensions.cost * 100) / 100,
      quality: Math.round(dimensions.quality * 100) / 100,
      customer: Math.round(dimensions.customer * 100) / 100,
      hr: Math.round(dimensions.hr * 100) / 100,
      innovation: Math.round(dimensions.innovation * 100) / 100,
    },
    improvementAreas: improvementAreas.map((area) => ({
      ...area,
      score: Math.round(area.score * 100) / 100,
      gap: Math.round(area.gap * 100) / 100,
    })),
    strengths: Object.entries(dimensions)
      .filter(([, score]) => score >= 0.8)
      .map(([dimension]) => dimension),
    weaknesses: Object.entries(dimensions)
      .filter(([, score]) => score < 0.6)
      .map(([dimension]) => dimension),
  };
}
