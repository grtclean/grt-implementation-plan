/**
 * 校准趋势分析服务
 * 用于分析设备校准数据的趋势和统计
 */

// 校准参数类型
export type CalibrationParameterType = 
  | 'temperature'
  | 'pressure'
  | 'flow_rate'
  | 'concentration'
  | 'voltage'
  | 'current';

// 校准参数配置
export const CALIBRATION_PARAMETER_CONFIG: Record<CalibrationParameterType, {
  name: string;
  unit: string;
  minValue: number;
  maxValue: number;
  warningThreshold: number;
  criticalThreshold: number;
}> = {
  temperature: {
    name: '温度',
    unit: '°C',
    minValue: -50,
    maxValue: 200,
    warningThreshold: 0.5,
    criticalThreshold: 1.0,
  },
  pressure: {
    name: '压力',
    unit: 'MPa',
    minValue: 0,
    maxValue: 100,
    warningThreshold: 0.1,
    criticalThreshold: 0.2,
  },
  flow_rate: {
    name: '流量',
    unit: 'L/min',
    minValue: 0,
    maxValue: 1000,
    warningThreshold: 5,
    criticalThreshold: 10,
  },
  concentration: {
    name: '浓度',
    unit: '%',
    minValue: 0,
    maxValue: 100,
    warningThreshold: 1,
    criticalThreshold: 2,
  },
  voltage: {
    name: '电压',
    unit: 'V',
    minValue: 0,
    maxValue: 500,
    warningThreshold: 0.5,
    criticalThreshold: 1.0,
  },
  current: {
    name: '电流',
    unit: 'A',
    minValue: 0,
    maxValue: 100,
    warningThreshold: 0.1,
    criticalThreshold: 0.2,
  },
};

// 趋势分析结果
export interface TrendAnalysisResult {
  parameterType: CalibrationParameterType;
  dataPoints: number;
  mean: number;
  standardDeviation: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendSlope: number;
  lastValue: number;
  minValue: number;
  maxValue: number;
  warningCount: number;
  criticalCount: number;
  recommendation: string;
}

// 校准数据点
export interface CalibrationDataPoint {
  timestamp: Date;
  value: number;
  deviceId: string;
  parameterType: CalibrationParameterType;
}

/**
 * 分析校准趋势
 */
export function analyzeCalibrationTrend(
  data: CalibrationDataPoint[],
  parameterType: CalibrationParameterType
): TrendAnalysisResult {
  const config = CALIBRATION_PARAMETER_CONFIG[parameterType];
  
  if (data.length === 0) {
    return {
      parameterType,
      dataPoints: 0,
      mean: 0,
      standardDeviation: 0,
      trend: 'stable',
      trendSlope: 0,
      lastValue: 0,
      minValue: 0,
      maxValue: 0,
      warningCount: 0,
      criticalCount: 0,
      recommendation: '无数据可分析',
    };
  }

  const values = data.map(d => d.value);
  const n = values.length;
  
  // 计算均值
  const mean = values.reduce((a, b) => a + b, 0) / n;
  
  // 计算标准差
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);
  
  // 计算趋势（简单线性回归）
  const xMean = (n - 1) / 2;
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - mean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const trendSlope = denominator !== 0 ? numerator / denominator : 0;
  
  // 确定趋势方向
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(trendSlope) < 0.01) {
    trend = 'stable';
  } else if (trendSlope > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }
  
  // 计算警告和严重计数
  let warningCount = 0;
  let criticalCount = 0;
  
  for (const value of values) {
    const deviation = Math.abs(value - mean);
    if (deviation >= config.criticalThreshold) {
      criticalCount++;
    } else if (deviation >= config.warningThreshold) {
      warningCount++;
    }
  }
  
  // 生成建议
  let recommendation = '';
  if (criticalCount > 0) {
    recommendation = `发现${criticalCount}个严重偏差，建议立即检查设备`;
  } else if (warningCount > n * 0.1) {
    recommendation = `警告偏差较多（${warningCount}个），建议安排维护`;
  } else if (trend === 'increasing' && trendSlope > config.warningThreshold) {
    recommendation = '参数呈上升趋势，建议关注';
  } else if (trend === 'decreasing' && Math.abs(trendSlope) > config.warningThreshold) {
    recommendation = '参数呈下降趋势，建议关注';
  } else {
    recommendation = '参数稳定，无需特别关注';
  }
  
  return {
    parameterType,
    dataPoints: n,
    mean,
    standardDeviation,
    trend,
    trendSlope,
    lastValue: values[n - 1],
    minValue: Math.min(...values),
    maxValue: Math.max(...values),
    warningCount,
    criticalCount,
    recommendation,
  };
}

/**
 * 批量分析多个参数的趋势
 */
export function analyzeMultipleParameters(
  data: CalibrationDataPoint[]
): Record<CalibrationParameterType, TrendAnalysisResult> {
  const result: Partial<Record<CalibrationParameterType, TrendAnalysisResult>> = {};
  
  const parameterTypes = Object.keys(CALIBRATION_PARAMETER_CONFIG) as CalibrationParameterType[];
  
  for (const parameterType of parameterTypes) {
    const filteredData = data.filter(d => d.parameterType === parameterType);
    result[parameterType] = analyzeCalibrationTrend(filteredData, parameterType);
  }
  
  return result as Record<CalibrationParameterType, TrendAnalysisResult>;
}

/**
 * 生成校准报告
 */
export function generateCalibrationReport(
  deviceId: string,
  analysisResults: Record<CalibrationParameterType, TrendAnalysisResult>
): string {
  let report = `# 设备校准分析报告\n\n`;
  report += `设备ID: ${deviceId}\n`;
  report += `生成时间: ${new Date().toISOString()}\n\n`;
  
  for (const [paramType, result] of Object.entries(analysisResults)) {
    const config = CALIBRATION_PARAMETER_CONFIG[paramType as CalibrationParameterType];
    report += `## ${config.name}\n\n`;
    report += `- 数据点数: ${result.dataPoints}\n`;
    report += `- 均值: ${result.mean.toFixed(2)} ${config.unit}\n`;
    report += `- 标准差: ${result.standardDeviation.toFixed(2)}\n`;
    report += `- 趋势: ${result.trend}\n`;
    report += `- 建议: ${result.recommendation}\n\n`;
  }
  
  return report;
}
