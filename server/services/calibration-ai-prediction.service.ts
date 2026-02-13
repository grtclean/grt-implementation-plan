/**
 * Calibration AI Prediction Service
 * Provides AI-based prediction for calibration scheduling and anomaly detection
 */

export interface CalibrationDataPoint {
  timestamp: number;
  value: number;
  targetValue: number;
  tolerance: number;
  passed: boolean;
}

export interface CalibrationPrediction {
  date: number;
  confidence: number;
  daysUntil: number;
}

export interface AnomalyRiskResult {
  risk: 'low' | 'medium' | 'high';
  probability: number;
}

/**
 * Predict the next calibration date based on historical data points.
 */
export function predictNextCalibration(
  dataPoints: CalibrationDataPoint[],
  parameter: string
): CalibrationPrediction {
  if (dataPoints.length === 0) {
    // With no data, return a low-confidence prediction in the future
    const futureDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return {
      date: futureDate,
      confidence: 0.2,
      daysUntil: 30,
    };
  }

  if (dataPoints.length === 1) {
    // With a single record, predict from now + a default calibration interval
    const defaultInterval = 45 * 24 * 60 * 60 * 1000;
    const futureDate = Math.max(
      dataPoints[0].timestamp + defaultInterval,
      Date.now() + 1 * 24 * 60 * 60 * 1000 // at least 1 day in the future
    );
    const daysUntil = Math.round((futureDate - Date.now()) / (24 * 60 * 60 * 1000));
    return {
      date: futureDate,
      confidence: 0.3,
      daysUntil,
    };
  }

  // Calculate average interval between data points
  const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp - b.timestamp);
  let totalInterval = 0;
  for (let i = 1; i < sortedPoints.length; i++) {
    totalInterval += sortedPoints[i].timestamp - sortedPoints[i - 1].timestamp;
  }
  const avgInterval = totalInterval / (sortedPoints.length - 1);

  // Detect drift from target value
  const latestPoint = sortedPoints[sortedPoints.length - 1];
  const drift = Math.abs(latestPoint.value - latestPoint.targetValue);
  const driftRatio = drift / latestPoint.tolerance;

  // If drifting, shorten the interval
  const adjustedInterval = avgInterval * Math.max(0.5, 1 - driftRatio * 0.5);

  const predictedDate = latestPoint.timestamp + adjustedInterval;
  const daysUntil = Math.round((predictedDate - Date.now()) / (24 * 60 * 60 * 1000));

  // Confidence based on data quantity and consistency
  const confidence = Math.min(0.95, 0.5 + dataPoints.length * 0.08);

  return {
    date: predictedDate,
    confidence,
    daysUntil,
  };
}

/**
 * Detect trend in a series of values.
 */
export function detectTrend(
  values: number[]
): 'stable' | 'increasing' | 'decreasing' | 'volatile' {
  if (values.length < 2) {
    return 'stable';
  }

  let increases = 0;
  let decreases = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) {
      increases++;
    } else if (values[i] < values[i - 1]) {
      decreases++;
    }
  }

  const total = values.length - 1;
  const increaseRatio = increases / total;
  const decreaseRatio = decreases / total;

  if (increaseRatio > 0.6) return 'increasing';
  if (decreaseRatio > 0.6) return 'decreasing';
  if (increaseRatio > 0.3 && decreaseRatio > 0.3) return 'volatile';
  return 'stable';
}

/**
 * Predict anomaly risk based on calibration data.
 */
export function predictAnomalyRisk(
  dataPoints: CalibrationDataPoint[],
  parameter: string
): AnomalyRiskResult {
  if (dataPoints.length === 0) {
    return { risk: 'low', probability: 0.1 };
  }

  // Calculate drift trend
  const drifts = dataPoints.map(
    (dp) => Math.abs(dp.value - dp.targetValue) / dp.tolerance
  );
  const avgDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
  const failureRate = dataPoints.filter((dp) => !dp.passed).length / dataPoints.length;

  let probability = avgDrift * 0.5 + failureRate * 0.5;
  probability = Math.min(1, Math.max(0, probability));

  let risk: 'low' | 'medium' | 'high';
  if (probability > 0.6) {
    risk = 'high';
  } else if (probability > 0.3) {
    risk = 'medium';
  } else {
    risk = 'low';
  }

  return { risk, probability };
}
