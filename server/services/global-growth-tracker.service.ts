/**
 * Global Growth Tracker Service
 * Based on Gemini Design: Global Growth Tracker
 * Context: 2028 Strategy (300M Revenue)
 */

// 区域配置类型
interface RegionConfig {
  salesTarget: string;
  salesTargetValue: number;
  currency: string;
  staff: {
    sales: number;
    supportAsia: number;
    supportAsiaRemote: number;
    serviceLocal: number;
    serviceAsia: number;
  };
  focus: string[];
  focusScenarios: number[];
}

// 区域数据
const REGIONS: Record<string, RegionConfig> = {
  Europe: {
    salesTarget: '6M EUR',
    salesTargetValue: 6000000,
    currency: 'EUR',
    staff: {
      sales: 4,
      supportAsia: 3,
      supportAsiaRemote: 0,
      serviceLocal: 0,
      serviceAsia: 5,
    },
    focus: ['自动化升级', '环保合规'],
    focusScenarios: [6, 7], // Scenario 6 (Automation) & 7 (Environment)
  },
  USA: {
    salesTarget: '8M USD',
    salesTargetValue: 8000000,
    currency: 'USD',
    staff: {
      sales: 4,
      supportAsia: 0,
      supportAsiaRemote: 15,
      serviceLocal: 2,
      serviceAsia: 0,
    },
    focus: ['新工厂建设', '设备更换'],
    focusScenarios: [1, 3], // Scenario 1 (New Factories) & 3 (Replacement)
  },
  China: {
    salesTarget: '200M CNY',
    salesTargetValue: 200000000,
    currency: 'CNY',
    staff: {
      sales: 20,
      supportAsia: 30,
      supportAsiaRemote: 0,
      serviceLocal: 15,
      serviceAsia: 0,
    },
    focus: ['全场景覆盖'],
    focusScenarios: [1, 2, 3, 4, 5, 6, 7],
  },
  Asia_Pacific: {
    salesTarget: '3M USD',
    salesTargetValue: 3000000,
    currency: 'USD',
    staff: {
      sales: 2,
      supportAsia: 5,
      supportAsiaRemote: 3,
      serviceLocal: 1,
      serviceAsia: 3,
    },
    focus: ['新工厂建设', '产能扩张'],
    focusScenarios: [1, 2],
  },
};

// 资源充足性检查结果
interface ResourceAdequacyResult {
  region: string;
  isAdequate: boolean;
  status: 'optimal' | 'warning' | 'critical';
  message: string;
  messageEn: string;
  details: {
    salesCount: number;
    requiredSupport: number;
    actualSupport: number;
    gap: number;
    recommendation: string;
    recommendationEn: string;
  };
}

// 收入预测结果
interface RevenueForecast {
  region: string;
  currentRevenue: number;
  targetRevenue: number;
  currency: string;
  progress: number;
  trend: 'up' | 'down' | 'stable';
  forecast: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
}

// 全球增长追踪仪表板
interface GlobalGrowthDashboard {
  year: number;
  totalTargetRevenue: string;
  regions: {
    name: string;
    config: RegionConfig;
    resourceStatus: ResourceAdequacyResult;
    revenueForecast: RevenueForecast;
  }[];
  alerts: {
    type: 'hiring' | 'revenue' | 'resource';
    severity: 'info' | 'warning' | 'critical';
    region: string;
    message: string;
    messageEn: string;
  }[];
  recommendations: string[];
  recommendationsEn: string[];
}

/**
 * 检查资源充足性
 * AI Logic: Calculates if current staffing supports the revenue ramp-up
 * Ratio assumption: 1 Sales needs 1.5 Support for customized equipment
 */
export function checkResourceAdequacy(
  currentRevenue: number,
  region: string
): ResourceAdequacyResult {
  const regionConfig = REGIONS[region];

  if (!regionConfig) {
    return {
      region,
      isAdequate: false,
      status: 'critical',
      message: `未知区域: ${region}`,
      messageEn: `Unknown region: ${region}`,
      details: {
        salesCount: 0,
        requiredSupport: 0,
        actualSupport: 0,
        gap: 0,
        recommendation: '请检查区域配置',
        recommendationEn: 'Please check region configuration',
      },
    };
  }

  const salesCount = regionConfig.staff.sales;
  const requiredSupport = salesCount * 1.5; // 1 Sales needs 1.5 Support
  const actualSupport =
    (regionConfig.staff.supportAsia || 0) + (regionConfig.staff.supportAsiaRemote || 0);

  const gap = requiredSupport - actualSupport;
  const isAdequate = actualSupport >= requiredSupport;

  let status: 'optimal' | 'warning' | 'critical';
  let message: string;
  let messageEn: string;
  let recommendation: string;
  let recommendationEn: string;

  if (isAdequate) {
    status = 'optimal';
    message = '资源水平最优';
    messageEn = 'Resource Level Optimal';
    recommendation = '维持当前配置';
    recommendationEn = 'Maintain current configuration';
  } else if (gap <= 2) {
    status = 'warning';
    message = `警告: ${region} 支持团队略有不足，差距 ${gap.toFixed(1)} 人`;
    messageEn = `WARNING: ${region} Support Team slightly understaffed. Gap: ${gap.toFixed(1)}`;
    recommendation = `建议在下季度招聘 ${Math.ceil(gap)} 名支持人员`;
    recommendationEn = `Recommend hiring ${Math.ceil(gap)} support staff next quarter`;
  } else {
    status = 'critical';
    message = `警报: ${region} 支持团队严重不足，已触发亚洲总部招聘计划`;
    messageEn = `ALERT: ${region} Support Team understaffed. Hiring Plan triggered for Asian HQ.`;
    recommendation = `紧急招聘 ${Math.ceil(gap)} 名支持人员，优先从亚洲总部调配`;
    recommendationEn = `Urgently hire ${Math.ceil(gap)} support staff, prioritize transfer from Asian HQ`;
  }

  return {
    region,
    isAdequate,
    status,
    message,
    messageEn,
    details: {
      salesCount,
      requiredSupport,
      actualSupport,
      gap: Math.max(0, gap),
      recommendation,
      recommendationEn,
    },
  };
}

/**
 * 获取收入预测
 */
export function getRevenueForecast(region: string, currentRevenue: number): RevenueForecast {
  const regionConfig = REGIONS[region];

  if (!regionConfig) {
    return {
      region,
      currentRevenue: 0,
      targetRevenue: 0,
      currency: 'USD',
      progress: 0,
      trend: 'stable',
      forecast: { q1: 0, q2: 0, q3: 0, q4: 0 },
    };
  }

  const targetRevenue = regionConfig.salesTargetValue;
  const progress = (currentRevenue / targetRevenue) * 100;

  // 简单的季度预测模型
  const remainingRevenue = targetRevenue - currentRevenue;
  const quarterlyTarget = remainingRevenue / 4;

  return {
    region,
    currentRevenue,
    targetRevenue,
    currency: regionConfig.currency,
    progress: Math.min(100, progress),
    trend: progress > 25 ? 'up' : progress > 10 ? 'stable' : 'down',
    forecast: {
      q1: currentRevenue + quarterlyTarget,
      q2: currentRevenue + quarterlyTarget * 2,
      q3: currentRevenue + quarterlyTarget * 3,
      q4: targetRevenue,
    },
  };
}

/**
 * 生成全球增长追踪仪表板
 */
export function generateGlobalGrowthDashboard(
  year: number,
  currentRevenueByRegion: Record<string, number> = {}
): GlobalGrowthDashboard {
  const regions = Object.keys(REGIONS).map((regionName) => {
    const config = REGIONS[regionName];
    const currentRevenue = currentRevenueByRegion[regionName] || 0;
    const resourceStatus = checkResourceAdequacy(currentRevenue, regionName);
    const revenueForecast = getRevenueForecast(regionName, currentRevenue);

    return {
      name: regionName,
      config,
      resourceStatus,
      revenueForecast,
    };
  });

  // 生成警报
  const alerts: GlobalGrowthDashboard['alerts'] = [];

  for (const region of regions) {
    if (region.resourceStatus.status === 'critical') {
      alerts.push({
        type: 'hiring',
        severity: 'critical',
        region: region.name,
        message: region.resourceStatus.message,
        messageEn: region.resourceStatus.messageEn,
      });
    } else if (region.resourceStatus.status === 'warning') {
      alerts.push({
        type: 'resource',
        severity: 'warning',
        region: region.name,
        message: region.resourceStatus.message,
        messageEn: region.resourceStatus.messageEn,
      });
    }

    if (region.revenueForecast.progress < 20 && region.revenueForecast.trend === 'down') {
      alerts.push({
        type: 'revenue',
        severity: 'warning',
        region: region.name,
        message: `${region.name} 收入进度落后，当前 ${region.revenueForecast.progress.toFixed(1)}%`,
        messageEn: `${region.name} revenue behind target, currently ${region.revenueForecast.progress.toFixed(1)}%`,
      });
    }
  }

  // 生成建议
  const recommendations: string[] = [];
  const recommendationsEn: string[] = [];

  const criticalRegions = regions.filter((r) => r.resourceStatus.status === 'critical');
  if (criticalRegions.length > 0) {
    recommendations.push(
      `优先解决 ${criticalRegions.map((r) => r.name).join(', ')} 的人员配置问题`
    );
    recommendationsEn.push(
      `Prioritize staffing issues in ${criticalRegions.map((r) => r.name).join(', ')}`
    );
  }

  const lowProgressRegions = regions.filter((r) => r.revenueForecast.progress < 25);
  if (lowProgressRegions.length > 0) {
    recommendations.push(
      `加强 ${lowProgressRegions.map((r) => r.name).join(', ')} 的销售支持`
    );
    recommendationsEn.push(
      `Strengthen sales support in ${lowProgressRegions.map((r) => r.name).join(', ')}`
    );
  }

  return {
    year,
    totalTargetRevenue: '300M CNY (2028 Strategy)',
    regions,
    alerts,
    recommendations,
    recommendationsEn,
  };
}

/**
 * 获取区域配置
 */
export function getRegionConfig(region: string): RegionConfig | null {
  return REGIONS[region] || null;
}

/**
 * 获取所有区域
 */
export function getAllRegions(): string[] {
  return Object.keys(REGIONS);
}

/**
 * 计算全球总目标
 */
export function calculateGlobalTarget(): {
  totalInCNY: number;
  byRegion: Record<string, { target: number; currency: string; inCNY: number }>;
} {
  const exchangeRates: Record<string, number> = {
    CNY: 1,
    USD: 7.2,
    EUR: 7.8,
  };

  const byRegion: Record<string, { target: number; currency: string; inCNY: number }> = {};
  let totalInCNY = 0;

  for (const [regionName, config] of Object.entries(REGIONS)) {
    const rate = exchangeRates[config.currency] || 1;
    const inCNY = config.salesTargetValue * rate;

    byRegion[regionName] = {
      target: config.salesTargetValue,
      currency: config.currency,
      inCNY,
    };

    totalInCNY += inCNY;
  }

  return { totalInCNY, byRegion };
}

export type {
  RegionConfig,
  ResourceAdequacyResult,
  RevenueForecast,
  GlobalGrowthDashboard,
};
