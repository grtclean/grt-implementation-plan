/**
 * Cost Prediction AI Service
 * Stub implementation for v2.5.4 cost prediction AI tests
 */

interface TrainingDataPoint {
  timestamp: number;
  cost: number;
  features: Record<string, number>;
}

interface PredictionResult {
  timestamp: number;
  predictedCost: number;
  confidence: number;
}

interface ModelInfo {
  trainedAt: number;
  dataPoints: number;
  features: string[];
  modelType: string;
}

interface CostPredictor {
  train: (data: TrainingDataPoint[]) => void;
  predict: (steps: number) => PredictionResult[];
  getModel: () => ModelInfo;
}

interface AnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number;
  zScore: number;
}

interface TrendResult {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  confidence: number;
}

export function createCostPredictor(config: {
  modelType: string;
  features: string[];
}): CostPredictor {
  let trainingData: TrainingDataPoint[] = [];
  let trainedAt = 0;

  return {
    train(data: TrainingDataPoint[]) {
      trainingData = [...data];
      trainedAt = Date.now();
    },

    predict(steps: number): PredictionResult[] {
      if (trainingData.length === 0) {
        return [];
      }

      const results: PredictionResult[] = [];
      const lastTimestamp = trainingData[trainingData.length - 1].timestamp;
      const avgCost = trainingData.reduce((sum, d) => sum + d.cost, 0) / trainingData.length;

      // Simple linear extrapolation
      let slope = 0;
      if (trainingData.length >= 2) {
        const n = trainingData.length;
        const first = trainingData[0];
        const last = trainingData[n - 1];
        if (last.timestamp !== first.timestamp) {
          slope = (last.cost - first.cost) / (last.timestamp - first.timestamp);
        }
      }

      const timeStep = trainingData.length >= 2
        ? (trainingData[trainingData.length - 1].timestamp - trainingData[0].timestamp) / (trainingData.length - 1)
        : 1000;

      for (let i = 1; i <= steps; i++) {
        const timestamp = lastTimestamp + timeStep * i;
        const predictedCost = avgCost + slope * timeStep * i;
        results.push({
          timestamp,
          predictedCost: Math.max(0, predictedCost),
          confidence: Math.max(0.5, 1 - i * 0.1),
        });
      }

      return results;
    },

    getModel(): ModelInfo {
      return {
        trainedAt,
        dataPoints: trainingData.length,
        features: config.features,
        modelType: config.modelType,
      };
    },
  };
}

export function detectAnomalyZScore(
  value: number,
  historicalData: number[],
  threshold: number
): AnomalyResult {
  if (historicalData.length === 0) {
    return { isAnomaly: false, anomalyScore: 0, zScore: 0 };
  }

  const mean = historicalData.reduce((sum, v) => sum + v, 0) / historicalData.length;
  const variance = historicalData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / historicalData.length;
  const std = Math.sqrt(variance);

  if (std === 0) {
    const zScore = value === mean ? 0 : Infinity;
    return {
      isAnomaly: value !== mean,
      anomalyScore: value !== mean ? 1 : 0,
      zScore,
    };
  }

  const zScore = Math.abs((value - mean) / std);

  return {
    isAnomaly: zScore > threshold,
    anomalyScore: Math.min(zScore / (threshold * 2), 1),
    zScore,
  };
}

export function analyzeTrend(data: number[]): TrendResult {
  if (data.length < 2) {
    return { direction: 'stable', slope: 0, confidence: 0 };
  }

  // Simple linear regression: y = slope * x + intercept
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Calculate R-squared for confidence
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + (meanY - slope * (n - 1) / 2);
    ssRes += Math.pow(data[i] - predicted, 2);
    ssTot += Math.pow(data[i] - meanY, 2);
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  let direction: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < 0.001) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  return {
    direction,
    slope,
    confidence: Math.abs(r2),
  };
}
