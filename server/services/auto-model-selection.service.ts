/**
 * Auto Model Selection Service
 * Statistical analysis, model fitting, evaluation, cross-validation, and auto-selection.
 */

// ==================== Types ====================

export interface DataPoint {
  x: number;
  y: number;
}

export interface ModelConfig {
  type: 'linear' | 'exponential' | 'polynomial';
  params: Record<string, any>;
}

interface BasicStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  count: number;
}

interface DataFeatures {
  count: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  linearityScore: number;
  exponentialityScore: number;
  outlierRatio: number;
  hasSeasonality: boolean;
}

interface ModelPerformance {
  mse: number;
  rmse: number;
  mae: number;
  r2: number;
}

interface CrossValidationResult {
  folds: number;
  scores: number[];
  meanScore: number;
  stdScore: number;
}

interface ModelComparison {
  models: Array<{ type: string; performance: ModelPerformance }>;
  bestModel: string;
  ranking: string[];
}

interface AutoSelectResult {
  selectedModel: ModelConfig;
  confidence: number;
  selectionReason: string;
  comparison: ModelComparison;
}

// ==================== Basic Statistics ====================

export function calculateBasicStats(data: number[]): BasicStats {
  if (data.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, median: 0, count: 0 };
  }

  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const sorted = [...data].sort((a, b) => a - b);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  return {
    mean,
    std,
    min: sorted[0],
    max: sorted[n - 1],
    median,
    count: n,
  };
}

export function calculateSkewness(data: number[]): number {
  if (data.length < 3) return 0;
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n);
  if (std === 0) return 0;
  const m3 = data.reduce((sum, val) => sum + ((val - mean) / std) ** 3, 0) / n;
  return m3;
}

export function calculateKurtosis(data: number[]): number {
  if (data.length < 4) return 0;
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n);
  if (std === 0) return 0;
  const m4 = data.reduce((sum, val) => sum + ((val - mean) / std) ** 4, 0) / n;
  return m4 - 3; // excess kurtosis
}

// ==================== Trend Detection ====================

export function detectTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 2) return 'stable';

  // Simple linear regression slope
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const meanY = sumY / n;
  const relativeSlope = meanY !== 0 ? Math.abs(slope) / Math.abs(meanY) : Math.abs(slope);

  if (relativeSlope < 0.001) return 'stable';
  return slope > 0 ? 'increasing' : 'decreasing';
}

// ==================== Seasonality Detection ====================

export function detectSeasonality(data: number[]): boolean {
  if (data.length < 12) return false;

  // Check autocorrelation at various lags
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;

  // Try common periods
  for (const period of [12, 7, 24, 6]) {
    if (period >= n / 2) continue;
    const acf = calculateAutocorrelation(data, period);
    if (acf > 0.5) return true;
  }

  return false;
}

// ==================== Autocorrelation ====================

export function calculateAutocorrelation(data: number[], lag: number): number {
  if (data.length <= lag) return 0;

  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    denominator += (data[i] - mean) ** 2;
    if (i + lag < n) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ==================== Linearity Score ====================

export function calculateLinearityScore(points: DataPoint[]): number {
  if (points.length < 2) return 0;

  const { slope, intercept } = fitLinearModel(points);

  // Calculate R-squared
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  let ssTot = 0;
  let ssRes = 0;

  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - predicted) ** 2;
  }

  if (ssTot === 0) return 1;
  return Math.max(0, 1 - ssRes / ssTot);
}

// ==================== Exponentiality Score ====================

export function calculateExponentialityScore(points: DataPoint[]): number {
  if (points.length < 2) return 0;

  // Take log of y values and check linearity
  const logPoints: DataPoint[] = [];
  for (const p of points) {
    if (p.y <= 0) return 0;
    logPoints.push({ x: p.x, y: Math.log(p.y) });
  }

  return calculateLinearityScore(logPoints);
}

// ==================== Outlier Ratio ====================

export function calculateOutlierRatio(data: number[]): number {
  if (data.length < 4) return 0;

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = data.filter(v => v < lowerBound || v > upperBound);
  return outliers.length / data.length;
}

// ==================== Feature Extraction ====================

export function extractDataFeatures(points: DataPoint[]): DataFeatures {
  const yValues = points.map(p => p.y);
  const stats = calculateBasicStats(yValues);

  return {
    count: points.length,
    mean: stats.mean,
    std: stats.std,
    min: stats.min,
    max: stats.max,
    trend: detectTrend(yValues),
    linearityScore: calculateLinearityScore(points),
    exponentialityScore: calculateExponentialityScore(points),
    outlierRatio: calculateOutlierRatio(yValues),
    hasSeasonality: detectSeasonality(yValues),
  };
}

// ==================== Model Fitting ====================

export function fitLinearModel(points: DataPoint[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function fitExponentialModel(points: DataPoint[]): { a: number; b: number } {
  // y = a * exp(b * x)  =>  ln(y) = ln(a) + b * x
  const logPoints: DataPoint[] = [];
  for (const p of points) {
    if (p.y <= 0) return { a: 1, b: 0 };
    logPoints.push({ x: p.x, y: Math.log(p.y) });
  }

  const { slope, intercept } = fitLinearModel(logPoints);
  return { a: Math.exp(intercept), b: slope };
}

export function fitPolynomialModel(points: DataPoint[], degree: number): number[] {
  // Simple polynomial fit using normal equations
  // For degree=2: y = c0 + c1*x + c2*x^2
  const n = points.length;
  const d = degree + 1;

  // Build matrix A^T*A and A^T*b
  const ATA: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  const ATb: number[] = new Array(d).fill(0);

  for (const p of points) {
    const powers: number[] = [];
    let xPow = 1;
    for (let j = 0; j < d; j++) {
      powers.push(xPow);
      xPow *= p.x;
    }
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        ATA[i][j] += powers[i] * powers[j];
      }
      ATb[i] += powers[i] * p.y;
    }
  }

  // Solve using Gaussian elimination
  const aug: number[][] = ATA.map((row, i) => [...row, ATb[i]]);

  for (let col = 0; col < d; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < d; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-12) continue;

    // Eliminate below
    for (let row = col + 1; row < d; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= d; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back-substitution
  const coeffs = new Array(d).fill(0);
  for (let row = d - 1; row >= 0; row--) {
    if (Math.abs(aug[row][row]) < 1e-12) continue;
    let sum = aug[row][d];
    for (let j = row + 1; j < d; j++) {
      sum -= aug[row][j] * coeffs[j];
    }
    coeffs[row] = sum / aug[row][row];
  }

  return coeffs;
}

// ==================== Prediction ====================

export function predict(model: ModelConfig, x: number): number {
  switch (model.type) {
    case 'linear': {
      const { slope, intercept } = model.params;
      return slope * x + intercept;
    }
    case 'exponential': {
      const { a, b } = model.params;
      return a * Math.exp(b * x);
    }
    case 'polynomial': {
      const coeffs: number[] = model.params.coefficients || [];
      let result = 0;
      let xPow = 1;
      for (const c of coeffs) {
        result += c * xPow;
        xPow *= x;
      }
      return result;
    }
    default:
      return 0;
  }
}

// ==================== Model Evaluation ====================

export function evaluateModel(model: ModelConfig, points: DataPoint[]): ModelPerformance {
  if (points.length === 0) return { mse: 0, rmse: 0, mae: 0, r2: 0 };

  const predictions = points.map(p => predict(model, p.x));
  const actuals = points.map(p => p.y);
  const n = points.length;

  // MSE
  let sumSquaredError = 0;
  let sumAbsError = 0;
  for (let i = 0; i < n; i++) {
    const error = actuals[i] - predictions[i];
    sumSquaredError += error ** 2;
    sumAbsError += Math.abs(error);
  }

  const mse = sumSquaredError / n;
  const rmse = Math.sqrt(mse);
  const mae = sumAbsError / n;

  // R-squared
  const meanY = actuals.reduce((a, b) => a + b, 0) / n;
  const ssTot = actuals.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - sumSquaredError / ssTot);

  return { mse, rmse, mae, r2 };
}

// ==================== Cross Validation ====================

export function crossValidate(
  points: DataPoint[],
  modelType: string,
  folds: number
): CrossValidationResult {
  const n = points.length;
  const foldSize = Math.floor(n / folds);
  const scores: number[] = [];

  // Shuffle indices deterministically
  const indices = Array.from({ length: n }, (_, i) => i);

  for (let fold = 0; fold < folds; fold++) {
    const testStart = fold * foldSize;
    const testEnd = fold === folds - 1 ? n : testStart + foldSize;

    const trainPoints: DataPoint[] = [];
    const testPoints: DataPoint[] = [];

    for (let i = 0; i < n; i++) {
      if (i >= testStart && i < testEnd) {
        testPoints.push(points[indices[i]]);
      } else {
        trainPoints.push(points[indices[i]]);
      }
    }

    // Fit model on training data
    let model: ModelConfig;
    if (modelType === 'linear') {
      const { slope, intercept } = fitLinearModel(trainPoints);
      model = { type: 'linear', params: { slope, intercept } };
    } else if (modelType === 'exponential') {
      const { a, b } = fitExponentialModel(trainPoints);
      model = { type: 'exponential', params: { a, b } };
    } else {
      const coefficients = fitPolynomialModel(trainPoints, 2);
      model = { type: 'polynomial', params: { coefficients } };
    }

    // Evaluate on test data
    const perf = evaluateModel(model, testPoints);
    scores.push(perf.r2);
  }

  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdScore = Math.sqrt(
    scores.reduce((sum, s) => sum + (s - meanScore) ** 2, 0) / scores.length
  );

  return { folds, scores, meanScore, stdScore };
}

// ==================== Model Comparison ====================

export function compareModels(points: DataPoint[]): ModelComparison {
  // Fit all model types
  const { slope, intercept } = fitLinearModel(points);
  const linearModel: ModelConfig = { type: 'linear', params: { slope, intercept } };
  const linearPerf = evaluateModel(linearModel, points);

  const { a, b } = fitExponentialModel(points);
  const expModel: ModelConfig = { type: 'exponential', params: { a, b } };
  const expPerf = evaluateModel(expModel, points);

  const coefficients = fitPolynomialModel(points, 2);
  const polyModel: ModelConfig = { type: 'polynomial', params: { coefficients } };
  const polyPerf = evaluateModel(polyModel, points);

  const models = [
    { type: 'linear', performance: linearPerf },
    { type: 'exponential', performance: expPerf },
    { type: 'polynomial', performance: polyPerf },
  ];

  // Rank by R-squared (higher is better)
  const ranked = [...models].sort((a, b) => b.performance.r2 - a.performance.r2);
  const ranking = ranked.map(m => m.type);
  const bestModel = ranking[0];

  return { models, bestModel, ranking };
}

// ==================== Auto Model Selection ====================

export function autoSelectModel(points: DataPoint[]): AutoSelectResult {
  const comparison = compareModels(points);
  const features = extractDataFeatures(points);

  let selectedType = comparison.bestModel;
  let reason = '';

  // Determine reason based on features
  if (selectedType === 'linear') {
    reason = `数据呈线性趋势 (线性度分数: ${features.linearityScore.toFixed(3)})`;
  } else if (selectedType === 'exponential') {
    reason = `数据呈指数增长趋势 (指数度分数: ${features.exponentialityScore.toFixed(3)})`;
  } else {
    reason = `数据呈多项式趋势，线性和指数模型拟合不佳`;
  }

  // Build the selected model config
  let selectedModel: ModelConfig;
  if (selectedType === 'linear') {
    const { slope, intercept } = fitLinearModel(points);
    selectedModel = { type: 'linear', params: { slope, intercept } };
  } else if (selectedType === 'exponential') {
    const { a, b } = fitExponentialModel(points);
    selectedModel = { type: 'exponential', params: { a, b } };
  } else {
    const coefficients = fitPolynomialModel(points, 2);
    selectedModel = { type: 'polynomial', params: { coefficients } };
  }

  // Calculate confidence from the best model's R-squared
  const bestPerf = comparison.models.find(m => m.type === selectedType);
  const confidence = bestPerf ? bestPerf.performance.r2 : 0.5;

  return {
    selectedModel,
    confidence,
    selectionReason: reason,
    comparison,
  };
}

// ==================== Model Selector ====================

export function createModelSelector() {
  let lastModel: ModelConfig | null = null;

  return {
    analyze(points: DataPoint[]): DataFeatures {
      return extractDataFeatures(points);
    },

    select(points: DataPoint[]): AutoSelectResult {
      const result = autoSelectModel(points);
      lastModel = result.selectedModel;
      return result;
    },

    compare(points: DataPoint[]): ModelComparison {
      return compareModels(points);
    },

    crossValidate(points: DataPoint[], modelType: string, folds: number): CrossValidationResult {
      return crossValidate(points, modelType, folds);
    },

    predict(x: number): number {
      if (!lastModel) return 0;
      return predict(lastModel, x);
    },

    evaluate(model: ModelConfig, points: DataPoint[]): ModelPerformance {
      return evaluateModel(model, points);
    },
  };
}
