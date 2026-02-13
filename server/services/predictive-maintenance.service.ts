// ==================== 预测性维护AI模型服务 ====================

// ---------- Types ----------

interface SensorReading {
  sensorId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: number;
  quality: 'good' | 'bad' | 'uncertain';
}

interface DeviceDataPoint {
  deviceId: string;
  timestamp: number;
  readings: SensorReading[];
  operatingMode: string;
  runningHours: number;
  cycleCount: number;
}

interface FeatureVector {
  deviceId: string;
  timestamp: number;
  features: Record<string, number>;
  labels?: Record<string, number>;
}

interface FeatureStats {
  mean: Record<string, number>;
  std: Record<string, number>;
}

interface PredictionModel {
  name: string;
  type: 'classification' | 'regression';
  targetLabel: string;
  features: string[];
  weights: number[];
  bias: number;
  accuracy?: number;
  trainedAt?: number;
  trainingDataSize?: number;
}

interface TrainingConfig {
  epochs: number;
  learningRate: number;
  batchSize: number;
  validationSplit: number;
}

interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
  mae: number;
  confusionMatrix: number[][];
}

interface FailurePrediction {
  failureType: string;
  probability: number;
  estimatedTimeToFailure: number;
  confidence: number;
  contributingFactors: Array<{ factor: string; impact: number }>;
  recommendedActions: string[];
}

interface HealthAssessment {
  deviceId: string;
  timestamp: number;
  overallScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  componentScores: Array<{ component: string; score: number }>;
  trends: Array<{ metric: string; direction: string; rate: number }>;
  alerts: Array<{ type: string; message: string; severity: string }>;
}

interface MaintenanceRecommendation {
  deviceId: string;
  type: 'preventive' | 'corrective' | 'predictive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requiredParts: string[];
  estimatedDuration: number;
  scheduledDate: number;
  cost: number;
}

interface RULResult {
  rul: number;
  confidence: number;
  degradationCurve: Array<{ time: number; degradation: number }>;
}

interface AnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number;
  anomalousFeatures: Array<{ feature: string; value: number; expected: number; deviation: number }>;
}

// ---------- Constants ----------

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 100,
  learningRate: 0.01,
  batchSize: 32,
  validationSplit: 0.2,
};

export const HEALTH_THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 50,
  poor: 25,
  critical: 0,
};

// ---------- Feature Engineering ----------

export function extractFeatures(dataPoints: DeviceDataPoint[]): FeatureVector[] {
  return dataPoints.map((dp) => {
    const features: Record<string, number> = {};

    // Base features
    features.running_hours = dp.runningHours;
    features.cycle_count = dp.cycleCount;

    // Sensor reading features
    for (const reading of dp.readings) {
      features[`${reading.sensorType}_value`] = reading.value;
    }

    return {
      deviceId: dp.deviceId,
      timestamp: dp.timestamp,
      features,
    };
  });
}

export function calculateStatisticalFeatures(
  readings: SensorReading[]
): Record<string, number> {
  const grouped: Record<string, number[]> = {};

  for (const reading of readings) {
    if (!grouped[reading.sensorType]) {
      grouped[reading.sensorType] = [];
    }
    grouped[reading.sensorType].push(reading.value);
  }

  const stats: Record<string, number> = {};

  for (const [sensorType, values] of Object.entries(grouped)) {
    const sum = values.reduce((a, b) => a + b, 0);
    stats[`${sensorType}_mean`] = sum / values.length;
    stats[`${sensorType}_max`] = Math.max(...values);
    stats[`${sensorType}_min`] = Math.min(...values);
    const mean = sum / values.length;
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
    stats[`${sensorType}_std`] = Math.sqrt(variance);
  }

  return stats;
}

export function normalizeFeatures(
  features: Record<string, number>,
  stats: FeatureStats
): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const key of Object.keys(features)) {
    const mean = stats.mean[key] ?? 0;
    const std = stats.std[key] ?? 1;
    normalized[key] = std === 0 ? 0 : (features[key] - mean) / std;
  }

  return normalized;
}

export function calculateFeatureStats(featureVectors: FeatureVector[]): FeatureStats {
  if (featureVectors.length === 0) {
    return { mean: {}, std: {} };
  }

  const allKeys = Object.keys(featureVectors[0].features);
  const mean: Record<string, number> = {};
  const std: Record<string, number> = {};

  for (const key of allKeys) {
    const values = featureVectors.map((fv) => fv.features[key]);
    const sum = values.reduce((a, b) => a + b, 0);
    mean[key] = sum / values.length;

    const variance =
      values.reduce((acc, v) => acc + (v - mean[key]) ** 2, 0) / values.length;
    std[key] = Math.sqrt(variance);
  }

  return { mean, std };
}

// ---------- Model Training ----------

export function createPredictionModel(
  name: string,
  type: 'classification' | 'regression',
  targetLabel: string,
  features: string[]
): PredictionModel {
  return {
    name,
    type,
    targetLabel,
    features,
    weights: new Array(features.length).fill(0),
    bias: 0,
  };
}

function sigmoid(x: number): number {
  if (x > 500) return 1;
  if (x < -500) return 0;
  return 1 / (1 + Math.exp(-x));
}

export function trainModel(
  model: PredictionModel,
  trainingData: FeatureVector[],
  config: TrainingConfig
): { model: PredictionModel; metrics: TrainingMetrics; history: Array<{ epoch: number; loss: number }> } {
  const trainedModel: PredictionModel = {
    ...model,
    weights: [...model.weights],
    bias: model.bias,
  };

  const history: Array<{ epoch: number; loss: number }> = [];

  // Simple gradient descent training (logistic regression)
  for (let epoch = 0; epoch < config.epochs; epoch++) {
    let totalLoss = 0;

    for (const sample of trainingData) {
      const featureValues = trainedModel.features.map(
        (f) => sample.features[f] ?? 0
      );
      const label = sample.labels?.[trainedModel.targetLabel] ?? 0;

      // Forward pass
      const z =
        featureValues.reduce((sum, val, i) => sum + val * trainedModel.weights[i], 0) +
        trainedModel.bias;
      const prediction = sigmoid(z);

      // Loss (binary cross-entropy)
      const eps = 1e-15;
      const clipped = Math.max(eps, Math.min(1 - eps, prediction));
      totalLoss += -(label * Math.log(clipped) + (1 - label) * Math.log(1 - clipped));

      // Backward pass
      const error = prediction - label;
      for (let i = 0; i < trainedModel.weights.length; i++) {
        trainedModel.weights[i] -= config.learningRate * error * featureValues[i];
      }
      trainedModel.bias -= config.learningRate * error;
    }

    history.push({ epoch, loss: totalLoss / trainingData.length });
  }

  trainedModel.trainedAt = Date.now();
  trainedModel.trainingDataSize = trainingData.length;

  // Compute metrics on training data
  let tp = 0, fp = 0, tn = 0, fn = 0;
  let mseSum = 0;
  let maeSum = 0;

  for (const sample of trainingData) {
    const featureValues = trainedModel.features.map(
      (f) => sample.features[f] ?? 0
    );
    const label = sample.labels?.[trainedModel.targetLabel] ?? 0;
    const z =
      featureValues.reduce((sum, val, i) => sum + val * trainedModel.weights[i], 0) +
      trainedModel.bias;
    const prediction = sigmoid(z);
    const predicted = prediction >= 0.5 ? 1 : 0;

    if (predicted === 1 && label === 1) tp++;
    else if (predicted === 1 && label === 0) fp++;
    else if (predicted === 0 && label === 0) tn++;
    else fn++;

    mseSum += (prediction - label) ** 2;
    maeSum += Math.abs(prediction - label);
  }

  const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const metrics: TrainingMetrics = {
    accuracy,
    precision,
    recall,
    f1Score,
    auc: accuracy, // simplified approximation
    mse: mseSum / trainingData.length,
    mae: maeSum / trainingData.length,
    confusionMatrix: [[tn, fp], [fn, tp]],
  };

  trainedModel.accuracy = accuracy;

  return { model: trainedModel, metrics, history };
}

// ---------- Prediction Engine ----------

export function predict(model: PredictionModel, featureVector: FeatureVector): number {
  const featureValues = model.features.map((f) => featureVector.features[f] ?? 0);
  const z =
    featureValues.reduce((sum, val, i) => sum + val * model.weights[i], 0) + model.bias;
  return sigmoid(z);
}

export function batchPredict(
  model: PredictionModel,
  featureVectors: FeatureVector[]
): number[] {
  return featureVectors.map((fv) => predict(model, fv));
}

export function generateFailurePrediction(
  model: PredictionModel,
  featureVector: FeatureVector,
  failureType: string,
  historicalData: DeviceDataPoint[]
): FailurePrediction {
  const probability = predict(model, featureVector);
  const confidence = model.accuracy ?? 0.5;

  // Estimate time to failure based on probability
  // Higher probability => shorter time
  const maxTimeMs = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  const estimatedTimeToFailure = Math.max(
    3600000,
    maxTimeMs * (1 - probability)
  );

  // Contributing factors from feature importance (weight magnitude)
  const contributingFactors = model.features.map((f, i) => ({
    factor: f,
    impact: Math.abs(model.weights[i]),
  }));
  contributingFactors.sort((a, b) => b.impact - a.impact);

  // Recommended actions based on failure type
  const actionMap: Record<string, string[]> = {
    thermal: ['检查冷却系统', '清洁散热器', '降低运行负荷', '检查环境温度'],
    mechanical: ['检查轴承', '润滑运动部件', '检查振动水平', '更换磨损零件'],
    electrical: ['检查电气连接', '测试绝缘电阻', '检查电源质量', '更换老化电缆'],
    chemical: ['检查腐蚀情况', '更换密封件', '检查化学品浓度', '清洁反应容器'],
  };

  const recommendedActions = actionMap[failureType] ?? [
    '安排设备检查',
    '查看维护日志',
    '联系设备供应商',
  ];

  return {
    failureType,
    probability,
    estimatedTimeToFailure,
    confidence,
    contributingFactors,
    recommendedActions,
  };
}

// ---------- Health Assessment ----------

export function assessDeviceHealth(
  deviceId: string,
  currentData: DeviceDataPoint,
  historicalData: DeviceDataPoint[],
  predictions: FailurePrediction[]
): HealthAssessment {
  const timestamp = Date.now();

  // Calculate component scores based on sensor readings vs historical
  const componentScores: Array<{ component: string; score: number }> = [];
  const alerts: Array<{ type: string; message: string; severity: string }> = [];
  const trends: Array<{ metric: string; direction: string; rate: number }> = [];

  // Gather historical stats per sensor type
  const historicalByType: Record<string, number[]> = {};
  for (const dp of historicalData) {
    for (const r of dp.readings) {
      if (!historicalByType[r.sensorType]) {
        historicalByType[r.sensorType] = [];
      }
      historicalByType[r.sensorType].push(r.value);
    }
  }

  let totalScore = 0;
  let scoreCount = 0;

  for (const reading of currentData.readings) {
    const histValues = historicalByType[reading.sensorType] ?? [];
    let score = 80; // default decent score

    if (histValues.length > 0) {
      const mean = histValues.reduce((a, b) => a + b, 0) / histValues.length;
      const variance =
        histValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / histValues.length;
      const std = Math.sqrt(variance) || 1;

      // Score decreases with deviation from mean
      const deviation = Math.abs(reading.value - mean) / std;
      score = Math.max(0, Math.min(100, 100 - deviation * 15));

      if (deviation > 2) {
        alerts.push({
          type: reading.sensorType,
          message: `${reading.sensorType} 偏离正常值 ${deviation.toFixed(1)} 个标准差`,
          severity: deviation > 3 ? 'high' : 'medium',
        });
      }

      // Trend analysis: compare recent vs earlier readings
      if (histValues.length >= 4) {
        const midpoint = Math.floor(histValues.length / 2);
        const earlyMean =
          histValues.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
        const lateMean =
          histValues.slice(midpoint).reduce((a, b) => a + b, 0) /
          (histValues.length - midpoint);
        const rate = lateMean - earlyMean;
        trends.push({
          metric: reading.sensorType,
          direction: rate > 0 ? 'increasing' : rate < 0 ? 'decreasing' : 'stable',
          rate: Math.abs(rate),
        });
      }
    }

    componentScores.push({ component: reading.sensorType, score });
    totalScore += score;
    scoreCount++;
  }

  // Factor in running hours degradation
  const hoursDegradation = Math.min(20, currentData.runningHours / 1000);
  const baseScore = scoreCount > 0 ? totalScore / scoreCount : 80;
  const overallScore = Math.max(0, Math.min(100, baseScore - hoursDegradation));

  // Factor in failure predictions
  let predictionPenalty = 0;
  for (const pred of predictions) {
    predictionPenalty += pred.probability * 20;
  }
  const finalScore = Math.max(0, Math.min(100, overallScore - predictionPenalty));

  // Determine status
  let status: HealthAssessment['status'];
  if (finalScore >= HEALTH_THRESHOLDS.excellent) {
    status = 'excellent';
  } else if (finalScore >= HEALTH_THRESHOLDS.good) {
    status = 'good';
  } else if (finalScore >= HEALTH_THRESHOLDS.fair) {
    status = 'fair';
  } else if (finalScore >= HEALTH_THRESHOLDS.poor) {
    status = 'poor';
  } else {
    status = 'critical';
  }

  return {
    deviceId,
    timestamp,
    overallScore: Math.round(finalScore * 100) / 100,
    status,
    componentScores,
    trends,
    alerts,
  };
}

// ---------- Maintenance Recommendation ----------

export function generateMaintenanceRecommendation(
  deviceId: string,
  prediction: FailurePrediction,
  healthAssessment: HealthAssessment
): MaintenanceRecommendation {
  // Determine type based on probability
  let type: MaintenanceRecommendation['type'];
  if (prediction.probability >= 0.5) {
    type = 'corrective';
  } else if (prediction.probability >= 0.3) {
    type = 'predictive';
  } else {
    type = 'preventive';
  }

  // Determine priority based on health score and probability
  let priority: MaintenanceRecommendation['priority'];
  if (healthAssessment.overallScore < HEALTH_THRESHOLDS.poor || prediction.probability >= 0.8) {
    priority = 'critical';
  } else if (healthAssessment.overallScore < HEALTH_THRESHOLDS.fair || prediction.probability >= 0.6) {
    priority = 'high';
  } else if (healthAssessment.overallScore < HEALTH_THRESHOLDS.good || prediction.probability >= 0.4) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  // Required parts based on failure type
  const partsMap: Record<string, string[]> = {
    mechanical: ['轴承', '密封件', '润滑油', '联轴器'],
    thermal: ['冷却液', '风扇', '散热片', '温度传感器'],
    electrical: ['保险丝', '继电器', '电缆', '接触器'],
    chemical: ['密封垫片', '防腐涂料', '过滤器', '化学品'],
  };
  const requiredParts = partsMap[prediction.failureType] ?? ['通用备件', '工具套件'];

  // Description
  const description = `设备 ${deviceId} 检测到 ${prediction.failureType} 类型故障风险 (概率: ${(prediction.probability * 100).toFixed(1)}%)，` +
    `健康评分: ${healthAssessment.overallScore}，状态: ${healthAssessment.status}。` +
    `建议采取 ${type === 'corrective' ? '纠正性' : type === 'predictive' ? '预测性' : '预防性'} 维护措施。`;

  // Estimated duration (hours) - higher risk = longer maintenance
  const estimatedDuration = prediction.probability >= 0.7 ? 8 : prediction.probability >= 0.4 ? 4 : 2;

  // Schedule date - sooner for higher priority
  const daysToSchedule =
    priority === 'critical' ? 1 :
    priority === 'high' ? 3 :
    priority === 'medium' ? 7 : 14;
  const scheduledDate = Date.now() + daysToSchedule * 24 * 60 * 60 * 1000;

  // Estimated cost
  const cost =
    priority === 'critical' ? 50000 :
    priority === 'high' ? 30000 :
    priority === 'medium' ? 15000 : 5000;

  return {
    deviceId,
    type,
    priority,
    description,
    requiredParts,
    estimatedDuration,
    scheduledDate,
    cost,
  };
}

// ---------- Remaining Useful Life ----------

export function predictRemainingUsefulLife(
  deviceId: string,
  historicalData: DeviceDataPoint[],
  model: PredictionModel
): RULResult {
  const confidence = model.accuracy ?? 0.5;

  // Extract degradation trend from running hours
  const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

  // Build degradation curve - estimate degradation level at each point
  const degradationCurve: Array<{ time: number; degradation: number }> = [];

  for (const dp of sortedData) {
    const featureVector: FeatureVector = {
      deviceId,
      timestamp: dp.timestamp,
      features: { running_hours: dp.runningHours },
    };

    // For features not in model, set to 0
    for (const f of model.features) {
      if (!(f in featureVector.features)) {
        featureVector.features[f] = 0;
      }
    }

    const degradation = predict(model, featureVector);
    degradationCurve.push({ time: dp.timestamp, degradation });
  }

  // Estimate RUL based on degradation trend
  let rul: number;
  if (degradationCurve.length >= 2) {
    const lastDeg = degradationCurve[degradationCurve.length - 1].degradation;
    const firstDeg = degradationCurve[0].degradation;
    const timeSpan =
      degradationCurve[degradationCurve.length - 1].time - degradationCurve[0].time;

    const degradationRate = (lastDeg - firstDeg) / timeSpan;

    if (degradationRate > 0) {
      // Time until degradation reaches 1.0 (failure threshold)
      const remaining = (1.0 - lastDeg) / degradationRate;
      rul = Math.max(0, remaining);
    } else {
      // No degradation trend or improving - long RUL
      rul = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
    }
  } else {
    rul = 365 * 24 * 60 * 60 * 1000;
  }

  return { rul, confidence, degradationCurve };
}

// ---------- Anomaly Detection ----------

export function detectAnomalies(
  currentData: DeviceDataPoint,
  historicalData: DeviceDataPoint[]
): AnomalyResult {
  const anomalousFeatures: Array<{ feature: string; value: number; expected: number; deviation: number }> = [];

  // Gather historical sensor stats
  const historicalByType: Record<string, number[]> = {};
  for (const dp of historicalData) {
    for (const r of dp.readings) {
      if (!historicalByType[r.sensorType]) {
        historicalByType[r.sensorType] = [];
      }
      historicalByType[r.sensorType].push(r.value);
    }
  }

  let maxDeviation = 0;

  for (const reading of currentData.readings) {
    const histValues = historicalByType[reading.sensorType] ?? [];
    if (histValues.length === 0) continue;

    const mean = histValues.reduce((a, b) => a + b, 0) / histValues.length;
    const variance =
      histValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / histValues.length;
    const std = Math.sqrt(variance) || 1;

    const deviation = Math.abs(reading.value - mean) / std;

    if (deviation > 2) {
      anomalousFeatures.push({
        feature: reading.sensorType,
        value: reading.value,
        expected: mean,
        deviation,
      });
    }

    maxDeviation = Math.max(maxDeviation, deviation);
  }

  // Also check running hours and cycle count anomalies
  const historicalHours = historicalData.map((dp) => dp.runningHours);
  const historicalCycles = historicalData.map((dp) => dp.cycleCount);

  if (historicalHours.length > 0) {
    const hoursMean = historicalHours.reduce((a, b) => a + b, 0) / historicalHours.length;
    const hoursVariance =
      historicalHours.reduce((acc, v) => acc + (v - hoursMean) ** 2, 0) / historicalHours.length;
    const hoursStd = Math.sqrt(hoursVariance) || 1;
    const hoursDeviation = Math.abs(currentData.runningHours - hoursMean) / hoursStd;
    if (hoursDeviation > 2) {
      anomalousFeatures.push({
        feature: 'running_hours',
        value: currentData.runningHours,
        expected: hoursMean,
        deviation: hoursDeviation,
      });
    }
    maxDeviation = Math.max(maxDeviation, hoursDeviation);
  }

  // Anomaly score: normalized deviation (0-1 range)
  const anomalyScore = Math.min(1, maxDeviation / 5);
  const isAnomaly = anomalousFeatures.length > 0 || maxDeviation > 2;

  return { isAnomaly, anomalyScore, anomalousFeatures };
}

// ---------- Model Persistence ----------

export function serializeModel(model: PredictionModel): string {
  return JSON.stringify(model);
}

export function deserializeModel(serialized: string): PredictionModel {
  return JSON.parse(serialized) as PredictionModel;
}

export function exportModelReport(model: PredictionModel, metrics: TrainingMetrics): string {
  const lines: string[] = [];

  lines.push('========================================');
  lines.push('        模型评估报告');
  lines.push('========================================');
  lines.push('');
  lines.push(`模型名称: ${model.name}`);
  lines.push(`模型类型: ${model.type}`);
  lines.push(`目标标签: ${model.targetLabel}`);
  lines.push(`特征数量: ${model.features.length}`);
  lines.push(`特征列表: ${model.features.join(', ')}`);
  lines.push(`权重: ${model.weights.map((w) => w.toFixed(4)).join(', ')}`);
  lines.push(`偏置: ${model.bias}`);
  lines.push('');

  if (model.trainedAt) {
    lines.push(`训练时间: ${new Date(model.trainedAt).toISOString()}`);
  }
  if (model.trainingDataSize) {
    lines.push(`训练数据量: ${model.trainingDataSize}`);
  }

  lines.push('');
  lines.push('-------- 评估指标 --------');
  lines.push(`准确率 (Accuracy): ${(metrics.accuracy * 100).toFixed(2)}%`);
  lines.push(`精确率 (Precision): ${(metrics.precision * 100).toFixed(2)}%`);
  lines.push(`召回率 (Recall): ${(metrics.recall * 100).toFixed(2)}%`);
  lines.push(`F1 分数: ${(metrics.f1Score * 100).toFixed(2)}%`);
  lines.push(`AUC: ${(metrics.auc * 100).toFixed(2)}%`);
  lines.push(`MSE: ${metrics.mse.toFixed(4)}`);
  lines.push(`MAE: ${metrics.mae.toFixed(4)}`);
  lines.push('');
  lines.push('-------- 混淆矩阵 --------');
  for (const row of metrics.confusionMatrix) {
    lines.push(`  ${row.map((v) => String(v).padStart(6)).join('  ')}`);
  }
  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}
