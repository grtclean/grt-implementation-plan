/**
 * Online Learning Service
 * SGD, Adam, gradient computation, Welford statistics, drift detection,
 * model versioning, online learning models, and ensembles.
 */

// ==================== SGD & Adam ====================

export function sgdUpdate(
  weights: number[],
  gradient: number[],
  learningRate: number
): { weights: number[] } {
  const newWeights = weights.map((w, i) => w - learningRate * gradient[i]);
  return { weights: newWeights };
}

export function adamUpdate(
  weights: number[],
  gradient: number[],
  m: number[],
  v: number[],
  t: number,
  learningRate: number = 0.001,
  beta1: number = 0.9,
  beta2: number = 0.999,
  epsilon: number = 1e-8
): { weights: number[]; m: number[]; v: number[] } {
  const newM = m.map((mi, i) => beta1 * mi + (1 - beta1) * gradient[i]);
  const newV = v.map((vi, i) => beta2 * vi + (1 - beta2) * gradient[i] * gradient[i]);

  const mHat = newM.map(mi => mi / (1 - Math.pow(beta1, t)));
  const vHat = newV.map(vi => vi / (1 - Math.pow(beta2, t)));

  const newWeights = weights.map((w, i) => w - learningRate * mHat[i] / (Math.sqrt(vHat[i]) + epsilon));

  return { weights: newWeights, m: newM, v: newV };
}

// ==================== Gradient Computation ====================

export function computeLinearGradient(
  features: number[],
  label: number,
  weights: number[],
  bias: number
): { weightGradient: number[]; biasGradient: number } {
  // prediction = weights . features + bias
  let prediction = bias;
  for (let i = 0; i < features.length; i++) {
    prediction += weights[i] * features[i];
  }
  const error = prediction - label;

  const weightGradient = features.map(f => error * f);
  const biasGradient = error;

  return { weightGradient, biasGradient };
}

export function computeLogisticGradient(
  features: number[],
  label: number,
  weights: number[],
  bias: number
): { weightGradient: number[]; biasGradient: number } {
  let z = bias;
  for (let i = 0; i < features.length; i++) {
    z += weights[i] * features[i];
  }
  const prediction = 1 / (1 + Math.exp(-z));
  const error = prediction - label;

  const weightGradient = features.map(f => error * f);
  const biasGradient = error;

  return { weightGradient, biasGradient };
}

// ==================== Welford Online Statistics ====================

export function welfordUpdate(
  count: number,
  mean: number,
  m2: number,
  value: number
): { count: number; mean: number; m2: number } {
  count++;
  const delta = value - mean;
  mean += delta / count;
  const delta2 = value - mean;
  m2 += delta * delta2;
  return { count, mean, m2 };
}

// ==================== Feature Statistics ====================

interface FeatureStats {
  featureIndex: number;
  count: number;
  mean: number;
  m2: number;
  min: number;
  max: number;
}

export function initializeFeatureStats(numFeatures: number): FeatureStats[] {
  return Array.from({ length: numFeatures }, (_, i) => ({
    featureIndex: i,
    count: 0,
    mean: 0,
    m2: 0,
    min: Infinity,
    max: -Infinity,
  }));
}

export function updateFeatureStats(stats: FeatureStats, value: number): FeatureStats {
  const { count, mean, m2 } = welfordUpdate(stats.count, stats.mean, stats.m2, value);
  return {
    ...stats,
    count,
    mean,
    m2,
    min: Math.min(stats.min, value),
    max: Math.max(stats.max, value),
  };
}

// ==================== Drift Detection ====================

export function createPageHinkleyDetector(threshold: number = 50, delta: number = 0.005) {
  let sum = 0;
  let minSum = 0;
  let count = 0;
  let mean = 0;

  return {
    update(value: number): { driftDetected: boolean; statistic: number } {
      count++;
      mean += (value - mean) / count;
      sum += value - mean - delta;
      if (sum < minSum) minSum = sum;
      const phStat = sum - minSum;
      return { driftDetected: phStat > threshold, statistic: phStat };
    },

    reset(): void {
      sum = 0;
      minSum = 0;
      count = 0;
      mean = 0;
    },
  };
}

export function createADWINDetector(confidenceLevel: number = 0.002) {
  const window: number[] = [];

  return {
    update(value: number): { driftDetected: boolean; windowSize: number } {
      window.push(value);
      if (window.length < 10) {
        return { driftDetected: false, windowSize: window.length };
      }

      // Simplified ADWIN: check if splitting the window reveals significant difference
      const midpoint = Math.floor(window.length / 2);
      const left = window.slice(0, midpoint);
      const right = window.slice(midpoint);

      const leftMean = left.reduce((a, b) => a + b, 0) / left.length;
      const rightMean = right.reduce((a, b) => a + b, 0) / right.length;
      const diff = Math.abs(leftMean - rightMean);

      const epsilon = Math.sqrt(
        (1 / (2 * left.length) + 1 / (2 * right.length)) *
        Math.log(2 / confidenceLevel)
      );

      if (diff > epsilon) {
        // Remove old elements
        window.splice(0, midpoint);
        return { driftDetected: true, windowSize: window.length };
      }

      return { driftDetected: false, windowSize: window.length };
    },

    reset(): void {
      window.length = 0;
    },
  };
}

// ==================== Model Version Manager ====================

interface ModelVersion {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  createdAt: number;
  isActive: boolean;
}

export function createModelVersionManager() {
  const versions = new Map<string, ModelVersion>();
  let counter = 0;

  return {
    createVersion(
      name: string,
      type: string,
      config: Record<string, unknown>
    ): ModelVersion {
      counter++;
      const version: ModelVersion = {
        id: `v_${counter}_${Date.now()}`,
        name,
        type,
        config,
        createdAt: Date.now(),
        isActive: false,
      };
      versions.set(version.id, version);
      return version;
    },

    activateVersion(versionId: string): boolean {
      const version = versions.get(versionId);
      if (!version) return false;

      // Deactivate all others
      for (const v of versions.values()) {
        v.isActive = false;
      }
      version.isActive = true;
      return true;
    },

    getActiveVersion(): ModelVersion | null {
      for (const v of versions.values()) {
        if (v.isActive) return v;
      }
      return null;
    },

    getVersions(): ModelVersion[] {
      return Array.from(versions.values());
    },
  };
}

// ==================== Online Learning Model ====================

interface DataPoint {
  id: string;
  features: number[];
  label: number;
  timestamp: number;
  weight: number;
}

interface LearningModelConfig {
  learningRate: number;
  batchSize: number;
  regularization: number;
  momentum: number;
  decayRate: number;
  minLearningRate: number;
  maxIterations: number;
  convergenceThreshold: number;
  earlyStoppingPatience: number;
  validationSplit: number;
}

export function createOnlineLearningModel(
  numFeatures: number,
  modelType: string,
  config: LearningModelConfig
) {
  let weights = new Array(numFeatures).fill(0);
  let bias = 0;
  let m = new Array(numFeatures).fill(0);
  let v = new Array(numFeatures).fill(0);
  let t = 0;
  let currentLR = config.learningRate;
  let sampleCount = 0;

  function predict_internal(features: number[]): number {
    let result = bias;
    for (let i = 0; i < features.length; i++) {
      result += weights[i] * features[i];
    }
    if (modelType === 'classification') {
      return 1 / (1 + Math.exp(-result));
    }
    return result;
  }

  return {
    partialFit(dataPoint: DataPoint): { loss: number; learningRate: number } {
      t++;
      sampleCount++;
      const prediction = predict_internal(dataPoint.features);
      const error = prediction - dataPoint.label;
      const loss = 0.5 * error * error;

      // Compute gradients
      const gradients = dataPoint.features.map(f => error * f);
      const biasGrad = error;

      // Apply Adam-like update
      const beta1 = 0.9;
      const beta2 = 0.999;
      const eps = 1e-8;

      m = m.map((mi, i) => beta1 * mi + (1 - beta1) * gradients[i]);
      v = v.map((vi, i) => beta2 * vi + (1 - beta2) * gradients[i] * gradients[i]);

      const mHat = m.map(mi => mi / (1 - Math.pow(beta1, t)));
      const vHat = v.map(vi => vi / (1 - Math.pow(beta2, t)));

      weights = weights.map((w, i) => {
        const update = currentLR * mHat[i] / (Math.sqrt(vHat[i]) + eps);
        const reg = config.regularization * w;
        return w - update - reg;
      });
      bias -= currentLR * biasGrad;

      // Decay learning rate
      if (config.decayRate > 0) {
        currentLR = Math.max(config.minLearningRate, currentLR * (1 - config.decayRate));
      }

      return { loss, learningRate: currentLR };
    },

    predict(features: number[]): number {
      return predict_internal(features);
    },

    evaluate(testData: DataPoint[]): { mse: number; mae: number; sampleCount: number } {
      let mse = 0;
      let mae = 0;
      for (const dp of testData) {
        const pred = predict_internal(dp.features);
        const error = pred - dp.label;
        mse += error * error;
        mae += Math.abs(error);
      }
      return {
        mse: mse / testData.length,
        mae: mae / testData.length,
        sampleCount: testData.length,
      };
    },

    getFeatureImportance(): Array<{ featureIndex: number; importance: number }> {
      return weights.map((w, i) => ({
        featureIndex: i,
        importance: Math.abs(w),
      }));
    },

    getWeights(): number[] {
      return [...weights];
    },

    getSampleCount(): number {
      return sampleCount;
    },
  };
}

// ==================== Online Ensemble ====================

export function createOnlineEnsemble(models: ReturnType<typeof createOnlineLearningModel>[]) {
  const modelWeights = new Array(models.length).fill(1 / models.length);

  return {
    partialFit(dataPoint: DataPoint): { losses: number[] } {
      const losses: number[] = [];
      for (const model of models) {
        const result = model.partialFit(dataPoint);
        losses.push(result.loss);
      }
      return { losses };
    },

    predict(features: number[]): number {
      let weightedSum = 0;
      let totalWeight = 0;
      for (let i = 0; i < models.length; i++) {
        const pred = models[i].predict(features);
        weightedSum += pred * modelWeights[i];
        totalWeight += modelWeights[i];
      }
      return weightedSum / totalWeight;
    },

    evaluate(testData: DataPoint[]): { mse: number; sampleCount: number } {
      let mse = 0;
      for (const dp of testData) {
        const pred = this.predict(dp.features);
        const error = pred - dp.label;
        mse += error * error;
      }
      return {
        mse: mse / testData.length,
        sampleCount: testData.length,
      };
    },
  };
}
