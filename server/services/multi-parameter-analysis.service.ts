/**
 * Multi-Parameter Analysis Service
 * Provides Pearson correlation, drift detection, synchronized drift detection,
 * and anomaly pattern detection for multi-parameter datasets.
 */

export interface ParameterDataPoint {
  timestamp: number;
  value: number;
  parameter: string;
}

export interface MultiParameterDataset {
  unitId: string;
  serialNumber: string;
  parameters: Record<string, ParameterDataPoint[]>;
  startTime: number;
  endTime: number;
}

export interface CorrelationResult {
  coefficient: number;
  pValue?: number;
}

export interface DriftDetectionResult {
  hasDrift: boolean;
  direction: 'up' | 'down' | 'stable';
  magnitude?: number;
  parameter?: string;
}

export interface AnomalyPattern {
  type: string;
  timestamp: number;
  parameters: string[];
  severity: string;
  description?: string;
}

/**
 * Calculate the Pearson correlation coefficient between two value arrays.
 */
export function calculatePearsonCorrelation(
  xValues: number[],
  yValues: number[]
): CorrelationResult {
  const n = xValues.length;
  if (n === 0 || n !== yValues.length) {
    return { coefficient: 0 };
  }

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
  const sumY2 = yValues.reduce((acc, y) => acc + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return { coefficient: 0 };

  return { coefficient: numerator / denominator };
}

/**
 * Detect drift in a series of parameter data points by checking for a consistent trend.
 */
export function detectDrift(data: ParameterDataPoint[]): DriftDetectionResult {
  if (data.length < 3) {
    return { hasDrift: false, direction: 'stable' };
  }

  const values = data.map((d) => d.value);
  const n = values.length;
  const firstHalfAvg =
    values.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b, 0) /
    Math.floor(n / 2);
  const secondHalfAvg =
    values.slice(Math.floor(n / 2)).reduce((a, b) => a + b, 0) /
    (n - Math.floor(n / 2));

  const diff = secondHalfAvg - firstHalfAvg;
  const threshold = firstHalfAvg * 0.05; // 5% threshold

  if (Math.abs(diff) > threshold) {
    return {
      hasDrift: true,
      direction: diff > 0 ? 'up' : 'down',
      magnitude: Math.abs(diff),
      parameter: data[0]?.parameter,
    };
  }

  return { hasDrift: false, direction: 'stable' };
}

/**
 * Detect synchronized drift across multiple parameters in a dataset.
 * Returns an array of DriftDetectionResult, one per non-empty parameter.
 */
export function detectSynchronizedDrift(
  dataset: MultiParameterDataset
): DriftDetectionResult[] {
  const results: DriftDetectionResult[] = [];

  for (const [paramName, dataPoints] of Object.entries(dataset.parameters)) {
    if (dataPoints.length > 0) {
      const drift = detectDrift(dataPoints);
      results.push({ ...drift, parameter: paramName });
    }
  }

  return results;
}

/**
 * Detect anomaly patterns across a multi-parameter dataset.
 * Uses a simple z-score approach to find outliers.
 */
export function detectAnomalyPatterns(
  dataset: MultiParameterDataset
): AnomalyPattern[] {
  const anomalies: AnomalyPattern[] = [];

  for (const [paramName, dataPoints] of Object.entries(dataset.parameters)) {
    if (dataPoints.length < 3) continue;

    const values = dataPoints.map((d) => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
    );

    if (stdDev === 0) continue;

    for (const dp of dataPoints) {
      const zScore = Math.abs((dp.value - mean) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          type: 'outlier',
          timestamp: dp.timestamp,
          parameters: [paramName],
          severity: zScore > 3 ? 'high' : 'medium',
          description: `Anomaly detected in ${paramName}: value ${dp.value} deviates ${zScore.toFixed(1)} standard deviations from mean`,
        });
      }
    }
  }

  return anomalies;
}
